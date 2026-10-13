# Decisiones — @onreach/shared

> **Este es el único archivo del repositorio autorizado a nombrar la plataforma
> de origen.** En el resto del código y los docs, el origen no se menciona.

## El origen del fork (2026-10-13, sesión S1 del plan de OnReach)

`@onreach/shared` v1.0.0 es un fork de **`@ondesk/shared` v1.22.0**
(`OnDesk-cc/shared`), el paquete compartido de la Business Suite de OnDesk.
El árbol se copió con robocopy (sin `.git`, sin historial), se renombró por
bytes (`@ondesk/shared → @onreach/shared`, `OnDesk → OnReach`,
`ondesk → onreach`, incluida `ondesk.cc → onreach.cc`: en este paquete todas
las apariciones eran comentarios o defaults ya configurables por entorno) y se
podó y retematizó según la spec
(`OnReach.cc/docs/superpowers/specs/2026-10-13-onreach-plataforma-design.md`).

### Qué se conservó (a diferencia del fork de OnForge)

OnReach tiene productos, así que **la maquinaria de productos se queda entera**:

- `worker/{sso,middleware,mirror,access,api,email,jwt,cookies,response}` — la
  sesión compartida, los guards, el espejo, la API v1 y el correo.
- `components/{product-shell,topbar,console,console-kit,tag,segmented,callout,
  data-table,form-modal,confirm-delete-modal,sky,map}` y `ui/*`.
- `presence/` — la presencia se conserva (la usan `ProductFrame` y la consola).
- `lib/{lines,utils,initials,crud-api,crud-hooks,use-copy}` y `hooks/`.

### Qué se podó

| Qué | Por qué |
|---|---|
| **Nova entera** (`components/nova-*`, `styles/nova.css`, `lib/nova-star.ts`, `worker/nova-{tools,contract,search}`, los tests `nova-*`) | Decisión D2 de la spec: OnReach v1 no lleva asistente. «Un endpoint muerto que sigue respondiendo es una puerta que nadie vigila» |
| **`worker/rs256.ts` y `worker/json-schema.ts`** (+tests) | Sus cabeceras los declaraban piezas de Nova (verificación del token por llamada y validador de parámetros de herramientas) y ningún archivo conservado los importaba. Si un producto los necesita, se reponen del origen |
| **`calls/`** (`ring-tone`, `ringer-lease`) | Decisión D3: sin llamadas ni realtime en v1 |
| `NovaButton` y el pie «Ask Nova instead» del `HelpMenu` (topbar), la prop `nova` de `ProductFrame` | Eran los puntos de montaje de Nova en el marco |
| Las deps de IA (`@ai-sdk/react`, `@cloudflare/ai-chat`, `agents`, `ai`) | Sólo Nova las importaba |

### Qué se retematizó: el mundo «Golden Hour»

El origen vive en «Clear Sky» (mañana fría, acento azul `#2f6be0`). OnReach
comparte la **gramática** (Geist, radios, módulo de 4px, un solo acento,
sombra o línea, vidrio sólo en lo que flota) y cambia la **hora del cielo**:
atardecer dorado. Papel `#faf5ee`, tinta `#2a1d11`, acento cobre `#b8431f`
(la propuesta de la spec era `#d4552a`; se oscureció para dar AA 4.5:1 sobre
el papel), sombras sobre `rgba(84, 48, 16, …)` y cinco líneas nuevas
(azur/magenta/dorado/ciruela/oliva) separadas en tono de las seis de OnDesk.
La marca pasa del planeta con su luna al **emisor con sus ondas concéntricas**.
Los valores finales viven en [`../DESIGN.md`](../DESIGN.md), escrito desde el
kit (lección 20 del fork de OnForge: no heredar el DESIGN.md viejo).

Dos clases de CSS se renombraron para que ningún nombre del origen sobreviva
en el gate (`grep -i 'ondesk|pulse|halo|atlas|nexus|orbit|vault|nova'` = 0
fuera de este archivo): `.sk-orbit-line → .sk-route-line` y el keyframe
`sk-pulse → sk-breathe`. **La S2/S3, al forkear el control plane, deben alinear
su copia de `sky.css` con estos dos nombres.**

## v1.1.0 — el transporte de correo conmutable (2026-10-13, sesión S2)

`worker/email.ts` quedó pendiente en la S1 y lo cerró la S2 (spec § 8, D4):
`sendEmail` elige transporte con `EMAIL_PROVIDER` — `telnyx` (la Email API,
`POST /v2/email_messages`, beta por invitación `email.beta_access`) o
`cloudflare` (el REST de Email Sending, el valor por defecto y el fallback de
una configuración a medias). La interfaz de las plantillas no cambia: cambiar
de proveedor es cambiar secretos, nunca código de quien llama. El control
plane lleva la misma pareja de funciones en su `_lib/email.ts`.

### Decisiones de empaquetado

- **Pin por tag de git** (`github:OnReach-cc/shared#vX.Y.Z`), nunca a master:
  heredado del origen, donde un commit sin tag rompió el CI de todos los
  consumidores a la vez.
- **Repo público** (decisión de OnForge 2026-10-13 que OnReach hereda): el CI
  de los consumidores clona anónimamente y no hace falta ningún PAT.
- **Sin campo `exports`** a propósito: con `moduleResolution: "bundler"` cada
  archivo nuevo es importable por subruta sin tocar `package.json`.
- **TypeScript crudo, `peerDependencies`** para todo el runtime: el bundler del
  consumidor compila y una sola copia de React sobrevive.
