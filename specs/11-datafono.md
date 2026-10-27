# Flujo 11 · Datáfono

> **Alcance de esta versión:** spec de la variante *Datáfono* de HU-13: el CSV de cobros con tarjeta se importa cada noche como ventas, sin duplicar. La variante *Apartados desde casa* queda fuera. Todavía no está construido. CSV de ejemplo: [data/datafono_ejemplo.csv](../data/datafono_ejemplo.csv).

## 1. Cabecera

- **Flujo:** `11 · Datáfono` (`workflows/11-datafono.json`).
  - No es uno de los flujos 1–8 de «Automatizaciones a construir» del README. Es la variante *Ventas del datáfono* de «Otras entradas de datos automáticas» del nivel Avanzado.
  - Lleva el número libre siguiente: el `09` es la migración del Excel y el `10` los sub-workflows. Ver [AGENTS.md, secciones 5 y 8](../AGENTS.md#8-decisiones-tomadas).
- **HU:** HU-13 · Entrada automática de datos, variante *Datáfono* (#110).
- **Nivel:** Avanzado.
- **Responsable:** Esra.
- **Credenciales y variables:**
  - `API Tienda` (Header Auth), en los `GET` y `POST`;
  - el informe sale con `10 · Enviar notificación`, que usa `Mailpit`.
  - Ver [docs/credenciales.md](../docs/credenciales.md).
- **Error Workflow:** `08 · Error Workflow`.
- **Settings:** zona horaria `Europe/Madrid`.

## 2. Objetivo

Que los cobros con tarjeta del datáfono entren solos en la app como ventas cada noche, sin repetir los que la dependienta ya apuntó en el mostrador, y que la tienda reciba un resumen de lo que se ha hecho.

## 3. Disparador y entradas

### 3.1 De dónde sale el CSV «cada noche»

La app no tiene datáfono: el CSV lo exporta el banco o el proveedor del terminal. En el proyecto lo simulamos con [data/datafono_ejemplo.csv](../data/datafono_ejemplo.csv). El contenedor de n8n no ve la carpeta `data/` del repo.

| Opción | Cómo llega el CSV | Automático cada noche | ¿Cambia `docker-compose.yml`? | Valoración |
|---|---|---|---|---|
| **A · Carpeta de n8n** | Schedule Trigger + **Read/Write Files from Disk**, que lee el CSV de una carpeta que n8n ya puede leer. El CSV se copia ahí con `docker compose cp` (en la tienda real lo dejaría ahí el programa del datáfono) | Sí | No | **Elegida** |
| B · Formulario | Form Trigger con un campo File: alguien sube el CSV a mano | No | No | Para **probar** y para repetir un día a mano (mismo patrón que el `09`) |
| C · Correo con adjunto | Trigger de correo (IMAP/Gmail) que lee el extracto que manda el banco | Sí | No, pero necesita un buzón real con IMAP (Mailpit no sirve para recibir) | Descartada: más piezas, y es del terreno del flujo 3 |
| D · Carpeta del repo montada | Montar `data/datafono/` en el contenedor de n8n como volumen | Sí | **Sí** | Pregunta para la pareja (sección 9) |

**Opción A, detalles:**

- **Carpeta.** Desde n8n 2.0, Read/Write Files from Disk solo puede leer, por defecto, dentro de `~/.n8n-files` (variable `N8N_RESTRICT_FILE_ACCESS_TO`). En el contenedor es `/home/node/.n8n-files`.
  - La carpeta de datos de n8n (`/home/node/.n8n`) está bloqueada por defecto.
  - n8n-mcp solo dice que el nodo puede leer «paths under `/home/node/`». **A comprobar al construir:** que lea `/home/node/.n8n-files/datafono/` sin cambiar variables.
- **La carpeta no existe todavía** y no está en un volumen. Se crea y se llena así, desde la raíz del repo:

  ```bash
  docker compose exec n8n mkdir -p /home/node/.n8n-files/datafono
  docker compose cp data/datafono_ejemplo.csv n8n:/home/node/.n8n-files/datafono/datafono-2026-10-27.csv
  ```

  Si se recrea el contenedor de n8n (por ejemplo, al actualizar la imagen), la carpeta se pierde y hay que volver a crearla. Hacerla persistente obliga a tocar `docker-compose.yml` (opción D).
- **Nombre del fichero:** `datafono-AAAA-MM-DD.csv`, con la fecha del día de la ejecución. El flujo lee solo el fichero de hoy; las fechas de las ventas salen de la columna `fecha` de cada fila, no del nombre.

**Para probar:** el Form Trigger (opción B), por la Test URL, sin publicar el flujo. Es el mismo patrón que el `09` y el `07`.

### 3.2 Disparadores

- **`Cada noche a las 22:00`** (Schedule Trigger):
  - **Trigger Interval** Weeks, **Weeks Between Triggers** `1`, **Trigger on Weekdays** de lunes a sábado, **Trigger at Hour** 10pm y **Trigger at Minute** `0`.
  - Equivale a la expresión cron `0 22 * * 1-6`. Los domingos la tienda cierra, como en los datos de ejemplo.
  - Solo funciona con el flujo publicado (lo publica la pareja).
  - **Por qué a las 22:00:** el cierre diario (flujo 5, HU-04) también es «cada noche» y suma las ventas `tarjeta` del día. El datáfono tiene que ir **antes**, para que el cierre ya incluya lo importado. Ver la pregunta de la sección 9.
- **`Subir el CSV del datáfono`** (Form Trigger 2.6), para las pruebas y para repetir un día:
  - un campo **File** con **Label** `datafono`, obligatorio, **Multiple Files** desactivado y **Accepted File Types** `.csv`;
  - en **Form Description**: «CSV de cobros con tarjeta exportado del datáfono».

### 3.3 El CSV del datáfono

Las columnas son las del extracto del datáfono, **no** son campos de la app. Separador `;`, decimales con coma y fecha `dd/mm/aaaa`, como suelen venir los extractos españoles. Una fila por operación. No lleva nombres de personas: la tarjeta va enmascarada.

| Columna | Ejemplo | Para qué se usa |
|---|---|---|
| `fecha` | `21/10/2026` | `fecha` de la Venta (`AAAA-MM-DD`) |
| `hora` | `17:05` | Ordenar los cobros iguales del mismo día (paso 7). No va a la app |
| `operacion` | `004516` | Nº de operación del datáfono. Va en el `concepto` de la Venta y reconoce lo ya importado |
| `tarjeta` | `**** 3348` | No se usa: no va a la app ni al informe |
| `importe` | `18,95` | `importe` de la Venta |
| `estado` | `APROBADA` | Solo se importan las `APROBADA` |

Obligatorias: `fecha`, `operacion`, `importe` y `estado`. Si falta alguna en la cabecera, el flujo para con error (sección 6).

**Lo que se crea en la app** (`POST /api/ventas`, campos de la ontología, Venta):

| Campo | Valor |
|---|---|
| `fecha` | La `fecha` del cobro, en `AAAA-MM-DD` |
| `concepto` | `Datáfono op. <operacion>`, por ejemplo `Datáfono op. 004516`. El datáfono no sabe qué se vendió; así la venta se reconoce en la app, en el cierre y en el aviso de venta grande |
| `importe` | El `importe` del cobro, con punto decimal |
| `forma_pago` | `tarjeta` |

La API acepta `fecha` en `POST /api/ventas` (`backend/schemas/venta.py`). Rechaza con `422` un `importe` ≤ 0 o una `forma_pago` no válida. No guarda el número de operación ni la hora.

## 4. Pasos y reglas

```
Cada noche a las 22:00 ─ Leer el CSV del día ─ ¿Ha llegado el CSV? ─ true ─┐
                                                                  └ false ─ Avisar de que falta el CSV
Subir el CSV del datáfono ─────────────────────────────────────────────────┴─ Leer cobros del CSV ─ Revisar los cobros ─
  Leer ventas de esos días ─ Decidir qué crear ─ ¿Hay ventas que crear? ─ true ── Registrar ventas ─┐
                                                                         └ false ───────────────────┴─ Preparar informe ─ Enviar informe del datáfono
```

**Lectura**

1. `Leer el CSV del día` (Read/Write Files from Disk 1.1, **Read File(s) From Disk**), solo en la rama programada:
   - **File(s) Selector** (Expression): `/home/node/.n8n-files/datafono/datafono-{{ $now.setZone('Europe/Madrid').toFormat('yyyy-MM-dd') }}.csv`
   - **Options → Put Output File in Field:** `datafono`. Es el mismo nombre que el campo binario del formulario, para que los dos lleguen igual al nodo siguiente.
   - **Settings → Always Output Data:** activado, para que el IF se ejecute aunque no haya fichero.
   - **A comprobar:** si, cuando el fichero no existe, el nodo devuelve 0 items o da error. Si da error, se activa **On Error → Continue** en el nodo y el IF decide igual.
2. IF `¿Ha llegado el CSV?`: `{{ !!$binary.datafono }}` · Boolean · is true.
   - **false →** `Avisar de que falta el CSV` (Execute Workflow a `10 · Enviar notificación`, regla de [specs/10-sub-workflows.md](10-sub-workflows.md), sección 3: **Mode** Run once for each item). Workflow Inputs:
     - `para`: `tienda@pasofirme.example`;
     - `asunto`: `Datáfono: no ha llegado el CSV del {{ $now.setZone('Europe/Madrid').toFormat('dd/MM/yyyy') }}`;
     - `texto`: `{{ 'No se ha encontrado el fichero datafono-' + $now.setZone('Europe/Madrid').toFormat('yyyy-MM-dd') + '.csv en /home/node/.n8n-files/datafono/.\n\nNo se ha importado ningún cobro con tarjeta. Cuando llegue el CSV, se puede subir a mano con el formulario «Subir el CSV del datáfono».' }}`.
     - El flujo termina ahí, sin error: un día sin fichero no es un fallo de n8n, y la tienda lo sabe por este aviso.
3. `Leer cobros del CSV` (Extract From File 1.2, **Extract From CSV**), al que llegan las dos ramas:
   - **Input Binary Field** `datafono`;
   - **Options:**
     - **Header Row** activado y **Delimiter** `;`;
     - **Include Empty Cells** activado. Viene desactivado, y entonces una celda vacía (por ejemplo, el `importe` de la operación `004520`) no llega como `""`: esa columna desaparece del item. El Code acepta las dos formas, pero así cada fila trae todas sus columnas;
     - **Exclude Byte Order Mark (BOM)** activado, por si el datáfono guarda el CSV con BOM. El Code también lo quita.
   - Los valores llegan como **texto** (`"18,95"`, `"004516"`): el Code los convierte.
   - **Settings → Always Output Data:** activado. Un CSV con solo la cabecera da 0 items y, sin esta opción, el flujo se pararía sin informe.

**Revisión de las filas** (`Revisar los cobros`, Code, Run Once for All Items)

4. Comprueba la cabecera:
   - quita el BOM (`\uFEFF`) y los espacios de los nombres de columna;
   - si falta `fecha`, `operacion`, `importe` o `estado`, **para con error** «Datáfono: faltan columnas en el CSV: …».
   - Un CSV sin filas no es error: sigue con 0 cobros y el informe lo dice.
5. Cada fila acaba en **cobro válido** o en **no importado**, con su motivo:
   - `estado` distinto de `APROBADA` (`DENEGADA`, `ANULADA`, `DEVOLUCION`…): no importado, con el estado como motivo. No es una venta, y la app no tiene devoluciones; Marisa lo ve en el informe.
   - `fecha` que no es `dd/mm/aaaa`, `importe` vacío, no numérico o ≤ 0, u `operacion` vacía: no importado, «fila no válida» con el campo que falla. Así no se llega a mandar un `POST` que la app rechazaría con `422`.
   - `operacion` repetida en el CSV: la segunda y siguientes no se importan («operación repetida en el CSV»). Cada operación es un cobro.
   - `importe` con coma decimal (`18,95`) → `18.95`.
6. Devuelve **un item** con:
   - los cobros válidos `{ fecha, hora, operacion, importe }`;
   - los no importados `{ linea, operacion, motivo }`;
   - el rango `{ desde, hasta }` (la fecha menor y la mayor de los cobros válidos; si no hay, hoy).

**Qué hay ya en la app**

7. `Leer ventas de esos días`: `GET http://tienda:8000/api/ventas` con query `desde` y `hasta` del rango, sin `pagina` (así devuelve todas).
   - Settings **Execute Once** y **Always Output Data**, como en el `09`. Si no hay ventas, llega un item vacío y se ignora.
   - Credencial `API Tienda`.

**Regla de duplicados** (`Decidir qué crear`, Code)

La app no guarda el número de operación, así que un duplicado se detecta en dos pasos:

8. **Ya importado por este flujo.** Si en la app hay una venta con `concepto` exactamente `Datáfono op. <operacion>` y la misma `fecha`, el cobro ya se importó en una ejecución anterior. No se crea («ya importado»).
9. **Ya apuntado en el mostrador.** Los demás cobros se agrupan por `fecha` + `importe`. Para cada grupo:
   - **en la app:** nº de ventas con esa `fecha` e `importe`, `forma_pago` `tarjeta` y un `concepto` que **no** empieza por `Datáfono op.`;
   - **en el CSV:** nº de cobros del grupo;
   - se crean `max(0, CSV − app)`. Los primeros cobros del grupo por `hora` se dan por apuntados («ya registrado en la tienda») y se crean los siguientes.
   - **Ejemplo:** dos cobros de 18,95 el mismo día y una sola venta `tarjeta` de 18,95 en la app → uno ya estaba y se crea el otro.
10. **Segunda ejecución con el mismo CSV:** todo lo creado en la primera sale en el paso 8, y lo que ya estaba sigue saliendo en el paso 9. **No se crea nada.**
11. Para cada venta que hay que crear devuelve un item `{ cuerpo: { fecha, concepto, importe, forma_pago: 'tarjeta' }, operacion }`. Si no hay ninguna, devuelve un solo item `{ cuerpo: null }`, igual que el `09`: un Code nunca devuelve 0 items, para que el informe salga siempre.

**Límites de la regla** (van al informe, sección 5):
- **Venta apuntada con otra forma de pago.** Si la dependienta apuntó un cobro con tarjeta como `efectivo` o `bizum`, no cuenta como apuntado y el cobro se crea: quedaría duplicado, con otra forma de pago. No se puede distinguir de dos ventas distintas del mismo importe. El informe lista las ventas creadas para que Marisa lo revise.
- **Venta apuntada otro día.** Si se apuntó otro día, tampoco cuenta.
- **Venta `tarjeta` sin cobro en el datáfono.** Si en la app hay más ventas `tarjeta` de una `fecha` + `importe` que cobros en el CSV, el informe las cuenta como «en la app sin cobro en el datáfono». No se toca nada.

**Registro**

12. IF `¿Hay ventas que crear?`: `{{ !!$json.cuerpo }}` · Boolean · is true. Las dos ramas llegan a `Preparar informe`.
13. `Registrar ventas`: `POST http://tienda:8000/api/ventas` con el `cuerpo`, igual que en el `09`:
    - **Send Body** JSON, `{{ JSON.stringify($json.cuerpo) }}`, credencial `API Tienda`;
    - **Options → Batching** de 1, para que vayan de una en una;
    - **Include Response Headers and Status** y **Never Error**: un `422` no para el flujo, y el informe lo recoge con el `detail` de la app.

**Informe**

14. `Preparar informe` (Code) junta los resultados:
    - **creadas:** respuesta `201`, con `id`, `fecha`, `importe` y operación;
    - **ya importadas** (paso 8) y **ya registradas en la tienda** (paso 9);
    - **no importadas** (paso 5), con su motivo;
    - **rechazadas por la app** (`422`), con el `detail`.

    Cualquier otro código del `POST` (`401`, `5xx`) **para con error**, con el código y el `detail`; lo avisa el `08`. Lee la salida de `Registrar ventas` solo si se ejecutó (como en el `09`, `isExecuted`).

    Devuelve `{ asunto, texto }`.
15. `Enviar informe del datáfono` (Execute Workflow a `10 · Enviar notificación`, **Mode** Run once for each item, Wait For Sub-Workflow Completion):
    - `para` = `tienda@pasofirme.example`;
    - `asunto` = `{{ $json.asunto }}`;
    - `texto` = `{{ $json.texto }}`;
    - `html` vacío.

### 4.1 Efecto en HU-09 (venta grande)

Cada `POST /api/ventas` dispara el webhook `venta.registrada`, y el `01` (rama HU-09) compara el `importe` con el umbral de la Data table `Configuración` (hoy `100`).

- **Es lo esperado.** Es una venta real por encima del umbral, y Marisa quiere saber de las ventas grandes. Si no se apuntó en el mostrador, el datáfono es la única forma de que se entere.
  - El aviso llega por la noche, no en el momento del cobro, y su `concepto` (`Datáfono op. …`) dice de dónde viene.
  - Si la venta ya estaba apuntada, no se crea, así que no hay un segundo aviso.
- **No se hace nada especial:** no se desactiva el webhook ni se marca la venta. Con el CSV de ejemplo, la operación `004517` (129,90 €) genera el aviso «Venta grande: 129.90 €».
- Cada venta creada es una ejecución del `01`. Con pocas ventas por noche no es un problema.

## 5. Salidas

| Destinatario | Canal | Cuándo | Qué incluye |
|---|---|---|---|
| Tienda (`tienda@pasofirme.example`) | Correo con `10 · Enviar notificación` | Al terminar cada importación | Asunto: `Datáfono del <dd/MM/yyyy>: <n> ventas creadas`. Si el CSV trae varios días, `Datáfono del <desde> al <hasta>`. Texto: el origen (programado o formulario); el nº de filas del CSV; las **ventas creadas** (operación, hora, importe, `id` de la app) con su total; las **ya importadas**; las **ya registradas en la tienda**; las **no importadas** con su motivo; las **rechazadas por la app**; y las ventas `tarjeta` **en la app sin cobro en el datáfono**. Si no hay nada que crear: «No se ha creado ninguna venta» |
| Tienda | Correo con `10 · Enviar notificación` | Ejecución programada sin fichero del día | «Datáfono: no ha llegado el CSV del <dd/MM/yyyy>» (paso 2) |
| App | `POST /api/ventas` | Por cada cobro que falta | Venta `tarjeta` con la `fecha` del cobro (sección 3.3) |
| Tienda (indirecto) | Aviso de venta grande del `01` | Venta creada por encima del umbral | Ver 4.1 |

## 6. Casos de error

Como siempre, el `08` solo salta en las ejecuciones de producción: la programada con el flujo publicado, o la Production URL del formulario. Por la Test URL, el error se ve en el editor.

Si falla `Enviar informe del datáfono` (por ejemplo, Mailpit caído), el aviso del `08` lleva el mensaje genérico de n8n para un sub-workflow que falla. El motivo real se ve en la ejecución de `10 · Enviar notificación`.

| Caso | Qué hace el flujo |
|---|---|
| No hay fichero del día (ejecución programada) | Aviso «no ha llegado el CSV» y termina sin error (paso 2) |
| CSV vacío o solo con la cabecera | No es error: informe con 0 filas y «No se ha creado ninguna venta» |
| Faltan columnas obligatorias en la cabecera (o el separador no es `;`, y todo llega en una columna) | `Revisar los cobros` para con «Datáfono: faltan columnas en el CSV: …» y lo avisa el `08`. No se crea nada |
| Fila `DENEGADA`, `ANULADA`, `DEVOLUCION` u otro estado | No se importa; va al informe con su estado |
| Fila con `fecha`, `importe` u `operacion` no válidos | No se importa; va al informe como «fila no válida» |
| Operación repetida en el CSV | Solo se cuenta la primera; las demás van al informe |
| Cobro ya importado o ya apuntado en el mostrador | No se crea (pasos 8 y 9) |
| `GET /api/ventas` responde `401` (credencial mal) o la app no responde | Falla `Leer ventas de esos días` y se para **antes de crear nada**; lo avisa el `08` |
| `POST /api/ventas` responde `422` | Esa venta va al informe como rechazada, con el `detail`; el flujo sigue con las demás |
| `POST` responde `401` u otro código que no es `201` ni `422` | `Preparar informe` para con error; lo avisa el `08`. Las ventas ya creadas se quedan, y la siguiente ejecución no las repite (paso 8) |
| Se ejecuta dos veces el mismo día, o el formulario después de la programada | No duplica (paso 10) |
| La dependienta apuntó el cobro con otra forma de pago u otro día | Se crea igualmente (límite de la regla, paso 11); queda en el informe para que Marisa lo revise |

## 7. Prueba

**Datos:** [data/datafono_ejemplo.csv](../data/datafono_ejemplo.csv), 10 cobros del **21/10/2026**. Las ventas que ya están en la app son las del seed cargado el 21/10/2026 (consulta de solo lectura a la base de datos, sin `POST`). Si se vuelve a cargar el seed otro día, hay que cambiar la fecha del CSV y las ventas con las que coincide.

Ventas del 21/10/2026 en la app antes de la prueba:

| id | concepto | importe | forma_pago |
|---|---|---|---|
| 253 | Bota montaña T45 | 79.90 | **tarjeta** |
| 254 | Zapatilla casa | 18.95 | **tarjeta** |
| 255 | Sandalia playa | 14.90 | efectivo |
| 256 | Bota montaña T36 | 79.90 | bizum |

**Prueba 1 · primera ejecución** (formulario `Subir el CSV del datáfono`, Test URL, con el `01` publicado para ver el aviso de venta grande)

| Línea | Operación | Importe | Estado | Resultado esperado |
|---|---|---|---|---|
| 2 | 004511 | 79,90 | APROBADA | **Ya registrada en la tienda** (venta 253) |
| 3 | 004512 | 18,95 | APROBADA | **Ya registrada en la tienda** (venta 254; es el primer 18,95 por hora) |
| 4 | 004513 | 45,00 | APROBADA | **Se crea** |
| 5 | 004514 | 32,00 | DENEGADA | No importada: `DENEGADA` |
| 6 | 004515 | 14,90 | APROBADA | **Se crea**: la 255 es `efectivo` y no cuenta |
| 7 | 004516 | 18,95 | APROBADA | **Se crea**: segundo cobro de 18,95 y en la app solo hay uno con tarjeta |
| 8 | 004517 | 129,90 | APROBADA | **Se crea** y dispara el aviso de venta grande (umbral 100) |
| 9 | 004518 | 6,50 | ANULADA | No importada: `ANULADA` |
| 10 | 004519 | -18,95 | DEVOLUCION | No importada: `DEVOLUCION` (no cuenta para el grupo de 18,95) |
| 11 | 004520 | (vacío) | APROBADA | No importada: fila no válida, sin `importe` |

Resumen esperado:
- **4 ventas creadas** (`tarjeta`, `fecha` `2026-10-21`, `Datáfono op. 004513`, `004515`, `004516` y `004517`), por **208.75 €**;
- 0 ya importadas;
- **2 ya registradas en la tienda**;
- **4 no importadas**;
- 0 rechazadas;
- 0 en la app sin cobro en el datáfono.

Asunto: «Datáfono del 21/10/2026: 4 ventas creadas». Llega también «Venta grande: 129.90 €» del `01`, con el concepto `Datáfono op. 004517`.

**Prueba 2 · segunda ejecución con el mismo CSV** (formulario otra vez)

**0 ventas creadas**: 4 ya importadas (las de la prueba 1), 2 ya registradas en la tienda y 4 no importadas. Asunto «Datáfono del 21/10/2026: 0 ventas creadas». No llega ningún aviso de venta grande.

**Prueba 3 · CSV con una fila mal**

Una copia del CSV con la línea 4 cambiada a `21/13/2026;12:05;004513;**** 5520;45,00;APROBADA` (mes 13):
- la operación `004513` sale como «fila no válida (fecha)»;
- todo lo demás, como en la prueba 2 (no se crea nada).
- Va justo después de la 2. Si se hace en una base limpia, se crean solo 3 ventas.

**Prueba 4 · CSV con columnas que faltan** (una copia sin la columna `estado`)
- Por la Test URL, el editor muestra el error de `Revisar los cobros`, «faltan columnas en el CSV: estado», y no se crea nada.
- Con el flujo publicado y la Production URL del formulario, llega además el aviso del `08`.

**Prueba 5 · disparador programado** (sin esperar a las 22:00)
1. Copiar el CSV a la carpeta con el nombre de hoy (`docker compose cp`, sección 3.1).
2. En el editor, **Execute workflow** desde `Cada noche a las 22:00`.
3. Resultado: el mismo informe que la prueba 2 (0 creadas), con origen «programado».
4. Borrar el fichero (`docker compose exec n8n rm /home/node/.n8n-files/datafono/datafono-<hoy>.csv`) y repetir: llega «Datáfono: no ha llegado el CSV del <hoy>».

**Cómo comprobarlo en la app:**
- **Swagger** (`GET /api/ventas?desde=2026-10-21&hasta=2026-10-21`, solo lectura): después de la prueba 1 hay 8 ventas ese día, 6 de ellas con `tarjeta`; después de la prueba 2, las mismas 8.
- **Mailpit:** el informe y el aviso de venta grande.

> **Las pruebas cambian los datos de la app:** las 4 ventas creadas suman 208.75 € a las ventas con tarjeta del 21/10/2026, y lo verán el cierre de ese día y el informe mensual de octubre. Los valores esperados de [specs/07-informe-mensual.md](07-informe-mensual.md) (octubre: 2552.75 €) se calcularon antes. Se recuperan recargando el seed.

**Evidencias previstas:**
- Informe de la primera ejecución en Mailpit: `docs/evidencias/11-hu13-informe-primera.png`
- Informe de la segunda ejecución, 0 creadas: `docs/evidencias/11-hu13-informe-segunda.png`
- Ventas del 21/10/2026 en la app (Swagger o la página de ventas): `docs/evidencias/11-hu13-ventas-en-la-app.png`
- Aviso de venta grande de la operación 004517: `docs/evidencias/11-hu13-aviso-venta-grande.png`
- Ejecución programada con el fichero de la carpeta: `docs/evidencias/11-hu13-programado.png`

## 8. Criterios de aceptación

**HU-13 · Entrada automática de datos**, variante *Datáfono* (README e issue #110; el README pide al menos una variante):

- [ ] *Datáfono:* cada noche se importa el CSV de cobros con tarjeta como ventas, sin duplicar las ya registradas.

Desglose para comprobarlo (del README, nivel Avanzado: «cada noche n8n importa el CSV de cobros con tarjeta y los registra como ventas, sin duplicar las que ya estén»):

- [ ] Hay un Schedule Trigger nocturno que lee el CSV sin intervención (prueba 5).
- [ ] Cada cobro aprobado que no está en la app se registra como venta `tarjeta` con la fecha del cobro (prueba 1).
- [ ] Un cobro ya apuntado en el mostrador no se duplica (prueba 1, operaciones 004511 y 004512).
- [ ] Ejecutarlo otra vez con el mismo CSV no crea nada (prueba 2).
- [ ] Las filas no válidas, denegadas, anuladas o devueltas no se importan y aparecen en el informe (pruebas 1 y 3).

La variante *Apartados desde casa* no se hace.

## 9. Preguntas para la pareja

1. **¿Carpeta persistente (opción D)?** Con la opción A, la carpeta `/home/node/.n8n-files/datafono/` se pierde si se recrea el contenedor de n8n. Montar `./data/datafono` en esa ruta lo resolvería y dejaría el CSV visible en el repo, pero obliga a cambiar `docker-compose.yml`. No se ha cambiado.
2. **Hora frente al cierre diario.** El datáfono va a las 22:00 para ir antes del cierre diario (flujo 5), que todavía no tiene spec. ¿A qué hora irá el cierre? Tiene que ir después.
3. **Devoluciones.** La app no tiene devoluciones; hoy solo se listan en el informe. ¿Quiere Marisa algo más?
