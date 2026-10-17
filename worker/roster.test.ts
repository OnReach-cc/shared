// La API interna de Roster: la firma y el cliente (`npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
	createRosterClient,
	normalizeIdentity,
	parseIngestSecrets,
	signRosterRequest,
	verifyRosterRequest,
	RosterError,
	isExternalRosterCaller,
	TOPIC_KEY,
} from "./roster.ts";

const SECRET = "a".repeat(64);
const SECRETS = { echo: SECRET };

async function signed(method: string, url: string, body: string, timestamp: number, caller = "echo", secret = SECRET): Promise<Request> {
	const u = new URL(url);
	const signature = await signRosterRequest(secret, { timestamp, method, pathWithQuery: `${u.pathname}${u.search}`, body });
	return new Request(url, {
		method,
		headers: { "X-Roster-Caller": caller, "X-Roster-Timestamp": String(timestamp), "X-Roster-Signature": signature },
		body: method === "GET" ? undefined : body,
	});
}

test("verifyRosterRequest: acepta una firma buena y dice quién llama", async () => {
	const now = 1_800_000_000;
	const req = await signed("POST", "https://roster.onreach.cc/api/platform/contacts/resolve", '{"a":1}', now);
	assert.equal(await verifyRosterRequest(req, '{"a":1}', SECRETS, now), "echo");
});

test("verifyRosterRequest: rechaza otro cuerpo, otra ruta, otro workspace o una firma vieja", async () => {
	const now = 1_800_000_000;
	const req = await signed("POST", "https://roster.onreach.cc/api/platform/contacts/resolve", '{"a":1}', now);
	assert.equal(await verifyRosterRequest(req, '{"a":2}', SECRETS, now), null);

	const get = await signed("GET", "https://roster.onreach.cc/api/platform/contacts/segments?workspace_id=w1", "", now);
	const moved = new Request("https://roster.onreach.cc/api/platform/contacts/segments?workspace_id=w2", { headers: get.headers });
	assert.equal(await verifyRosterRequest(moved, "", SECRETS, now), null);
	assert.equal(await verifyRosterRequest(get, "", SECRETS, now), "echo");

	assert.equal(await verifyRosterRequest(get, "", SECRETS, now + 301), null);
});

test("verifyRosterRequest: un hermano sin secreto o con el secreto de otro no pasa", async () => {
	const now = 1_800_000_000;
	const letter = await signed("GET", "https://roster.onreach.cc/x", "", now, "letter");
	assert.equal(await verifyRosterRequest(letter, "", SECRETS, now), null);
	const forged = await signed("GET", "https://roster.onreach.cc/x", "", now, "echo", "b".repeat(64));
	assert.equal(await verifyRosterRequest(forged, "", SECRETS, now), null);
	const roster = await signed("GET", "https://roster.onreach.cc/x", "", now, "roster");
	assert.equal(await verifyRosterRequest(roster, "", { ...SECRETS, roster: SECRET } as never, now), null);
});

test("parseIngestSecrets: lee la lista e ignora lo que no tiene forma", () => {
	const parsed = parseIngestSecrets(` echo:${SECRET} , letter:short, nope:${SECRET}, canvas:${"c".repeat(40)}`);
	assert.deepEqual(parsed, { echo: SECRET, canvas: "c".repeat(40) });
	assert.deepEqual(parseIngestSecrets(undefined), {});
});

test("normalizeIdentity: email en minúsculas, E.164 sin adornos, nada adivinado", () => {
	assert.equal(normalizeIdentity("email", "  Ana@Example.COM "), "ana@example.com");
	assert.equal(normalizeIdentity("email", "ana@example"), null);
	assert.equal(normalizeIdentity("phone", "+1 (575) 262-0250"), "+15752620250");
	assert.equal(normalizeIdentity("phone", "5752620250"), null);
	assert.equal(normalizeIdentity("whatsapp", "+34 600 11 22 33"), "+34600112233");
	assert.equal(normalizeIdentity("instagram", " 17841400000000 "), "17841400000000");
	assert.equal(normalizeIdentity("messenger", "dos palabras"), null);
});

test("createRosterClient: firma lo que manda y Roster lo verifica", async () => {
	let seen: Request | null = null;
	let seenBody = "";
	const fetchImpl = (async (url: unknown, init?: RequestInit) => {
		seen = new Request(String(url), init);
		seenBody = typeof init?.body === "string" ? init.body : "";
		return new Response(JSON.stringify({ data: [], next_cursor: null }), { status: 200 });
	}) as typeof fetch;

	const client = createRosterClient({ origin: "https://roster.onreach.cc/", caller: "echo", secret: SECRET, fetch: fetchImpl });
	await client.sendableMembers({ workspace_id: "w1", segment_id: "all", channel: "email", limit: 50 });
	assert.ok(seen);
	assert.equal(new URL((seen as Request).url).search, "?workspace_id=w1&channel=email&limit=50");
	assert.equal(await verifyRosterRequest(seen as Request, seenBody, SECRETS), "echo");
});

test("createRosterClient: un error trae su estado y su código", async () => {
	const fetchImpl = (async () =>
		new Response(JSON.stringify({ error: "No such contact", code: "not_found" }), { status: 404 })) as unknown as typeof fetch;
	const client = createRosterClient({ origin: "https://roster.onreach.cc", caller: "letter", secret: SECRET, fetch: fetchImpl });
	await assert.rejects(client.getContact("w1", "c1"), (err: unknown) => err instanceof RosterError && err.status === 404 && err.code === "not_found");
});

test("eachSendableMember: recorre las páginas hasta que no hay cursor", async () => {
	const pages = [
		{ data: [{ contact_id: "a" }, { contact_id: "b" }], next_cursor: "b" },
		{ data: [{ contact_id: "c" }], next_cursor: null },
	];
	const cursors: (string | null)[] = [];
	const fetchImpl = (async (url: unknown) => {
		cursors.push(new URL(String(url)).searchParams.get("cursor"));
		return new Response(JSON.stringify(pages[cursors.length - 1]), { status: 200 });
	}) as typeof fetch;
	const client = createRosterClient({ origin: "https://roster.onreach.cc", caller: "letter", secret: SECRET, fetch: fetchImpl });
	const ids: string[] = [];
	for await (const m of client.eachSendableMember({ workspace_id: "w1", segment_id: "s1", channel: "sms" })) ids.push(m.contact_id);
	assert.deepEqual(ids, ["a", "b", "c"]);
	assert.deepEqual(cursors, [null, "b"]);
});

test("audienceMembers: firma la ruta de audiencias con su cursor y Roster la verifica", async () => {
	const seen: Request[] = [];
	const fetchImpl = (async (url: unknown, init?: RequestInit) => {
		seen.push(new Request(String(url), init));
		return new Response(JSON.stringify({ data: [{ contact_id: "a", email: "ana@example.com", phone: null }], next_cursor: null }), { status: 200 });
	}) as typeof fetch;
	const client = createRosterClient({ origin: "https://roster.onreach.cc/", caller: "echo", secret: SECRET, fetch: fetchImpl });
	const page = await client.audienceMembers({ workspace_id: "w1", segment_id: "all", cursor: "YQ", limit: 500 });
	assert.deepEqual(page.data[0], { contact_id: "a", email: "ana@example.com", phone: null });
	const url = new URL(seen[0].url);
	assert.equal(url.pathname, "/api/platform/contacts/segments/all/audience");
	assert.equal(url.search, "?workspace_id=w1&cursor=YQ&limit=500");
	assert.equal(await verifyRosterRequest(seen[0], "", SECRETS), "echo");
});

// ─── v1.4.0: llamantes externos, temas y sync ───────────────────────────────

test("parseIngestSecrets: acepta los llamantes externos ondesk y onforge", () => {
	const parsed = parseIngestSecrets(`ondesk:${"a".repeat(32)},onforge:${"b".repeat(32)}`);
	assert.deepEqual(parsed, { ondesk: "a".repeat(32), onforge: "b".repeat(32) });
});

test("isExternalRosterCaller: sólo ondesk y onforge son externos", () => {
	assert.equal(isExternalRosterCaller("ondesk"), true);
	assert.equal(isExternalRosterCaller("onforge"), true);
	assert.equal(isExternalRosterCaller("letter"), false);
});

test("sendableMembers y getConsent mandan el tema en la query sólo si lo hay", async () => {
	const urls: URL[] = [];
	const fetchImpl = (async (url: unknown) => {
		urls.push(new URL(String(url)));
		return new Response(JSON.stringify({ data: [], next_cursor: null, status: "none" }), { status: 200 });
	}) as typeof fetch;
	const client = createRosterClient({ origin: "https://roster.onreach.cc", caller: "letter", secret: SECRET, fetch: fetchImpl });
	await client.sendableMembers({ workspace_id: "w1", segment_id: "all", channel: "email", topic: "releases" });
	await client.sendableMembers({ workspace_id: "w1", segment_id: "all", channel: "email" });
	await client.getConsent({ workspace_id: "w1", channel: "email", address: "a@b.co", topic: "offers" });
	assert.equal(urls[0].searchParams.get("topic"), "releases");
	assert.equal(urls[1].searchParams.has("topic"), false);
	assert.equal(urls[2].searchParams.get("topic"), "offers");
});

test("listTopics: GET firmado a la ruta de temas", async () => {
	const seen: Request[] = [];
	const fetchImpl = (async (url: unknown, init?: RequestInit) => {
		seen.push(new Request(String(url), init));
		return new Response(JSON.stringify({ data: [{ key: "releases", name: "Releases", description: null, archived: false }] }), { status: 200 });
	}) as typeof fetch;
	const client = createRosterClient({ origin: "https://roster.onreach.cc", caller: "letter", secret: SECRET, fetch: fetchImpl });
	const topics = await client.listTopics("w1");
	assert.equal(topics[0].key, "releases");
	assert.equal(new URL(seen[0].url).pathname, "/api/platform/contacts/topics");
});

test("sync: POST firmado por ondesk a /api/platform/contacts/sync", async () => {
	let seen: Request | null = null;
	let seenBody = "";
	const fetchImpl = (async (url: unknown, init?: RequestInit) => {
		seen = new Request(String(url), init);
		seenBody = typeof init?.body === "string" ? init.body : "";
		return new Response(JSON.stringify({ contact_id: "c1", created: true, restored: false, erased: false }), { status: 200 });
	}) as typeof fetch;
	const client = createRosterClient({ origin: "https://roster.onreach.cc", caller: "ondesk", secret: SECRET, fetch: fetchImpl });
	const result = await client.sync({ workspace_id: "w1", email: "ana@example.com", fields: [{ key: "pulse", label: "Pulse", kind: "select", options: ["none", "active"], value: "active" }] });
	assert.equal(result.contact_id, "c1");
	assert.equal((seen as unknown as Request).method, "POST");
	assert.equal(new URL((seen as unknown as Request).url).pathname, "/api/platform/contacts/sync");
	assert.equal(await verifyRosterRequest(seen as unknown as Request, seenBody, { ondesk: SECRET }), "ondesk");
});

test("TOPIC_KEY: minúsculas, dígitos, guion y guion bajo; hasta 32", () => {
	assert.ok(TOPIC_KEY.test("releases"));
	assert.ok(TOPIC_KEY.test("product_news-2"));
	assert.ok(!TOPIC_KEY.test("Bad Key"));
	assert.ok(!TOPIC_KEY.test("_lead"));
	assert.ok(!TOPIC_KEY.test("a".repeat(33)));
});
