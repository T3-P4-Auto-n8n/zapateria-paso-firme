# Instalación desde cero

Cómo poner en marcha en otro ordenador la app de la tienda, n8n y **todos** los workflows, paso a paso y en este orden. Describe el estado final: los workflows de `dev` (con el `06` y la rama `apartado.vencido` del `01`, de #172) y los de los PR abiertos (#173: `05`; rama `feature/39-hu03-prueba-correos`: `03`). Mientras un PR no esté fusionado, su JSON solo está en su rama.

Qué credencial, tabla y variable usa cada workflow: [docs/credenciales.md](credenciales.md). Cómo funciona la app: [docs/guia-de-la-app.md](guia-de-la-app.md).

## 1. Requisitos

- [Git](https://git-scm.com/) y [Docker Desktop](https://www.docker.com/products/docker-desktop/), instalados y abiertos.
- **Python 3**, para `scripts/flujos.py` y `scripts/datos_demo.py` (solo librería estándar: no hay que instalar nada).
- `curl`, para las pruebas del webhook.
- Opcional: [Node.js](https://nodejs.org/), para el servidor n8n-mcp de Claude Code y las pruebas locales (`node --test tests/...`).
- Para el `03`, una cuenta de [Groq](https://console.groq.com/) (capa gratuita); para el `05`, una cuenta de Google con un documento de Google Sheets.

## 2. Clonar y crear el `.env`

```bash
git clone https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme.git paso-firme
cd paso-firme
cp .env.example .env
```

Editad el `.env` (no se sube a GitHub):

| Variable | Qué poner |
|---|---|
| `API_KEY` | Una clave vuestra, en lugar de la de ejemplo. Es la misma que irá en la credencial `API Tienda` |
| `N8N_WEBHOOK_URL` | Dejad `http://n8n:5678/webhook/tienda` (la Production URL del `01`) |
| `SEED` | `1`, para cargar los datos de ejemplo la primera vez. Las pruebas de las specs cuentan con ellos |

Nunca pongáis valores reales en `.env.example`, en un workflow ni en un documento.

## 3. Levantar los servicios

```bash
docker compose up -d
```

| Servicio | Desde el navegador | Desde dentro de n8n |
|---|---|---|
| App de la tienda | http://localhost:8000 | `http://tienda:8000` |
| Swagger de la API | http://localhost:8000/docs | `http://tienda:8000/docs` |
| n8n | http://localhost:5678 | `http://n8n:5678` |
| Mailpit (correos de prueba) | http://localhost:8025 | SMTP `mailpit`, puerto `1025` |

La primera vez, n8n pide crear una cuenta local (propietario). Las credenciales y los workflows quedan a su nombre.

Dentro de n8n nunca se usa `localhost` para llamar a la app: siempre `http://tienda:8000`.

## 4. Crear las credenciales en n8n

En n8n: **Overview → Credentials → Create credential**. Usad **exactamente** estos nombres: los JSON exportados los llevan, y así es fácil reconocerlas al importar. Los pasos de cada una están en [docs/credenciales.md](credenciales.md#cómo-crear-cada-credencial-en-n8n).

| Nombre | Tipo | Configuración | La usan |
|---|---|---|---|
| `Mailpit` | SMTP | Host `mailpit`, puerto `1025`, sin usuario ni contraseña, SSL/TLS desactivado | Todos los correos (directamente o por `10 · Enviar notificación`) |
| `API Tienda` | Header Auth | Name `X-API-Key`, Value = el `API_KEY` del `.env` | Todas las llamadas a la API |
| `Groq` | Groq API | La API Key de vuestra cuenta de Groq | `03 · Abonos a distancia` |

Si vais a usar `05 · Cierre diario` (PR #173), hace falta una cuarta: **`Google Sheets`** (Google Sheets OAuth2 API), conectada con la cuenta de Google que puede editar el documento del histórico. La conexión OAuth la hace la persona dueña de esa cuenta, desde n8n.

## 5. Data table y carpeta del datáfono

**Data table `Configuración`** (la usa el `01`, HU-09). En n8n: **Overview → Data tables → Create data table**:

1. Nombre `Configuración`, con tilde.
2. Columnas `clave` (String) y `valor` (Number).
3. Una fila: `clave` `umbral_venta_grande`, `valor` `100`.

Las Data tables no se exportan con los workflows: hay que crearla en cada instancia.

**Carpeta del datáfono** (la lee el `11` cada noche). Desde la raíz del repo:

```bash
docker compose exec n8n mkdir -p /home/node/.n8n-files/datafono
```

La carpeta no está en un volumen: si se recrea el contenedor de n8n, hay que volver a crearla ([specs/11-datafono.md](../specs/11-datafono.md), sección 3.1). Para que el `11` encuentre un CSV hoy:

```bash
docker compose cp data/datafono_ejemplo.csv n8n:/home/node/.n8n-files/datafono/datafono-$(date +%F).csv
```

**Documento del cierre diario** (solo para el `05`): un Google Sheets con una pestaña `Cierres` y, en la fila 1, los 17 encabezados de [specs/05-cierre-diario.md](../specs/05-cierre-diario.md), sección 5. Se elige en el nodo `Guardar cierre en Sheets` al importar.

## 6. Importar los workflows, en este orden

Con los servicios en marcha, desde la raíz del repo:

```bash
# 1. Los sub-workflows
python3 scripts/flujos.py importar workflows/10-buscar-apartado.json
python3 scripts/flujos.py importar workflows/10-enviar-notificacion.json
# 2. El Error workflow
python3 scripts/flujos.py importar workflows/08-error-workflow.json
# 3. El webhook de la tienda
python3 scripts/flujos.py importar workflows/01-eventos-tienda.json
# 4. El resto
python3 scripts/flujos.py importar workflows/07-informe-mensual.json
python3 scripts/flujos.py importar workflows/09-migracion-excel.json
python3 scripts/flujos.py importar workflows/11-datafono.json
python3 scripts/flujos.py importar workflows/06-recordatorios-y-vencimientos.json
python3 scripts/flujos.py importar workflows/05-cierre-diario.json                  # PR #173
python3 scripts/flujos.py importar workflows/03-abonos-distancia.json               # rama de HU-03
```

**Por qué este orden:**

- Los nodos **Execute Workflow** (`Enviar confirmación al cliente`, `Leer apartados activos`…) apuntan al sub-workflow **por su id**, y **Settings → Error workflow** apunta al `08` también por id (`z1T27bO8VvzyoL18`).
- `flujos.py importar` usa la CLI de n8n, que **conserva el id** del JSON. Así, `10 · Enviar notificación` tiene en la instancia nueva el mismo id que en la nuestra, y las referencias siguen valiendo sin tocarlas.
- Primero se importa lo que otros usan: los `10` (los llaman el `01`, `06`, `08` y `11`), luego el `08` (Error workflow de casi todos), luego el `01` (recibe los eventos que generan los demás) y después el resto.
- Con **Import from File** desde la interfaz el workflow recibe un id nuevo, y los que lo usan quedan apuntando a un id que no existe. Por eso se importa con el script.
- El `03` y el `05` no traen id en el JSON: n8n les da uno nuevo. No pasa nada, porque nadie los llama.

Si un workflow ya existe con ese id, la importación lo **sobrescribe**.

## 7. Revisar cada workflow después de importar

Los ids de las credenciales y de la Data table son los de nuestra instancia y no existen en la vuestra. Abrid cada workflow y revisad:

- **Credenciales:** cada nodo de la columna «Credenciales en sus nodos» de [docs/credenciales.md](credenciales.md#workflow--credenciales) tiene su credencial elegida (si sale vacía o en rojo, elegidla en el desplegable).
- **Settings → Error workflow:** `08 · Error Workflow` en todos menos el `08` y los dos `10`, que no llevan ninguno a propósito ([specs/10-sub-workflows.md](../specs/10-sub-workflows.md), sección 1).
- **Sub-workflows:** los Execute Workflow muestran `10 · Buscar apartado` o `10 · Enviar notificación` (en n8n aparecen como «Execute Sub-workflow»).
- Guardad cada workflow después de cambiar algo.

| Workflow | Qué revisar además |
|---|---|
| `01 · Eventos de la tienda` | `Leer umbral de venta grande`: volver a elegir la tabla `Configuración` (el id del JSON es el de nuestra instancia) |
| `03 · Abonos a distancia` | `Groq`, `API Tienda` y `Mailpit` en sus nodos (el JSON no trae ids). `Correo bancario IMAP` sigue **deshabilitado**: no lo activéis |
| `05 · Cierre diario` | `Google Sheets` en `Guardar cierre en Sheets`, y en ese nodo vuestro documento y la pestaña `Cierres` (matching column `fecha`). `API Tienda` y `Mailpit`: el JSON no trae ids |
| `06 · Recordatorios y vencimientos` | `Leer apartados activos` → `10 · Buscar apartado`; `Enviar lista a la tienda` → `10 · Enviar notificación` |
| `07`, `09`, `11` | Solo lo general |
| `08 · Error Workflow` | `Avisar a la tienda del error` → `10 · Enviar notificación` |
| `10 · Buscar apartado`, `10 · Enviar notificación` | Solo las credenciales |

## 8. Qué publicar y qué no

Publicar (**Publish**) es lo que hace funcionar la Production URL del webhook, los Schedule Trigger y el Error Trigger. La CLI puede importar un workflow con el estado que trae el JSON: después de importar, comprobad cuáles están publicados y dejad solo los de esta tabla.

| Workflow | ¿Publicar? | Por qué |
|---|---|---|
| `10 · Buscar apartado`, `10 · Enviar notificación` | **Sí** | Los usan los demás. Así están en nuestra instancia ([specs/10-sub-workflows.md](../specs/10-sub-workflows.md)) |
| `08 · Error Workflow` | **Sí** | Sin publicar no avisa de ningún error |
| `01 · Eventos de la tienda` | **Sí** | La app envía los eventos a la Production URL; sin publicar, n8n responde 404 y el aviso se pierde. **Excepción:** despublicarlo mientras se ejecuta la migración (`09`) |
| `11 · Datáfono` | **Sí** | Su decisión: lee el CSV de lunes a sábado a las 22:00 ([AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)). Sin CSV del día, avisa a la tienda de que falta |
| `07 · Informe mensual` | **Sí**, cuando se quiera el informe automático | El día 1 a las 8:00 envía el del mes anterior. Solo lee de la API |
| `05 · Cierre diario` | **Después** de conectar `Google Sheets` y probarlo | Cada noche a las 00:05 cierra el día anterior y escribe en el documento. La spec deja la publicación a la pareja |
| `06 · Recordatorios y vencimientos` | **Todavía no** | A las 9:00 vencería **de verdad** los apartados fuera de plazo, entre ellos el 16, que la prueba de HU-03 (`06_bizum_paula.eml`) necesita `activo`. Se publica cuando se hayan hecho las pruebas de HU-03 ([spec del `06`](../specs/06-recordatorios-vencimientos.md), nota de alcance) |
| `03 · Abonos a distancia` | **No** | Se prueba por la Test URL de su formulario; la entrada IMAP está deshabilitada |
| `09 · Migración del Excel` | **No** | Se ejecuta una vez, por la Test URL del formulario ([specs/09-migracion-excel.md](../specs/09-migracion-excel.md)) |

## 9. Pruebas de humo

Una prueba rápida por workflow, para saber que está bien instalado. Los correos se ven en Mailpit (http://localhost:8025). Las pruebas completas están en la sección 7 de cada spec. **Las que cambian datos de la app** (⚠️) necesitan antes una copia de la base de datos (sección 10).

| Workflow | Prueba | Qué debe llegar a Mailpit | Pruebas completas |
|---|---|---|---|
| `01` y `10 · Enviar notificación` | `curl -X POST http://localhost:5678/webhook/tienda -H "Content-Type: application/json" -d @tests/payloads/apartado.creado.json` (Production URL, con el `01` publicado) | A `carmen@example.com`, «Tu apartado en Paso Firme: Botín piel marrón» | [specs/01-eventos-tienda.md](../specs/01-eventos-tienda.md#7-prueba) |
| `08` | El mismo `curl` con `tests/payloads/error-email-espacio.json` | A `tienda@pasofirme.example`, «Ha fallado el flujo «01 · Eventos de la tienda»», con el paso, el error y el enlace a la ejecución | [specs/08-error-workflow.md](../specs/08-error-workflow.md#7-prueba) |
| `10 · Buscar apartado` | En el editor, **Pin data** `{ "id": 22 }` en `Al buscar un apartado` y **Execute workflow** | Nada: la salida es `total` 1, con el apartado 22 `vencido` | [specs/10-sub-workflows.md](../specs/10-sub-workflows.md#7-prueba) |
| `07` | **Execute workflow** → formulario `Elegir mes` con un día del mes pasado | A la tienda, «Informe de <mes> de <año>: … € recaudados», con la tabla | [specs/07-informe-mensual.md](../specs/07-informe-mensual.md#7-prueba) |
| `05` | **Execute workflow** → formulario `Elegir día` con la fecha de ayer | A la tienda, «Cierre de <fecha>: … € recaudados», y una fila de esa fecha en `Cierres` | [specs/05-cierre-diario.md](../specs/05-cierre-diario.md#7-prueba) |
| `03` | **Execute workflow** → `Formulario de desarrollo` con el asunto y el cuerpo de `data/correos/07_transferencia_desconocido.eml` | A la tienda, el aviso para revisar el pago (cliente desconocido). No se registra nada | [specs/03-abonos-distancia.md](../specs/03-abonos-distancia.md#7-prueba-tabla-de-decisión-de-los-nueve-correos) |
| ⚠️ `11` | **Execute workflow** → formulario `Subir el CSV del datáfono` con `data/datafono_ejemplo.csv` | A la tienda, «Datáfono del 21/10/2026: … ventas creadas» y, del `01`, «Venta grande: 129.90 €» | [specs/11-datafono.md](../specs/11-datafono.md#7-prueba) |
| ⚠️ `06` | **Execute workflow** desde `Probar a mano` | A la tienda, «Vencimientos del <hoy>: … pares vuelven a la venta» y, del `01`, un vale a cada cliente con email | [specs/06-recordatorios-vencimientos.md](../specs/06-recordatorios-vencimientos.md#7-prueba) |
| ⚠️ `09` | Con el `01` **despublicado**: **Execute workflow** → formulario `Subir el Excel` con los dos CSV de `data/` | A la tienda, el informe de la migración | [specs/09-migracion-excel.md](../specs/09-migracion-excel.md#7-prueba) |

**De extremo a extremo** (⚠️, crea datos): con el `01` publicado, `python3 scripts/datos_demo.py` crea 2 apartados, 2 abonos y una venta por la API, y la app envía los eventos reales al `01`.

## 10. Base de datos: copia, restauración y datos de ejemplo

Las pruebas que crean o vencen apartados, abonos o ventas cambian la base de datos de la app para siempre (la API no borra). Antes, una copia fuera del repo:

```bash
docker compose cp tienda:/data/tienda.db ~/tienda-antes.db
```

Al terminar, se restaura y se reinicia la app:

```bash
docker compose cp ~/tienda-antes.db tienda:/data/tienda.db
docker compose restart tienda
```

La app no vuelve a cargar los datos de ejemplo, porque la base de datos no está vacía. Es el procedimiento de las pruebas de HU-07, HU-10 y HU-13.

**Volver a cargar los datos de ejemplo** (con `SEED=1`): la app los carga al arrancar si la base de datos está vacía (`backend/main.py`). Para empezar de cero **solo con la app**, sin perder n8n:

```bash
docker compose exec tienda rm /data/tienda.db
docker compose restart tienda
```

Las fechas de los datos de ejemplo son **relativas al día en que se cargan**: los apartados fuera de plazo y las cifras esperadas de las specs cambian. `docker compose down -v` también recarga los datos de ejemplo, pero **borra n8n** (workflows, credenciales y Data tables) y habría que repetir desde el paso 3.

## 11. Problemas frecuentes

- **Test URL o Production URL.** La Test URL (`/webhook-test/tienda`, `/form-test/...`) solo funciona mientras el editor escucha (**Listen for test event** o **Execute workflow**), y solo para un evento. La Production URL (`/webhook/tienda`, `/form/...`) solo funciona con el workflow publicado; si no, 404, y el aviso de la app se pierde sin reintentos. El `08` **solo salta en ejecuciones de producción**: un error por la Test URL se ve en el editor, pero no llega el correo. Para ver los eventos de la app por la Test URL, cambiad `N8N_WEBHOOK_URL` en el `.env`, `docker compose up -d`, y al terminar volved a `/webhook/tienda` ([docs/guia-de-la-app.md](guia-de-la-app.md#test-url-y-production-url)).
- **El formulario de prueba solo vale una vez.** Por la Test URL, cada envío del formulario necesita volver a pulsar **Execute workflow** y usar la pestaña nueva.
- **Execute step o Execute workflow con varios disparadores.** En los workflows con Schedule Trigger y formulario (`05`, `06`, `07`, `11`), **Execute step** en el Schedule Trigger solo ejecuta ese nodo. Para probar la rama programada entera, elegid el disparador en el desplegable de **Execute workflow**.
- **`docker compose` desde un worktree.** Docker Compose llama al proyecto como la carpeta (`paso-firme`, con los volúmenes `paso-firme_n8n_data` y `paso-firme_tienda_data`). Desde un `git worktree` en otra carpeta, `docker compose` usa otro proyecto: `up -d` crearía otra app y otro n8n vacíos (o fallaría con los puertos ocupados), y `flujos.py` (que ejecuta `docker compose` en la raíz del worktree) no encontraría el contenedor. Además, el worktree no tiene el `.env`. Ejecutad `docker compose` y los scripts desde la carpeta principal, o fijad el proyecto: `COMPOSE_PROJECT_NAME=paso-firme python3 scripts/flujos.py exportar`.
- **Los Workflow Inputs son de una línea.** En un Execute Workflow, los campos de **Workflow Inputs** pierden los saltos de línea al pegar o al pulsar Enter, y el correo llega en una sola línea. El `texto` de varias líneas se escribe como **una sola expresión con `\n`** ([specs/10-sub-workflows.md](../specs/10-sub-workflows.md), sección 4.4).
- **El export reescribe workflows de otras ramas.** `flujos.py exportar` exporta **todos** los workflows de n8n. Si en n8n hay un cambio de otro PR sin fusionar (nos pasó con el `01`), el export lo escribe también en la rama actual. Antes de hacer commit, mirad `git status` y descartad lo que no sea de la tarea: `git restore workflows/01-eventos-tienda.json`.
- **Después de importar, una credencial en rojo** o «Workflow not found» en un Execute Workflow: la credencial o el sub-workflow tienen otro id en vuestra instancia. Elegidlos de nuevo en el nodo (sección 7), o importad los `10` antes que el resto (sección 6).
- **`docker compose exec n8n rm ...` pide confirmación** (`y`).
