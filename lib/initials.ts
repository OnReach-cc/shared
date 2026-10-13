/**
 * Dos letras en lugar de alguien que todavía no tiene avatar.
 *
 * Va cayendo de nombre → email → "?", y parte por los puntos y la @ además de por
 * los espacios, porque muchas cuentas son `ana.perez@…` con un campo de nombre
 * que nadie rellenó — y «AN» sacado de un email es mejor que «?» sacado de un
 * nombre vacío.
 *
 * Una copia del `initialsOf` de OnReach, a propósito: no se comparte nada entre
 * estos repositorios.
 * ▸ Hoy: este archivo es `@onreach/shared/lib/initials` y lo importan los cinco
 * productos; la copia aparte que queda es la de onreach, en
 * `onreach/src/features/console/initials.ts`.
 */
export function initialsOf(name: string | undefined | null, email?: string | undefined | null): string {
	const source = (name ?? "").trim() || email || "?";
	return source
		.split(/[\s@.]+/)
		.filter(Boolean)
		.map((word) => word[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}
