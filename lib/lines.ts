/**
 * Las cinco líneas del mundo de OnReach, tal como las conocen las cinco apps.
 *
 * El mundo visual de OnReach dibuja cada app como una línea de color sobre el
 * papel cálido (ver `styles/site.css`). Este módulo es la copia para los
 * productos de `onreach/src/features/frontend/lines.ts` y de los nombres de
 * `onreach/src/features/console/apps.ts`: el orden de siempre, el nombre propio
 * (nunca se traduce), la frase de una línea de cada app y el color de su línea
 * como variable CSS del mundo.
 *
 * Un color de línea se aplica a `stroke`, `background` o al `fill` de un
 * rectángulo, nunca a `color`: en el mundo nada se escribe en azur, magenta,
 * dorado, ciruela ni oliva.
 */

export type ProductId = "echo" | "surge" | "letter" | "canvas" | "roster";

/** El orden de la banda de cinco líneas, y de cualquier clave o intercambiador. */
export const PRODUCT_IDS: readonly ProductId[] = ["echo", "surge", "letter", "canvas", "roster"];

export const APP_NAME: Record<ProductId, string> = {
	echo: "Echo",
	surge: "Surge",
	letter: "Letter",
	canvas: "Canvas",
	roster: "Roster",
};

/** Lo que hace cada app, en una frase de la clave del mapa. */
export const APP_TAGLINE: Record<ProductId, string> = {
	echo: "Omnichannel inbox",
	surge: "Advertising",
	letter: "Email and SMS campaigns",
	canvas: "Social content",
	roster: "Contacts and segments",
};

/** El origen de producción de cada app; cada producto lo puede sobrescribir por entorno. */
export const APP_ORIGIN: Record<ProductId, string> = {
	echo: "https://echo.onreach.cc",
	surge: "https://surge.onreach.cc",
	letter: "https://letter.onreach.cc",
	canvas: "https://canvas.onreach.cc",
	roster: "https://roster.onreach.cc",
};

/**
 * El valor de cada línea sobre el papel cálido (`#faf5ee`), la fuente de los
 * tokens `--l-*` de `styles/{site,sky}.css` y `--sk-*` de las baldosas. Las
 * cinco dan ≥ 4.5:1 sobre el papel y admiten el rótulo en papel encima.
 */
export const LINE_HEX: Record<ProductId, string> = {
	echo: "#176fa8",
	surge: "#b02567",
	letter: "#a16207",
	canvas: "#7d3996",
	roster: "#667a16",
};

export function isProductId(id: string): id is ProductId {
	return (PRODUCT_IDS as readonly string[]).includes(id);
}

/** El color de línea de una app, como variable del mundo `.site`. */
export function lineColor(id: string): string {
	return `var(--l-${id})`;
}

/** Las cinco líneas del atardecer son oscuras: el rótulo va siempre en papel. */
export function labelClass(_id: string): string {
	return "map-label";
}

/** El nombre de una app por su id, o el id tal cual si no es una de las cinco. */
export function appName(id: string): string {
	return isProductId(id) ? APP_NAME[id] : id === "suite" ? "Marketing Suite" : id;
}
