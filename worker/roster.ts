/**
 * La API interna de Roster: el contrato servidor a servidor con el que Echo,
 * Letter, Canvas y Surge leen y escriben contactos sin copiarlos (2026-10-14).
 *
 * Roster es la capa de datos compartida de la Marketing Suite: un contacto, sus
 * identidades por canal y su consentimiento viven en UN sitio, y los hermanos
 * preguntan en vez de guardar su propia copia. Este archivo es las dos mitades
 * del mismo contrato, para que no puedan desacompasarse:
 *
 * - **El lado del hermano**: `createRosterClient` firma cada petición y devuelve
 *   los cuerpos ya tipados.
 * - **El lado de Roster**: `verifyRosterRequest` comprueba la firma y dice quién
 *   llama; `parseIngestSecrets` lee la lista de secretos.
 *
 * El contrato en prosa (rutas, cuerpos, errores, paginación, idempotencia) está
 * en `roster/docs/integraciones.md`. Lo que se decide aquí es la firma y las
 * formas de los cuerpos.
 *
 * ── La firma ─────────────────────────────────────────────────────────────────
 *
 *   X-Roster-Caller:    echo | letter | canvas | surge
 *   X-Roster-Timestamp: segundos unix
 *   X-Roster-Signature: hex(HMAC-SHA256(secreto_del_hermano,
 *                         `${timestamp}\n${MÉTODO}\n${ruta?query}\n${cuerpo}`))
 *
 * Un secreto POR HERMANO, no uno común: si se filtra el de Canvas, rotarlo no
 * toca a Echo, y una petición firmada dice qué producto la hizo (es lo que se
 * guarda como origen de un evento o de un consentimiento). La ruta y la query
 * van dentro de la firma, así que una firma capturada no sirve para otra ruta ni
 * para otro workspace; la marca de tiempo acota la repetición a cinco minutos, y
 * dentro de esa ventana toda escritura es idempotente (ver cada ruta).
 *
 * El secreto nunca viaja: a diferencia de un bearer, lo que se manda es una
 * firma que no sirve para nada más.
 *
 * Sin dependencias de navegador: sólo Web Crypto y `fetch`, que tienen igual
 * Pages Functions, Workers y Node 22 (las pruebas).
 */

// ─── Quién puede llamar ──────────────────────────────────────────────────────

/** Los productos que pueden llamar a Roster. Roster no se llama a sí mismo. */
export const ROSTER_CALLERS = ["echo", "letter", "canvas", "surge"] as const;
export type RosterCaller = (typeof ROSTER_CALLERS)[number];

export function isRosterCaller(value: unknown): value is RosterCaller {
	return typeof value === "string" && (ROSTER_CALLERS as readonly string[]).includes(value);
}

/** Cuánto puede tener de edad una petición firmada. El mismo margen que los webhooks del control plane. */
export const ROSTER_MAX_SKEW_SECONDS = 5 * 60;

// ─── El vocabulario ──────────────────────────────────────────────────────────

/**
 * Los canales de una identidad. `phone` es un número E.164 (lo que usa el SMS);
 * `whatsapp` también es E.164 pero es otra identidad, porque alguien puede
 * escribir por WhatsApp desde un número al que no ha dado permiso de SMS.
 * `instagram` y `messenger` son los ids opacos que da Meta por página.
 */
export const IDENTITY_CHANNELS = ["email", "phone", "whatsapp", "instagram", "messenger"] as const;
export type IdentityChannel = (typeof IDENTITY_CHANNELS)[number];

/** Los canales con consentimiento propio: lo que Letter y Echo pueden mandar como marketing. */
export const CONSENT_CHANNELS = ["email", "sms"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

/** La identidad que lleva cada canal de consentimiento: el SMS va al teléfono. */
export const CONSENT_IDENTITY: Record<ConsentChannel, IdentityChannel> = { email: "email", sms: "phone" };

export type ConsentStatus = "opt_in" | "opt_out";

/** «none» = nunca hubo registro. No es enviable: el marketing es opt-in. */
export type CurrentConsentStatus = ConsentStatus | "none";

export const LIFECYCLE_STAGES = ["subscriber", "lead", "qualified", "opportunity", "customer", "evangelist", "other"] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export function isIdentityChannel(value: unknown): value is IdentityChannel {
	return typeof value === "string" && (IDENTITY_CHANNELS as readonly string[]).includes(value);
}

export function isConsentChannel(value: unknown): value is ConsentChannel {
	return typeof value === "string" && (CONSENT_CHANNELS as readonly string[]).includes(value);
}

/**
 * La forma canónica de una identidad, o null si no es válida.
 *
 * Es la MISMA función a los dos lados: un hermano normaliza antes de preguntar
 * y Roster vuelve a normalizar al recibir, así que «Ana@Example.com » y
 * «ana@example.com» son siempre la misma persona.
 *
 * - email: recortado y en minúsculas; una arroba con algo a cada lado y un punto
 *   en el dominio. No se valida más: el único validador de verdad es el buzón.
 * - phone / whatsapp: E.164 — `+` y de 8 a 15 dígitos. Se quitan espacios,
 *   guiones, puntos y paréntesis; un número sin `+` se rechaza, porque adivinar
 *   el país es la forma de mandarle un SMS a otra persona.
 * - instagram / messenger: el id opaco recortado, de 1 a 128 caracteres.
 */
export function normalizeIdentity(channel: IdentityChannel, raw: string): string | null {
	const value = raw.trim();
	if (!value) return null;
	switch (channel) {
		case "email": {
			const email = value.toLowerCase();
			if (email.length > 254) return null;
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
		}
		case "phone":
		case "whatsapp": {
			const compact = value.replace(/[\s().-]/g, "");
			return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
		}
		case "instagram":
		case "messenger":
			return value.length <= 128 && !/\s/.test(value) ? value : null;
	}
}

// ─── Las formas de las respuestas ────────────────────────────────────────────

export interface RosterIdentity {
	id: string;
	channel: IdentityChannel;
	external_id: string;
	is_primary: boolean;
	verified: boolean;
}

export interface RosterConsentState {
	channel: ConsentChannel;
	status: CurrentConsentStatus;
	/** Cuándo empezó el estado vigente (segundos unix), o null si nunca hubo registro. */
	since: number | null;
	/** De dónde salió el estado vigente: `form`, `import`, `unsubscribe`, `stop_keyword`, `bounce`… */
	source: string | null;
	/** True sólo con opt_in vigente Y una identidad primaria del canal: lo único que se puede mandar. */
	sendable: boolean;
	/** La dirección a la que se mandaría (email o teléfono), o null. */
	address: string | null;
}

export interface RosterContact {
	id: string;
	workspace_id: string;
	first_name: string | null;
	last_name: string | null;
	/** El nombre para pintar: nombre y apellido, o la primera identidad si no hay nombre. */
	display_name: string;
	company: { id: string; name: string } | null;
	lifecycle_stage: LifecycleStage;
	owner_id: string | null;
	/** Los valores de los campos propios del workspace, por clave. */
	attributes: Record<string, unknown>;
	identities: RosterIdentity[];
	consents: Record<ConsentChannel, RosterConsentState>;
	created_at: number;
	updated_at: number;
}

export interface RosterResolveInput {
	workspace_id: string;
	channel: IdentityChannel;
	external_id: string;
	/** Si no existe, ¿se crea? Por defecto sí: quien te escribe es un contacto. */
	create?: boolean;
	/** Nombre visible que trae el canal (el «From» de un correo, el perfil de WhatsApp). Sólo se usa al crear. */
	display_name?: string;
	first_name?: string;
	last_name?: string;
}

export interface RosterResolveResult {
	contact: RosterContact;
	/** La identidad que se resolvió. */
	identity: RosterIdentity;
	created: boolean;
	/** El contacto estaba en la papelera y se ha recuperado al escribir. */
	restored: boolean;
}

export interface RosterConsentInput {
	workspace_id: string;
	channel: ConsentChannel;
	status: ConsentStatus;
	/** Uno de los dos: el contacto, o la dirección del canal (email o teléfono E.164). */
	contact_id?: string;
	address?: string;
	/** Qué lo motivó: `unsubscribe`, `stop_keyword`, `bounce`, `complaint`, `form`, `double_opt_in`… */
	source: string;
	/** Texto libre para el registro: el id del mensaje, la URL del formulario, el código de rebote. */
	evidence?: string;
	/** Cuándo pasó de verdad (segundos unix). Por defecto, ahora. */
	occurred_at?: number;
	/** Obligatoria: un reintento con la misma clave no crea un segundo registro. */
	idempotency_key: string;
}

export interface RosterConsentResult {
	contact_id: string;
	/** True cuando la clave ya se había usado y no se escribió nada. */
	duplicate: boolean;
	/** El estado vigente después de registrar (puede no cambiar si el registro es más antiguo que el vigente). */
	current: RosterConsentState;
}

export interface RosterEventInput {
	workspace_id: string;
	/** Uno de los dos: el contacto, o la identidad (canal + id externo; se crea el contacto si no existe). */
	contact_id?: string;
	channel?: IdentityChannel;
	external_id?: string;
	/** `namespace.verbo` en minúsculas: `message.received`, `email.opened`, `post.clicked`, `ad.converted`. */
	type: string;
	/** Una línea legible para la ficha: «Opened "October newsletter"». */
	summary: string;
	/** El id en el producto que llama. (llamador, source_ref) es la clave de idempotencia. */
	source_ref: string;
	occurred_at?: number;
	/** Datos sueltos para quien los quiera; Roster los guarda y no los interpreta. Máx. 4 KB. */
	properties?: Record<string, unknown>;
}

export interface RosterEventResult {
	event_id: string;
	contact_id: string;
	duplicate: boolean;
}

export interface RosterSegment {
	id: string;
	name: string;
	description: string | null;
	kind: "static" | "dynamic";
	/** Contactos vivos en el segmento ahora mismo (sin mirar el consentimiento). */
	member_count: number;
	updated_at: number;
}

export interface RosterSendableMember {
	contact_id: string;
	display_name: string;
	first_name: string | null;
	last_name: string | null;
	/** El email o el teléfono E.164 al que mandar. */
	address: string;
	/** Desde cuándo hay opt-in vigente. */
	consent_since: number;
}

/**
 * Un miembro que se puede usar en una audiencia de anuncios (Surge, v1.3.0).
 *
 * Subir una lista a una plataforma de anuncios es otro uso de los datos que
 * mandarle un correo, así que la regla es propia y más estricta que «enviable»
 * (contrato en `roster/docs/integraciones.md`, § 1.6 «audience»):
 *
 * - contacto vivo;
 * - **ninguna baja vigente en ningún canal**: quien dijo «no» a algo no entra
 *   en una audiencia por otra puerta;
 * - cada dirección viaja sólo si su canal tiene `opt_in` vigente y es la
 *   identidad principal (el email con opt-in de email; el teléfono con opt-in
 *   de SMS). La otra va a null;
 * - un contacto sin ninguna dirección que cumpla no aparece.
 *
 * Las direcciones van normalizadas (`normalizeIdentity`), en claro: cada
 * plataforma pide su propio hash y su propia forma (Meta, el teléfono sin `+`),
 * así que lo hace quien sube, justo antes de subir.
 */
export interface RosterAudienceMember {
	contact_id: string;
	/** El email principal, sólo con `opt_in` vigente de email. */
	email: string | null;
	/** El teléfono principal en E.164, sólo con `opt_in` vigente de SMS. */
	phone: string | null;
}

export interface RosterPage<T> {
	data: T[];
	/** Pasa esto como `cursor` para la página siguiente; null cuando no hay más. */
	next_cursor: string | null;
}

/** El cuerpo de cualquier error de la API interna. */
export interface RosterErrorBody {
	error: string;
	code: "unauthorized" | "invalid_request" | "invalid_identity" | "not_found" | "conflict" | "method_not_allowed" | "server_error";
}

// ─── La firma ────────────────────────────────────────────────────────────────

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Lo que se firma. La ruta incluye la query tal cual viaja (`/api/…?workspace_id=…`). */
export function rosterSigningString(timestamp: number, method: string, pathWithQuery: string, body: string): string {
	return `${timestamp}\n${method.toUpperCase()}\n${pathWithQuery}\n${body}`;
}

export async function signRosterRequest(
	secret: string,
	input: { timestamp: number; method: string; pathWithQuery: string; body: string },
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(rosterSigningString(input.timestamp, input.method, input.pathWithQuery, input.body)),
	);
	return toHex(mac);
}

/** Comparación en tiempo constante de dos cadenas hex. */
function sameHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/**
 * La lista de secretos del lado de Roster: `ROSTER_INGEST_SECRET` con la forma
 * `echo:<hex>,letter:<hex>,…`. Un hermano que no está en la lista no puede
 * llamar; añadir uno es añadir una entrada y redesplegar Roster.
 *
 * Se ignora lo que no tenga forma (un nombre que no es un hermano, un secreto de
 * menos de 32 caracteres): un secreto corto es uno que se adivina.
 */
export function parseIngestSecrets(raw: string | undefined | null): Partial<Record<RosterCaller, string>> {
	const secrets: Partial<Record<RosterCaller, string>> = {};
	if (!raw) return secrets;
	for (const entry of raw.split(",")) {
		const separator = entry.indexOf(":");
		if (separator <= 0) continue;
		const caller = entry.slice(0, separator).trim();
		const secret = entry.slice(separator + 1).trim();
		if (isRosterCaller(caller) && secret.length >= 32) secrets[caller] = secret;
	}
	return secrets;
}

/**
 * Verifica una petición firmada por un hermano y devuelve quién la firmó, o null.
 *
 * `body` es el cuerpo en bruto ya leído (`await request.text()`): quien llama lo
 * necesita después para parsearlo, y un `Request` sólo se lee una vez. Nunca
 * dice qué comprobación falló — un verificador que lo distingue es un oráculo.
 */
export async function verifyRosterRequest(
	request: Request,
	body: string,
	secrets: Partial<Record<RosterCaller, string>>,
	now: number = Math.floor(Date.now() / 1000),
): Promise<RosterCaller | null> {
	const caller = request.headers.get("X-Roster-Caller");
	const rawTimestamp = request.headers.get("X-Roster-Timestamp");
	const signature = request.headers.get("X-Roster-Signature");
	if (!isRosterCaller(caller) || !rawTimestamp || !signature) return null;

	const secret = secrets[caller];
	if (!secret) return null;

	const timestamp = Number(rawTimestamp);
	if (!Number.isInteger(timestamp) || Math.abs(now - timestamp) > ROSTER_MAX_SKEW_SECONDS) return null;

	const url = new URL(request.url);
	const expected = await signRosterRequest(secret, {
		timestamp,
		method: request.method,
		pathWithQuery: `${url.pathname}${url.search}`,
		body,
	});
	return sameHex(expected, signature.toLowerCase()) ? caller : null;
}

// ─── El cliente ──────────────────────────────────────────────────────────────

/** Un error de la API interna, con su código y su estado HTTP. */
export class RosterError extends Error {
	readonly status: number;
	readonly code: RosterErrorBody["code"];
	constructor(status: number, body: Partial<RosterErrorBody>) {
		super(body.error ?? `Roster responded ${status}`);
		this.name = "RosterError";
		this.status = status;
		this.code = body.code ?? "server_error";
	}
}

export interface RosterClientOptions {
	/** El origen de Roster: https://roster.onreach.cc (o http://localhost:8892 en local). */
	origin: string;
	caller: RosterCaller;
	/** El `ROSTER_INGEST_SECRET` de ESTE producto (su entrada en la lista de Roster). */
	secret: string;
	/** Para las pruebas. Por defecto, el `fetch` global. */
	fetch?: typeof fetch;
}

export interface RosterClient {
	/** Identidad → contacto, creándolo si no existe (salvo `create: false`, que da 404). */
	resolve(input: RosterResolveInput): Promise<RosterResolveResult>;
	/** Un contacto con sus identidades y su consentimiento vigente. 404 si no existe o está en la papelera. */
	getContact(workspaceId: string, contactId: string): Promise<RosterContact>;
	/** El consentimiento vigente de un canal, por contacto o por dirección. */
	getConsent(input: { workspace_id: string; channel: ConsentChannel; contact_id?: string; address?: string }): Promise<RosterConsentState & { contact_id: string | null }>;
	/** Registra un cambio de consentimiento (baja, STOP, rebote, alta por formulario…). Idempotente por clave. */
	recordConsent(input: RosterConsentInput): Promise<RosterConsentResult>;
	/** Registra actividad en la ficha del contacto. Idempotente por (llamador, source_ref). */
	recordEvent(input: RosterEventInput): Promise<RosterEventResult>;
	/** Los segmentos del workspace, con su recuento. */
	listSegments(workspaceId: string): Promise<RosterSegment[]>;
	/** Una página de miembros ENVIABLES de un segmento (o de todo el workspace con `segmentId = "all"`). */
	sendableMembers(input: {
		workspace_id: string;
		segment_id: string;
		channel: ConsentChannel;
		cursor?: string | null;
		limit?: number;
	}): Promise<RosterPage<RosterSendableMember>>;
	/** Recorre todas las páginas de `sendableMembers`. */
	eachSendableMember(input: { workspace_id: string; segment_id: string; channel: ConsentChannel; pageSize?: number }): AsyncGenerator<RosterSendableMember>;
	/** Una página de miembros utilizables en una AUDIENCIA de anuncios (regla en `RosterAudienceMember`). */
	audienceMembers(input: { workspace_id: string; segment_id: string; cursor?: string | null; limit?: number }): Promise<RosterPage<RosterAudienceMember>>;
}

export function createRosterClient(options: RosterClientOptions): RosterClient {
	const origin = options.origin.replace(/\/$/, "");
	const doFetch = options.fetch ?? fetch;

	async function call<T>(method: "GET" | "POST", path: string, query: Record<string, string | number | undefined | null>, body?: unknown): Promise<T> {
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
		}
		const qs = search.toString();
		const pathWithQuery = qs ? `${path}?${qs}` : path;
		const text = body === undefined ? "" : JSON.stringify(body);
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = await signRosterRequest(options.secret, { timestamp, method, pathWithQuery, body: text });

		const res = await doFetch(`${origin}${pathWithQuery}`, {
			method,
			headers: {
				"X-Roster-Caller": options.caller,
				"X-Roster-Timestamp": String(timestamp),
				"X-Roster-Signature": signature,
				...(body === undefined ? {} : { "Content-Type": "application/json" }),
			},
			body: body === undefined ? undefined : text,
		});
		const parsed = (await res.json().catch(() => ({}))) as unknown;
		if (!res.ok) throw new RosterError(res.status, parsed as Partial<RosterErrorBody>);
		return parsed as T;
	}

	const client: RosterClient = {
		resolve: (input) => call("POST", "/api/platform/contacts/resolve", {}, input),
		getContact: async (workspaceId, contactId) =>
			(
				await call<{ contact: RosterContact }>("GET", `/api/platform/contacts/${encodeURIComponent(contactId)}`, {
					workspace_id: workspaceId,
				})
			).contact,
		getConsent: (input) =>
			call("GET", "/api/platform/contacts/consent", {
				workspace_id: input.workspace_id,
				channel: input.channel,
				contact_id: input.contact_id,
				address: input.address,
			}),
		recordConsent: (input) => call("POST", "/api/platform/contacts/consent", {}, input),
		recordEvent: (input) => call("POST", "/api/platform/contacts/events", {}, input),
		listSegments: async (workspaceId) =>
			(await call<{ data: RosterSegment[] }>("GET", "/api/platform/contacts/segments", { workspace_id: workspaceId })).data,
		sendableMembers: (input) =>
			call("GET", `/api/platform/contacts/segments/${encodeURIComponent(input.segment_id)}/members`, {
				workspace_id: input.workspace_id,
				channel: input.channel,
				cursor: input.cursor,
				limit: input.limit,
			}),
		async *eachSendableMember(input) {
			let cursor: string | null = null;
			do {
				const page: RosterPage<RosterSendableMember> = await client.sendableMembers({
					workspace_id: input.workspace_id,
					segment_id: input.segment_id,
					channel: input.channel,
					cursor,
					limit: input.pageSize,
				});
				yield* page.data;
				cursor = page.next_cursor;
			} while (cursor);
		},
		audienceMembers: (input) =>
			call("GET", `/api/platform/contacts/segments/${encodeURIComponent(input.segment_id)}/audience`, {
				workspace_id: input.workspace_id,
				cursor: input.cursor,
				limit: input.limit,
			}),
	};
	return client;
}
