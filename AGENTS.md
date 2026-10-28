# AGENTS.md · Zapatería Paso Firme

Contexto que todo agente de IA debe leer antes de trabajar en este repositorio.

## 1. Proyecto y rol del agente

Automatizamos con **n8n** todo lo que pasa alrededor de la app de la tienda Paso Firme (avisos a clientes, vencimientos, cierres de caja, informes). El enunciado completo está en el [README](README.md).

**El agente propone; la pareja revisa, prueba y decide.** Nada pasa a producción sin revisión humana en una PR.

## 2. Negocio

- Un **apartado** es un solo par (modelo + talla). Se crea con un abono inicial de **mínimo 5 €** y no más que el precio.
- Plazo: `fecha_limite` = fecha del apartado **+ 90 días**.
- Se admiten abonos de cualquier importe, **nunca más de lo `pendiente`** y solo si el apartado está `activo` y dentro de plazo.
- Cuando `pendiente` llega a 0 €, la app lo pasa sola a `liquidado`.
- Si vence el plazo sin liquidar, **n8n** llama a `POST /api/apartados/{id}/vencer` y la app genera un **vale** con lo abonado. La app no vence los apartados sola.
- `forma_pago` solo admite `efectivo`, `tarjeta` o `bizum` (por defecto, `efectivo`).

**Fuente de verdad del vocabulario:** [docs/ontologia.md](docs/ontologia.md) (entidades, campos, estados, quién calcula cada dato). Detalles de la API y del webhook: [docs/guia-de-la-app.md](docs/guia-de-la-app.md).

## 3. Servicios y URLs

| Servicio | Desde el navegador | Desde dentro de n8n |
|---|---|---|
| App de la tienda y API | http://localhost:8000 | `http://tienda:8000` |
| Swagger | http://localhost:8000/docs | `http://tienda:8000/docs` |
| n8n | http://localhost:5678 | `http://n8n:5678` |
| Mailpit (correos de prueba) | http://localhost:8025 | SMTP host `mailpit`, puerto `1025`, sin usuario ni contraseña, SSL/TLS desactivado |

- **Dentro de n8n nunca se usa `localhost`** para llamar a la app: se usa `http://tienda:8000`.
- **Autenticación:** toda petición a `/api/...` lleva la cabecera `X-API-Key`. En n8n se configura una vez como credencial **Header Auth** (Name `X-API-Key`) y se elige en cada nodo HTTP Request. Sin ella, `401`.
- **Webhook:** la app envía `POST` a `/webhook/tienda` con `{ "evento": ..., "datos": ... }`. En n8n los datos llegan dentro de **`$json.body`** (`{{ $json.body.evento }}`, `{{ $json.body.datos.estado }}`). Un único webhook reparte los eventos con un Switch.
- **Test URL vs Production URL:**
  - Test URL (`/webhook-test/tienda`): solo funciona mientras se escucha un evento de prueba en el editor.
  - Production URL (`/webhook/tienda`): la que usa la app; solo funciona si el flujo está publicado. Si no, n8n responde 404 y el aviso se pierde (no hay reintentos).

## 4. Estructura del repo

| Carpeta | Contenido |
|---|---|
| `workflows/` | Flujos exportados de n8n en JSON |
| `specs/` | Una spec por flujo, a partir de [specs/_plantilla.md](specs/_plantilla.md) |
| `docs/` | Guía de la app, ontología, bitácora de IA (`docs/ai-log.md`) |
| `tests/payloads/` | Payloads de prueba para los webhooks y las specs |
| `backend/`, `frontend/` | La app de la tienda (no se toca, ver sección 9) |
| `data/` | CSV del Excel antiguo y correos del banco de ejemplo |

## 5. Convenciones de nombres

- **Ramas:** `feature/`, `docs/`, `fix/` o `chore/`, siempre creadas desde `dev`. Las PR van **siempre a `dev`**. A `main` solo se llega desde `dev` al cerrar un nivel.
- **Flujos en n8n:** cada workflow se numera por el flujo más bajo que contiene: `01 · Eventos de la tienda` (webhook + Switch; flujos 1, 2, 4 y aviso de vencido), `03 · Abonos a distancia`, `05 · Cierre diario`, `06 · Recordatorios y vencimientos`, `07 · Informe mensual`, `08 · Error Workflow` y `09 · Migración del Excel`. Los sub-workflows reutilizables (no son flujos del README) llevan el `10`: `10 · Buscar apartado` y `10 · Enviar notificación` ([specs/10-sub-workflows.md](specs/10-sub-workflows.md)). El datáfono de HU-13 (tampoco es un flujo del README) lleva el `11`: `11 · Datáfono` ([specs/11-datafono.md](specs/11-datafono.md)).
- **Nodos:** nombres descriptivos en español, por ejemplo `Buscar apartado por id`.
- **Specs:** `specs/NN-nombre.md` · **Workflows:** `workflows/NN-nombre.json` (mismo `NN` que el flujo).
- **Commits y PRs:** en inglés, con Conventional Commits (`docs: ...`, `feat: ...`, `fix: ...`, `chore: ...`). La documentación del proyecto (specs, `docs/`, `AGENTS.md`) sigue en español.

## 6. Forma de trabajo

1. **Primero la spec, luego el flujo.** Cada flujo empieza con su spec en `specs/` usando la plantilla.
2. **Una tarea = una rama = una PR** con el JSON exportado del flujo.
3. Cada flujo tiene datos de prueba y resultado esperado; si la prueba falla, se arregla el flujo, no la prueba.
4. Registrar los prompts relevantes y las decisiones (qué se aceptó, qué se rechazó y por qué) en `docs/ai-log.md`.

### Herramientas del agente

- **n8n-mcp** (configurado en [`.mcp.json`](.mcp.json)) en **modo solo documentación**: sin API key, no se conecta a n8n ni puede crear ni publicar flujos.
- Se usa para:
  - consultar nodos y parámetros antes de escribir una spec;
  - validar los JSON de `workflows/` con `validate_workflow` antes de abrir una PR.
- Al abrir el proyecto, Claude Code pide aprobar el servidor.

## 7. Importar y exportar flujos

**Desde la interfaz de n8n:** menú del flujo → *Import from File* para importar y *Download* para exportar. Guardar el JSON en `workflows/`.

**Con el script [`scripts/flujos.py`](scripts/flujos.py)** (usa la CLI de n8n dentro del contenedor):

```bash
python3 scripts/flujos.py exportar                       # todos los flujos -> workflows/
python3 scripts/flujos.py importar workflows/NN-nombre.json
```

- `exportar` renombra cada archivo según su nombre en n8n (`01 · Eventos de la tienda` → `01-eventos-tienda.json`: minúsculas, sin tildes, sin `de`/`la`/`del`, con guiones), guarda solo las claves de la descarga desde la interfaz (`name`, `nodes`, `connections`, `settings`, `meta`, `tags`, `active`, `id`, `versionId`; sin `pinData` ni `shared`, que lleva el nombre y el email del propietario) y omite los flujos que no empiezan por `NN · ` y los archivados.
- Solo librería estándar de Python; no hace falta instalar nada.

Antes de subir un JSON, revisar el diff: sin claves ni datos personales reales.

## 8. Decisiones tomadas

| Decisión | Motivo | Estado |
|---|---|---|
| Las transferencias bancarias se registran con `forma_pago` `"bizum"` | La app no acepta `"transferencia"` (devuelve `422`) | Confirmada por el profesor |
| Un abono de un cliente sin email no envía nada (ni al cliente ni a la tienda) | En un abono el cliente está en contacto con la tienda; avisar a la tienda en cada abono la llenaría de correos | Tomada |
| Los apartados y abonos del Excel se registran con la forma de pago del CSV de ventas cuando el mismo pago aparece allí (misma fecha e importe); si no, `efectivo` | El CSV de apartados no la indica; `efectivo` es el valor por defecto de la app. El informe indica de dónde sale cada una | Tomada |
| Se migran también las ventas, salvo las filas de abono y el TOTAL | README: los dos CSV son para la migración; las filas de abono ya están en el CSV de apartados y el TOTAL no es una venta | Tomada |
| Un abono cuyo apartado no se pudo cargar también va al informe como dudoso | Sin su apartado no se puede registrar, y Marisa decide qué hacer | Tomada |
| El umbral de venta grande se guarda en una Data table de n8n (`Configuración`) | Las Variables de n8n requieren licencia de pago | Tomada |
| En el informe mensual, un apartado cuenta como liquidado en el mes de la `fecha` de su último abono | La app no guarda la fecha de liquidación; un apartado `liquidado` no admite más abonos, así que su último abono es el que lo liquidó | Tomada |
| En el informe mensual, un apartado cuenta como vencido en el mes de la `fecha` de su vale | La app no guarda la fecha de vencimiento; el vale se genera el día en que n8n lo vence. La `fecha_limite` es el plazo, no el día en que venció | Tomada |
| El informe mensual se prueba con un Form Trigger con un campo Date `mes`, además del Schedule Trigger del día 1 | Permite pedir cualquier mes sin editar el flujo ni esperar al día 1; mismo patrón que la migración del Excel | Tomada |
| El informe mensual va en una tabla HTML en el correo, no en PDF | El README admite las dos; se ve directamente en el correo y no necesita nodos ni servicios para generar el PDF | Tomada |
| Los dos sub-workflows comparten el número `10` (`10 · Buscar apartado`, `10 · Enviar notificación`) | No son flujos del README, así que no tienen número propio; salen de la misma tarea (#92) y de la misma spec (`specs/10-sub-workflows.md`), y el `09` ya es la migración del Excel | Tomada |
| `Buscar apartado` devuelve siempre un solo item `{ total, apartados }`; 0 resultados no es un error | Un nodo sin items corta el flujo que llama; con `total` el que llama decide en un IF | Tomada |
| `Buscar apartado` para con error si no recibe `id`, `texto` ni `estado` | Sin filtros devolvería todos los apartados con los datos de todos los clientes (riesgo en el asistente de Telegram, HU-11 y HU-14) | Tomada |
| `Buscar apartado` busca un número de apartado con `GET /api/apartados/{id}` y no con `q` | `q` también encuentra los teléfonos que contienen ese número | Tomada |
| Los sub-workflows no tienen Error workflow: sus errores los avisa el `08` del flujo que llama | Así no hay avisos duplicados, y `Enviar notificación` no puede llamarse a sí mismo a través del `08` si falla | Tomada |
| `Enviar notificación` no decide qué hacer si el cliente no tiene email; para con error si falta `para` o `asunto` | Cada flujo tiene su regla (HU-01 avisa a la tienda; HU-02 no envía nada); el error es solo una red de seguridad | Tomada |
| Cada llamada a un sub-workflow es una sola petición: el Execute Workflow que llama usa siempre **Mode: Run once for each item** | Los Code de los sub-workflows solo leen el primer item; con Run once with all items y varios items, los demás se perderían sin error (por ejemplo, los recordatorios del flujo 6) | Tomada |
| HU-13 se hace solo con la variante *Datáfono*, numerada `11 · Datáfono` (`specs/11-datafono.md`, `workflows/11-datafono.json`) | El README pide al menos una de las dos variantes. No es uno de los flujos 1–8; el `09` y el `10` ya están ocupados | Tomada |
| El CSV del datáfono se lee cada noche (lunes a sábado, 22:00) de `/home/node/.n8n-files/datafono/datafono-AAAA-MM-DD.csv` con Read/Write Files from Disk; un Form Trigger sirve para probar y repetir un día | Es la carpeta que n8n 2.x deja leer por defecto, así que no hay que tocar `docker-compose.yml`. Va antes del cierre diario para que este incluya lo importado. La carpeta no es persistente (pregunta abierta en la spec) | Tomada |
| Un cobro del datáfono ya está en la app si hay una venta `Datáfono op. <operacion>` de la misma `fecha`, o, si no, contando por `fecha` + `importe` las ventas `tarjeta` apuntadas a mano frente a los cobros del CSV | La app no guarda el nº de operación. Con el `concepto` se reconoce lo importado; con el recuento, dos cobros iguales el mismo día no se pierden. Una segunda ejecución no crea nada | Tomada |
| Las ventas creadas desde el datáfono llevan el `concepto` `Datáfono op. <operacion>` y disparan el aviso de venta grande como cualquier otra | El datáfono no sabe qué se vendió. El aviso de una venta grande es lo esperado: es una venta real que quizá no se apuntó | Tomada |
| El `08` envía su aviso con `Enviar notificación` | Lo pide #92 y el `08` no lo toca ningún PR abierto; si el sub-workflow falla, el aviso se pierde igual que hoy si falla su Send Email | Tomada (probada con la prueba de HU-05) |
| Retry On Fail (3 intentos, 2 s) solo en los HTTP Request `GET`; nunca en los `POST` (#56) | Un `GET` repetido no cambia nada. Un `POST` que llegó a la app pero cuya respuesta se perdió crearía un abono, una venta o un apartado duplicado, o vencería otra vez. Si los 3 intentos fallan, el nodo falla y lo avisa el `08`. Un `401` también se reintenta: es inofensivo (2 esperas de 2 s). En `10 · Buscar apartado` (Never Error) solo se reintentan los errores de red. Ver [specs/08-error-workflow.md](specs/08-error-workflow.md#reintentos) | Tomada |
| HU-07 se reparte en dos workflows: el `06 · Recordatorios y vencimientos` vence los apartados y envía la lista a la tienda; el `01` envía el vale al cliente desde la salida `apartado.vencido` del Switch. En el `06` solo va, de momento, la rama de vencimientos; los recordatorios (HU-06) los añade Beste en el mismo workflow | El webhook `apartado.vencido` ya trae el apartado y el vale, como los demás avisos al cliente. Así el cliente recibe su vale aunque el apartado se venza por otra vía (Swagger o `curl`), y el `06` no envía dos veces lo mismo | Tomada |
| El `06` se ejecuta todos los días a las 9:00 y vence los apartados `activo` con `fecha_limite` anterior a hoy (`Europe/Madrid`); el de `fecha_limite` igual a hoy todavía no | Es la misma regla que la app (`422` «no vence hasta…» si hoy ≤ `fecha_limite`). Por la mañana n8n y la app tienen el mismo «hoy», y no se cruza con el datáfono ni con el cierre, que son por la noche. Todos los días, porque los recordatorios de HU-06 no pueden saltarse el domingo | Tomada |
| Un día sin apartados vencidos, el `06` no envía nada a la tienda | La lista es para actuar; un correo diario vacío acostumbraría a Marisa a no abrirlos. Los fallos los avisa el `08` | Tomada |
| Un apartado vencido de un cliente sin email avisa a la tienda con el teléfono y el vale (como HU-01, no como HU-02) | Un vencimiento ocurre sin el cliente delante; si nadie le avisa, no sabe que tiene un vale | Tomada |

## 9. Lo que el agente NO debe hacer

- Escribir claves, tokens o contraseñas en los flujos, en el repo o en los mensajes, ni copiar el contenido de `.env`.
- Activar o publicar flujos.
- Recalcular `abonado` o `pendiente`: se usan siempre los que da la app.
- Dejar que la IA decida en el flujo 3: la IA solo extrae ordenante, importe y concepto; las decisiones las toma el flujo con la API.
- Hacer push a `main` o `dev`, ni mergear PRs.
- Modificar `backend/` o `frontend/` sin que la pareja lo pida.
- Inventar entidades o campos que no estén en [docs/ontologia.md](docs/ontologia.md).
- Enviar a modelos externos más datos personales de los imprescindibles.
