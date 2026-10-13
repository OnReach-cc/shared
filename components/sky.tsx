/**
 * La marca y la baldosa de app del mundo «Golden Hour», para los cinco productos.
 *
 * Copia para `shared` de `onreach/src/features/frontend/sky/kit.tsx` (Mark y
 * AppTile) sin catálogo ni i18n: los nombres y los glifos de las apps son fijos.
 * El color de cada baldosa lo lee el CSS de `--sk-{id}` en `styles/sky.css`; el
 * color de una app sólo vive en su baldosa.
 */
import { useId } from "react";
import { Inbox, Mail, Megaphone, Palette, Users, type LucideIcon } from "lucide-react";
import type { ProductId } from "../lib/lines";

/** El glifo de cada app: el mismo de su baldosa en onreach.cc y de su icono de marca. */
export const APP_ICON: Record<ProductId, LucideIcon> = {
	echo: Inbox,
	surge: Megaphone,
	letter: Mail,
	canvas: Palette,
	roster: Users,
};

/** La variable CSS del color de una app, para `--tile`. */
export function appVar(id: ProductId): string {
	return `var(--sk-${id})`;
}

/**
 * La marca de OnReach: el emisor al atardecer y sus ondas concéntricas.
 * Geometría pura (un disco encendido y tres arcos que se apagan al alejarse),
 * la misma de onreach.cc.
 */
export function Mark({ className = "size-6" }: { className?: string }) {
	// useId trae caracteres que una referencia url(#…) de SVG no admite.
	const id = `mk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	return (
		<svg viewBox="0 0 28 28" className={className} aria-hidden="true">
			<defs>
				<radialGradient id={`${id}-e`} cx="0.38" cy="0.34" r="0.85">
					<stop offset="0" stopColor="#ffd9a4" />
					<stop offset="0.55" stopColor="#e07a3a" />
					<stop offset="1" stopColor="#a63b12" />
				</radialGradient>
			</defs>
			<circle cx="8" cy="20" r="4.6" fill={`url(#${id}-e)`} />
			<g fill="none" stroke="#b8431f" strokeWidth="2" strokeLinecap="round">
				<path d="M 8 11 A 9 9 0 0 1 17 20" opacity="0.85" />
				<path d="M 8 6.5 A 13.5 13.5 0 0 1 21.5 20" opacity="0.5" />
				<path d="M 8 2 A 18 18 0 0 1 26 20" opacity="0.26" />
			</g>
		</svg>
	);
}

/** La baldosa de una app: su glifo en su color, sobre su tinte. */
export function AppTile({ id, size = "md", className = "" }: { id: ProductId; size?: "lg" | "md" | "sm" | "xs"; className?: string }) {
	const Icon = APP_ICON[id];
	const icon = size === "lg" ? "size-[22px]" : size === "md" ? "size-[18px]" : size === "sm" ? "size-[14px]" : "size-3";
	return (
		<span
			className={`sk-tile ${size === "lg" ? "sk-tile--lg" : size === "sm" ? "sk-tile--sm" : size === "xs" ? "sk-tile--xs" : ""} ${className}`}
			style={{ "--tile": appVar(id) } as React.CSSProperties}
			aria-hidden="true">
			<Icon className={icon} strokeWidth={1.75} />
		</span>
	);
}
