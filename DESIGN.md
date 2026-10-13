---
name: OnReach products
description: "«Golden Hour»: el mundo visual de OnReach. Una cuenta es un emisor encendido al atardecer; las cinco apps (Echo, Surge, Letter, Canvas, Roster) viajan en sus ondas concéntricas — la señal que llega a su audiencia. Papel cálido, tinta cálida, un solo acento de cobre y cinco colores de línea. El CSS del mundo y sus primitivas se sirven desde @onreach/shared."
colors:
  ground: "#faf5ee"
  mist: "#f4ecdf"
  haze: "#ecdfca"
  surface: "#ffffff"
  glass: "rgba(255, 253, 248, 0.66)"
  ink: "#2a1d11"
  ink-2: "#5c4c3a"
  ink-3: "#6d5b46"
  hair: "rgba(42, 29, 17, 0.08)"
  hair-2: "rgba(42, 29, 17, 0.14)"
  accent: "#b8431f"
  accent-soft: "#f9e6da"
  accent-deep: "#9a3817"
  line-echo: "#176fa8"
  line-surge: "#b02567"
  line-letter: "#a16207"
  line-canvas: "#7d3996"
  line-roster: "#667a16"
  destructive: "#b3261e"
  danger-bg: "#fbeceb"
  danger-fg: "#8f2219"
  warning-bg: "#fdf1e1"
  warning-fg: "#a35f00"
  success-bg: "#e6f4ee"
  success-fg: "#17795a"
  selection: "#f6dcc4"
  shadow-base: "rgba(84, 48, 16, …)"
typography:
  family: "Geist, Segoe UI, system-ui, sans-serif (una sola familia; jerarquía por tamaño y peso, nunca por una segunda familia ni por monoespaciada)"
  display:
    fontWeight: 500
    letterSpacing: "-0.038em"
    lineHeight: 1.04
  h2:
    fontWeight: 500
    letterSpacing: "-0.032em"
    lineHeight: 1.08
  h3:
    fontWeight: 500
    letterSpacing: "-0.018em"
    lineHeight: 1.25
  body:
    color: "ink-2"
    lineHeight: 1.6
    baseSize: "15px dentro de un producto (html.site.sk); 17px→1rem en marketing"
  small:
    color: "ink-3"
    fontSize: "0.8125rem"
    lineHeight: 1.5
  base-tracking: "-0.006em en todo el mundo .sk"
  numerals: "tabular-nums en cifras y tablas (.sk-num, tablas fare)"
  component-ramp: "0.6875 / 0.75 / 0.8125 / 0.875 / 0.9375 / 1 / 1.0625rem — los pasos de letra de los componentes (contadores, sellos, small, controles, campos, cuerpo, marca); fuera de esta rampa no hay tamaños literales"
rounded:
  tile: "10px (lg 13px, sm 8px, xs 6px)"
  field: "12px"
  menu-item: "10–12px"
  card: "18px"
  window: "20px"
  dialog: "24px"
  panel: "28px"
  pill: "999px (botones, chips, sellos, pestañas, rieles)"
spacing:
  module: "4px: todo hueco es múltiplo de 4"
  column: "1240px + márgenes 16/24/32px (sk-wrap)"
  header: "64px"
  control-heights: "btn 48 (sm 38), navlink 36, chip/segment 34, field ≥44"
components:
  Mark: "components/sky.tsx — el emisor: disco con gradiente de sol bajo (#ffd9a4→#e07a3a→#a63b12) y tres arcos concéntricos de cobre que se apagan al alejarse (0.85/0.5/0.26)"
  AppTile: "la baldosa de una app: su glifo Lucide (strokeWidth 1.75) en su color sobre su tinte (color-mix 13% con blanco); el ÚNICO lugar donde vive el color de una app junto a las ondas del emisor"
  LineBand: "components/map.tsx — las cinco líneas apiladas; con focus, la de la app encendida y las otras cuatro al 18%"
  ProductFrame: "components/product-shell.tsx — barra lateral fija (#f5eddd), barra superior de vidrio al hacer scroll, página sobre el suelo"
  sk-btn: "píldoras: primaria de tinta, quiet transparente, glass de vidrio; scale(0.97) en :active"
  sk-card: "tarjeta blanca, radio 18, sombra-1; al pasar, -3px y sombra-2"
  sk-field: "campo blanco con filete interior; foco = filete de acento + aro rgba(184,67,31,0.14)"
  sk-orb: "el emisor de respaldo sin WebGL2: disco encendido y su primera onda concéntrica"
---

# OnReach — «Golden Hour»

## El mundo

La misma gramática del cielo, a otra hora. Los otros dos mundos de la casa son
la mañana fría y la noche; **OnReach es el atardecer dorado**. La metáfora: **un emisor
encendido a la hora dorada, cuyas ondas concéntricas llevan las cinco apps** —
la señal que sale y llega a su audiencia, que es exactamente lo que una
marketing suite hace. El emisor es la cuenta; cada onda que se aleja es una
app alcanzando a alguien.

Todo es claro, cálido y de día bajo: papel `#faf5ee`, tinta `#2a1d11`, niebla
y bruma de arena (`#f4ecdf`, `#ecdfca`), sombras cálidas sobre base
`rgba(84, 48, 16, …)` siempre con desplazamiento y desenfoque. No hay modo
oscuro: el atardecer ES la paleta.

## La gramática (lo que no cambia con la hora)

1. **Una sola familia**: Geist, pesos 400–600. Jerarquía por tamaño y peso.
   Tracking de -0.006em en el cuerpo a -0.038em en el display.
2. **Un solo acento**: el cobre `#b8431f` — marca, enlaces, foco y la raya de
   «estás aquí». Da 5.0:1 sobre el papel y 5.4:1 sobre blanco (AA en texto
   normal). Las acciones primarias NO son de acento: son píldoras de tinta.
3. **Sombra o línea, nunca las dos**: una tarjeta lleva sombra; una fila lleva
   filete (`hair`/`hair-2`). El filete interior (`inset box-shadow`) de campos
   y chips cuenta como línea.
4. **Vidrio solo en lo que flota**: la cabecera al hacer scroll, los menús,
   las hojas y el emisor. Siempre con respaldo opaco bajo
   `prefers-reduced-transparency`.
5. **Módulo de 4px** para todo hueco; columna de 1240px; cabecera de 64px.
6. **Radios**: 6/8/10/12/18/28 y píldora 999px. Controles en píldora; tarjeta
   18; panel 28; baldosa 10.
7. **Curvas**: `cubic-bezier(.23,1,.32,1)` para entrar (ease-out fuerte) y
   `cubic-bezier(.77,0,.175,1)` para moverse. UI entre 140 y 260ms; las
   coreografías del héroe hasta 900ms. `:active` = `scale(0.97)`.
   `prefers-reduced-motion` apaga coreografías y rebotes y deja solo opacidad.

## Las cinco líneas

Cada app es una línea de color sobre el papel cálido. Un color de línea se
aplica a `stroke`, `background` o `fill`, **nunca a `color`**: en el mundo nada
se escribe en azur, magenta, dorado, ciruela ni oliva. El color de una app vive
solo en su baldosa (`AppTile`) y en las ondas del emisor.

| App | Línea | Color | Por qué |
|---|---|---|---|
| Echo | azur | `#176fa8` | la conversación que va y vuelve, agua honda |
| Surge | magenta | `#b02567` | la energía de una campaña encendida |
| Letter | dorado | `#a16207` | la correspondencia, el sello clásico |
| Canvas | ciruela | `#7d3996` | lo creativo, el cielo tardío |
| Roster | oliva | `#667a16` | el suelo compartido del que crecen las demás |

Las cinco dan ≥ 4.5:1 sobre el papel (`#faf5ee`) y admiten el rótulo en papel
(blanco) encima con ≥ 4.8:1. Están separadas en tono entre sí (43°–333°) y de
la paleta de los otros dos mundos. El orden canónico es
`echo, surge, letter, canvas, roster` (`PRODUCT_IDS` en `lib/lines.ts`; los
valores hex viven en `LINE_HEX` y en los tokens `--l-*`/`--sk-*`).

## El kit de marca

- **`Mark`** (`components/sky.tsx`): el emisor. Un disco con el gradiente del
  sol bajo (`#ffd9a4 → #e07a3a → #a63b12`) y tres arcos concéntricos de cobre
  a 90° que se apagan al alejarse (opacidades 0.85 / 0.5 / 0.26, trazo 2,
  puntas redondas). Geometría pura: nada de ilustración.
- **`AppTile`**: el glifo Lucide de cada app (Echo `Inbox`, Surge `Megaphone`,
  Letter `Mail`, Canvas `Palette`, Roster `Users`; trazo 1.75) en su color
  sobre su tinte (13% del color sobre blanco, con su anillo interior al 16%).
- **`.sk-orb`** (CSS): el respaldo del emisor cuando no hay WebGL2 — el disco
  encendido y su primera onda como anillo concéntrico.
- **`theme-color`**: `#faf5ee`.

## Superficies

- **Suelo** `ground` para la página; **niebla** `mist` para rieles, pastillas
  y tableros; **superficie** blanca para tarjetas, campos y tablas.
- **El cielo de un héroe** (`sk-hero-sky`): el resplandor del horizonte abajo a
  la izquierda (`rgba(255,190,128,0.8)`), aire rosado arriba a la derecha y la
  caída `#efe0cd → #faf5ee`. La versión de panel es `sk-skyfill`.
- **Estados**: el error en rojo apagado (`#8f2219` sobre `#fbeceb`); lo
  informativo en tinta sobre niebla. Un estado es su palabra en un sello; el
  color solo la apoya. El acento tintado es `accent-soft` con texto
  `accent-deep` (5.9:1).
- **Superficies del navegador**: selección `#f6dcc4` con tinta, foco con aro
  de acento (2px, offset 3), scrollbar `#d7c7ad` sobre el suelo, numerales
  tabulares en datos.

## Movimiento

Una sola coreografía de llegada (`sk-rise`: sube 8px y se enfoca desde blur
5px, 900ms, escalonada 70ms por `--i`), entradas al hacer scroll solo donde la
secuencia dice algo (`sk-reveal`, con `animation-timeline: view()` como
mejora), y una cifra que cambia entra desenfocada (`sk-tick`, 260ms). Los
menús entran desde su disparador (`transform-origin` del lado del trigger,
180ms); la salida es instantánea. Nada se anima en bucle salvo el esqueleto de
carga (`sk-breathe`).

## La regla de evidencia

OnReach nace en pre-lanzamiento. Ninguna métrica, cliente, testimonio o cifra
inventada se presenta como real en ninguna superficie de persuasión; la
persuasión se apoya en mecanismos del producto que existen, o deja el hueco
visible.

## Dónde vive cada cosa

- `styles/sky.css` — los tokens `--sk-*`, las primitivas del mundo (`sk-btn`,
  `sk-card`, `sk-field`, `sk-menu`…) y el bloque `.site.sk` que reinterpreta el
  vocabulario estructural de `site.css` dentro de una consola o un producto.
- `styles/site.css` — la estructura heredada del mapa (rejillas, recomposición
  móvil) y los tokens `--l-*`; dentro de un producto siempre va con `.sk`.
- `styles/product.css` — lo que solo tienen los productos: la banda de una
  línea, los tokens de shadcn remapeados, las primitivas de Radix vestidas.
- `components/sky.tsx` — `Mark`, `AppTile`, `APP_ICON`.
- `lib/lines.ts` — `PRODUCT_IDS`, `APP_NAME`, `APP_TAGLINE`, `APP_ORIGIN`,
  `LINE_HEX`, `lineColor()`.
- Cada app monta `<html class="site sk">` e importa
  `styles/{site,sky,product}.css` más
  `@source "../node_modules/@onreach/shared"` en su `index.css`.
