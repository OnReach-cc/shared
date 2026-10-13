# Consumir y publicar — @onreach/shared

## Consumir

Cada app fija un **tag** y sube cuando quiere:

```json
"dependencies": {
  "@onreach/shared": "github:OnReach-cc/shared#v1.0.0"
}
```

`package-lock.json` mostrará la dependencia como
`git+ssh://git@github.com/OnReach-cc/shared.git#<sha>` sea cual sea la forma que
uses. Es cosmético: para una URL de GitHub, npm clona por **https** primero y
sólo cae a ssh si eso falla, así que **no hace falta ninguna clave SSH en ningún
sitio** mientras el repo sea público. El `<sha>` es lo que hace un build
reproducible, y una vuelta atrás es revertir una línea.

### Después, en la app

**1. Tailwind v4 no escanea `node_modules`.** En el `index.css` de la app, justo
después de los `@import`:

```css
@source "../node_modules/@onreach/shared";
```

Sin esto **cada componente compartido se renderiza sin estilos y no falla nada**.

**2. Borra la copia que la app tenía de cada archivo que ahora importa de aquí.**
Dos copias de un `Dialog` es exactamente cómo los productos del origen se
separaron entre sí.

### ⚠️ La trampa del tag

El pin es **al tag, no a master**.

- Un commit empujado **sin tag** rompe el CI de todos los consumidores a la vez
  (pasó en la plataforma de origen del fork).
- `npm install` **no vuelve a resolver un tag** por su cuenta. Para que una app
  recoja un tag movido o nuevo hay que pedírselo:
  `npm install @onreach/shared@github:OnReach-cc/shared#v1.0.0`
- **El tag se publica ANTES de que corra el CI de los consumidores**: primero
  push del tag aquí, después los push de las apps que lo fijan.

## Publicar

1. Cambia el archivo. `npm run typecheck && npm test`.
2. Sube `version` en `package.json`, commit, y **tag**:
   ```bash
   git tag v1.1.0 && git push --tags
   ```
3. En cada app que lo quiera: cambia el tag en su `package.json`, `npm install`,
   luego su typecheck y su build.

**Semver es para personas:** *major* cuando un consumidor tiene que cambiar
código, *minor* cuando se añade algo, *patch* para un arreglo. Una app que no
está lista simplemente se queda en el tag anterior.

### Historial de versiones

| Versión | Qué trajo |
|---|---|
| `v1.0.0` | el paquete entero, forkeado del shared del origen @ v1.22.0: la maquinaria de productos (`worker/{sso,middleware,mirror,api,email}`, `product-shell`, `topbar`, `presence/`), el mundo **«Golden Hour»** (tokens cálidos, cinco líneas, el emisor en `components/sky.tsx`) y `lib/lines.ts` con las cinco apps. Sin asistente ni llamadas |

## Las reglas de qué entra

- **Sólo código genuinamente idéntico entre productos.** Algo que necesite un
  `if (app === "echo")` pertenece a la app, o hay que **parametrizarlo antes** de
  moverlo aquí.
- **Sólo importaciones relativas dentro del paquete** (`../lib/utils`, no
  `@/lib/utils`). El alias `@/` es de cada app; el bundler del consumidor no sabe
  nada del nuestro.
- **Las dependencias de runtime son `peerDependencies`, nunca `dependencies`.**
  Una segunda copia de React dentro de `node_modules/@onreach/shared/` rompe todos
  los hooks.
- **Nunca importes cruzando la frontera navegador ↔ worker.** Ver
  [modulos.md](modulos.md#la-frontera).

## ⚠️ Este repo tiene que ser PÚBLICO (o el CI de todos necesita un PAT)

Mientras el repositorio es público, `npm ci` en un runner lo clona anónimamente y
los workflows de las apps se quedan como están. **Es la decisión tomada para
OnReach** (la misma que en OnForge): el repo `OnReach-cc/shared` se crea público.

Si algún día se pone privado, **se rompe el CI de todos los consumidores a la
vez**: el `GITHUB_TOKEN` por defecto está limitado al repositorio de la propia
app y no puede leer otro repositorio privado de la organización. Cada app
necesitaría esto **antes** de su `npm ci`:

```yaml
- run: git config --global url."https://x-access-token:${SHARED_READ_TOKEN}@github.com/".insteadOf "https://github.com/"
  env:
    SHARED_READ_TOKEN: ${{ secrets.SHARED_READ_TOKEN }}
    # PAT de grano fino, Contents: read, como secreto de REPOSITORIO en cada app
```

**Ese paso habría que ponerlo en todos ANTES de cambiar la visibilidad**, no
después.
