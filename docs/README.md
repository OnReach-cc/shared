# @onreach/shared — documentación

**El código que es idéntico en los cinco productos de OnReach** (Echo, Surge,
Letter, Canvas, Roster). Cada producto es su propio repositorio y se despliega
por su cuenta; este paquete es lo que evita que carguen cinco copias byte a
byte del mismo archivo. También define **el mundo visual «Golden Hour»**
(`styles/`, `components/sky.tsx`, `DESIGN.md` en la raíz).

No es una librería más: **aquí vive el middleware de autenticación de los cinco
productos**. Un arreglo en la ruta de auth se hace aquí y llega a todos a la vez.

---

## Empieza por aquí

| Quiero… | Ve a |
|---|---|
| saber qué hay dentro y dónde | [modulos.md](modulos.md) |
| consumirlo, publicarlo, y las reglas de qué entra | [uso.md](uso.md) |
| el origen del fork y qué se podó | [decisiones.md](decisiones.md) |
| saber qué está pendiente | [pendiente.md](pendiente.md) |
| el mundo visual (tokens, líneas, kit) | [`../DESIGN.md`](../DESIGN.md) |

---

## Las cuatro cosas que hay que saber

**1. Envía TypeScript crudo.** No hay paso de compilación. El bundler de la app
que lo consume (Vite para `src/`, wrangler para `functions/`) lo compila, y el
`tsc` de la app lo comprueba como parte de su propio programa.

**2. Hay una frontera de tipos dentro del paquete.** `ui/`, `lib/`, `hooks/`,
`components/` y `presence/` asumen el DOM; `worker/` asume
`@cloudflare/workers-types`.

> **Nunca importes cruzando esa línea.** Los dos universos de tipos no se ponen
> de acuerdo sobre los mismos nombres globales, y por eso hay dos `tsconfig`
> aquí y dos en cada app.

**3. El pin es a un TAG de git, no a master.**

```json
"dependencies": {
  "@onreach/shared": "github:OnReach-cc/shared#v1.0.0"
}
```

> ⚠️ **Un commit empujado sin tag rompe el CI de todos los consumidores a la
> vez** (pasó en la plataforma de origen). Y `npm install` no vuelve a resolver
> un tag por su cuenta: hay que pedírselo explícitamente
> (`npm install pkg@github:…#tag`).

**4. Tailwind v4 no escanea `node_modules`.** Cada app lleva en su `index.css`:

```css
@source "../node_modules/@onreach/shared";
```

Sin esa línea **todo componente compartido se renderiza sin estilos y no falla
nada**.

---

## Quién depende de esto

Los cinco productos (`echo`, `surge`, `letter`, `canvas`, `roster`), el control
plane (`onreach`) y las consolas que lo consuman (admin, en la S4).

**Cualquier cambio aquí es un cambio en todos esos sitios.** Por eso las apps
fijan un tag y suben cuando quieren, en vez de seguir a master.

---

## Para una IA que llega a este repo

1. **Antes de arreglar un bug de autenticación en un producto, mira si el arreglo
   va aquí.** `worker/middleware.ts` es el middleware de los cinco. Arreglarlo en
   el producto es crear la sexta copia del bug.
2. **Sólo entra lo genuinamente idéntico.** Algo que necesite un
   `if (app === "echo")` pertenece a la app, o hay que parametrizarlo **antes**
   de moverlo aquí.
3. **Las dependencias de runtime son `peerDependencies`, nunca `dependencies`.**
   Una segunda copia de React dentro de `node_modules/@onreach/shared/` rompe
   todos los hooks.
4. Publicar es tag + bump; el procedimiento está en [uso.md](uso.md#publicar).

---

**El mapa de los proyectos de la plataforma** vivirá en
[`onreach/docs/plataforma.md`](../../onreach/docs/plataforma.md) cuando la S2
forkee el control plane; mientras tanto, el plan por sesiones está en
[`../../docs/sesiones/README.md`](../../docs/sesiones/README.md).
