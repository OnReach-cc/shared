// El transporte conmutable del correo de los productos (EMAIL_PROVIDER): `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmailer, emailConfigured, emailProvider, type EmailEnv } from "./email.ts";

const CF_ENV: EmailEnv = {
	CF_ACCOUNT_ID: "acc",
	EMAIL_API_TOKEN: "tok",
	EMAIL_FROM: "notifications@echo.onreach.cc",
	EMAIL_FROM_NAME: "Echo",
};

const TELNYX_ENV: EmailEnv = {
	EMAIL_PROVIDER: "telnyx",
	TELNYX_API_KEY: "KEY_X",
	EMAIL_FROM: "notifications@echo.onreach.cc",
	EMAIL_FROM_NAME: "Echo",
};

function capture(responseBody: unknown): { calls: { url: string; init: RequestInit }[]; fetchImpl: typeof fetch } {
	const calls: { url: string; init: RequestInit }[] = [];
	const fetchImpl = (async (url: unknown, init?: RequestInit) => {
		calls.push({ url: String(url), init: init ?? {} });
		return new Response(JSON.stringify(responseBody), { status: 200 });
	}) as typeof fetch;
	return { calls, fetchImpl };
}

test("emailProvider: telnyx sólo si se pide y hay API key; cloudflare es el valor por defecto", () => {
	assert.equal(emailProvider(TELNYX_ENV), "telnyx");
	assert.equal(emailProvider(CF_ENV), "cloudflare");
	assert.equal(emailProvider({ ...CF_ENV, EMAIL_PROVIDER: "telnyx" }), "cloudflare");
});

test("emailConfigured: cada proveedor exige lo suyo, y EMAIL_FROM siempre", () => {
	assert.equal(emailConfigured(CF_ENV), true);
	assert.equal(emailConfigured(TELNYX_ENV), true);
	assert.equal(emailConfigured({ ...TELNYX_ENV, EMAIL_FROM: undefined }), false);
	assert.equal(emailConfigured({ EMAIL_FROM: "x@y.z" }), false);
});

test("sendEmail por telnyx: POST /v2/email_messages con Bearer y html_body/text_body", async () => {
	const { calls, fetchImpl } = capture({ data: { id: "msg-1" } });
	const { sendEmail } = createEmailer({ brandName: "OnReach Echo", productName: "Echo" });
	await sendEmail(TELNYX_ENV, { to: "ana@example.com", subject: "Hola", html: "<p>Hola</p>" }, fetchImpl);

	assert.equal(calls[0].url, "https://api.telnyx.com/v2/email_messages");
	assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer KEY_X");
	const body = JSON.parse(String(calls[0].init.body));
	assert.equal(body.from, "Echo <notifications@echo.onreach.cc>");
	assert.deepEqual(body.to, ["ana@example.com"]);
	assert.equal(body.html_body, "<p>Hola</p>");
	assert.equal(body.text_body, "Hola");
});

test("sendEmail por cloudflare: el REST de Email Sending, como siempre", async () => {
	const { calls, fetchImpl } = capture({ success: true, result: {} });
	const { sendEmail } = createEmailer({ brandName: "OnReach Echo", productName: "Echo" });
	await sendEmail(CF_ENV, { to: "ana@example.com", subject: "Hola", html: "<p>Hola</p>" }, fetchImpl);

	assert.equal(calls[0].url, "https://api.cloudflare.com/client/v4/accounts/acc/email/sending/send");
	const body = JSON.parse(String(calls[0].init.body));
	assert.deepEqual(body.from, { address: "notifications@echo.onreach.cc", name: "Echo" });
});
