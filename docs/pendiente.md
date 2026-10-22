# Pendiente — @onreach/shared

> El estado de despliegue **no se deduce del repositorio**. Lo marcado
> **«confirmar»** viene de las notas de trabajo.

_Última revisión: 2026-10-21 (`OnReach-cc/shared` es público y tiene los tags `v1.0.0`–`v1.4.0`; onreach y las tres consolas fijan `v1.1.0`, Echo y Canvas `v1.2.0`, Surge `v1.3.0`, Roster y Letter `v1.4.0`)._

## Abierto

| Qué | Detalle | Confirmar |
|---|---|---|
| **El render WebGL del emisor** | `Mark` (SVG) y `.sk-orb` (CSS) existen; si el héroe de onreach.cc quiere un emisor animado con WebGL como el planeta del origen, se construye en la S3 sobre esta geometría | no |
| **`labelClass` quedó sin variante de tinta** | Las cinco líneas del atardecer son oscuras y el rótulo va siempre en papel; si alguna línea futura fuera clara, reintroducir `map-label--ink` | no |

## Trampas del terreno

| Trampa | Síntoma |
|---|---|
| **Empujar un commit sin tag** | Rompe el CI de todos los consumidores a la vez. El pin es al tag |
| **Esperar que `npm install` recoja un tag** | No lo hace solo. Hay que pedirlo explícitamente con `pkg@github:…#tag` |
| **Olvidar `@source` en la app** | Cada componente compartido se renderiza **sin estilos**, y no falla nada |
| **Importar cruzando la frontera** | `ui/` ↔ `worker/`. Los dos universos de tipos declaran los mismos globales con formas distintas |
| **Poner una dependencia de runtime en `dependencies`** | Segunda copia de React en `node_modules/@onreach/shared/` → todos los hooks rotos |
| **Editar fuentes con Get-Content/WriteAllText** | Mojibake (UTF-8 releído como ANSI). Edit tool o Node por bytes, y el grep de mojibake de la spec después |

## Cómo cerrar una fila de aquí

Bórrala en el mismo commit. Si el cambio es del paquete, **acuérdate del tag**:
sin tag, ninguna app lo verá.
