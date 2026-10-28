# Credenciales y variables

Qué credenciales y variables necesita cada workflow. **Aquí nunca se escriben valores**: las claves viven solo en el `.env` (que no se sube a GitHub) y en las credenciales de n8n.

## Credenciales de n8n

| Credencial | Tipo en n8n | Configuración (sin valores secretos) | Para qué |
|---|---|---|---|
| `Mailpit` | SMTP | Host `mailpit`, puerto `1025`, sin usuario ni contraseña, SSL/TLS desactivado | Enviar correos de prueba en local (se ven en http://localhost:8025) |
| `API Tienda` | Header Auth | Name `X-API-Key`, Value = `API_KEY` del `.env` | Llamar a la API de la app (`http://tienda:8000/api/...`) |
| `Groq` | Groq API | API Key de Groq | Modelo de IA en los nodos de IA (`03 · Abonos a distancia`) |
| `Panel Marisa` | Basic Auth | User y Password que elige la pareja; solo viven en n8n | Proteger la página de `12 · Panel de Marisa`: el navegador los pide al abrir `/webhook/panel` (HU-15) |

`03 · Abonos a distancia` tiene además un nodo `Correo bancario IMAP` **deshabilitado y sin credencial**: hoy se prueba con el formulario. Hará falta una credencial IMAP cuando se active la entrada por correo.

## Workflow → credenciales

Inventario basado en los workflows de `dev` (incluidos `06`, la rama `apartado.vencido` del `01` de #172 y `03` de #182) y el workflow HU-04 de esta rama (#173), pendiente de revisión. Sacado de los JSON exportados: la credencial de cada nodo, los sub-workflows que llama cada uno y su **Settings → Error workflow**.

| Workflow | Credenciales en sus nodos | A través de sub-workflows | Data tables, archivos y documentos | Variables del `.env` | Error workflow |
|---|---|---|---|---|---|
| `01 · Eventos de la tienda` | `Mailpit` (`Enviar recibo del abono`, `Avisar de que puede recoger`, `Avisar a la tienda: venta grande`) | `Mailpit`, por `10 · Enviar notificación` (`Enviar confirmación al cliente`, `Avisar a la tienda: sin email`, `Enviar vale al cliente` y `Avisar a la tienda: vencido sin email`) | Data table `Configuración`, nodo `Leer umbral de venta grande` | `N8N_WEBHOOK_URL`: la app envía los eventos a su webhook (Production URL `/webhook/tienda`). No usa `API_KEY`: el webhook no lleva autenticación | `08` |
| `03 · Abonos a distancia` | `API Tienda` (`Buscar apartado`, `Registrar abono`), `Groq` (`Extraer datos con Groq`), `Mailpit` (`Avisar a la tienda para revisar el pago`) | — (no llama a los `10`) | — | `API_KEY` (por `API Tienda`). Un abono registrado dispara `abono.registrado` y el recibo lo envía el `01` (HU-02), así que depende de `N8N_WEBHOOK_URL` | `08` |
| `05 · Cierre diario` | `API Tienda` (`Leer ventas del día`, `Leer abonos del día`), `Mailpit` (`Enviar cierre diario`) | — | Data table local `Cierres`, upsert por `fecha`, 17 columnas (spec del `05`, sección 5) | `API_KEY` (por `API Tienda`) | `08` |
| `06 · Recordatorios y vencimientos` | `API Tienda` (`Vencer apartado`) | `API Tienda`, por `10 · Buscar apartado` (`Leer apartados activos`); `Mailpit`, por `10 · Enviar notificación` (lista de vencimientos, recordatorio al cliente y aviso sin email) | Data table `recordatorios enviados` (HU-06), columnas apartado_id Number, dias Number, fecha String | `API_KEY` (por `API Tienda`). Los vencimientos disparan `apartado.vencido`; el vale lo envía el `01` vía `N8N_WEBHOOK_URL` | `08` |
| `07 · Informe mensual` | `API Tienda` (`Leer ventas del mes`, `Leer abonos desde el día 1`, `Leer apartados`, `Leer vales`), `Mailpit` (`Enviar informe mensual`) | — | — | `API_KEY` (por `API Tienda`) | `08` |
| `08 · Error Workflow` | — | `Mailpit`, por `10 · Enviar notificación` (`Avisar a la tienda del error`) | — | — | ninguno (es el Error workflow) |
| `09 · Migración del Excel` | `API Tienda` (los 3 `Leer … de la app`, `Crear apartados`, `Registrar abonos`, `Registrar ventas`, `Comprobar pendientes`), `Mailpit` (`Enviar informe de migración`) | — | Los dos CSV de `data/`, subidos en el formulario | `API_KEY` (por `API Tienda`). Lo que crea dispara eventos: el `01` tiene que estar **despublicado** durante la migración (spec del `09`) | `08` |
| `10 · Buscar apartado` | `API Tienda` (`Leer apartado por número`, `Buscar apartados por texto`) | — | — | `API_KEY` (por `API Tienda`) | ninguno: lo avisa el `08` del flujo que llama |
| `10 · Enviar notificación` | `Mailpit` (`Enviar correo en HTML`, `Enviar correo de texto`) | — | — | — | ninguno: lo avisa el `08` del flujo que llama |
| `11 · Datáfono` | `API Tienda` (`Leer ventas de esos días`, `Registrar ventas`) | `Mailpit`, por `10 · Enviar notificación` (`Enviar informe del datáfono`, `Avisar de que falta el CSV`) | Carpeta `/home/node/.n8n-files/datafono/` del contenedor de n8n, con `datafono-AAAA-MM-DD.csv` (spec del `11`, sección 3.1) | `API_KEY` (por `API Tienda`). Cada venta creada dispara `venta.registrada` (aviso de venta grande del `01`) | `08` |
| `12 · Panel de Marisa` | `Panel Marisa` (`Abrir el panel`, Basic Auth del Webhook), `API Tienda` (`Leer ventas del mes`, `Leer abonos del mes`, `Leer apartados activos`) | — (no llama a los `10`) | — | `API_KEY` (por `API Tienda`). Solo hace `GET`: no dispara eventos | `08` |

**Lo que no está en el `.env`:** la zona horaria (`TZ` y `GENERIC_TIMEZONE` = `Europe/Madrid`) va fija en `docker-compose.yml`, y cada workflow con fechas la fija también en **Settings → Timezone**. `SEED` no la usa ningún workflow, pero las pruebas de las specs cuentan con los datos de ejemplo (`SEED=1`).

Cómo ponerlo todo en marcha en otro ordenador, en orden: [docs/instalacion.md](instalacion.md).

## Variables del `.env`

Las usa la app (servicio `tienda` en `docker-compose.yml`). Se copian de `.env.example` con `cp .env.example .env`.

| Variable | Para qué | Relación con n8n |
|---|---|---|
| `API_KEY` | Clave que la app exige en la cabecera `X-API-Key` | Tiene que coincidir con el Value de la credencial `API Tienda` |
| `N8N_WEBHOOK_URL` | Dirección a la que la app envía los avisos. Vacía = no envía ninguno | Production URL del webhook de `01 · Eventos de la tienda` (`/webhook/tienda`); para pruebas, Test URL (`/webhook-test/tienda`) |
| `SEED` | `1` = carga datos de ejemplo la primera vez que arranca la app; `0` = arranca vacía | — |

## Data tables de n8n

Configuración que cambia Marisa sin editar los flujos. Usamos Data tables porque las Variables de n8n (`$vars`) están bloqueadas en nuestra versión community («Upgrade to unlock variables»); ver [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas).

### Configuración

| Columna | Tipo | Para qué |
|---|---|---|
| `clave` | String | Nombre del ajuste |
| `valor` | Number | Valor del ajuste |

| `clave` | `valor` inicial | La usa |
|---|---|---|
| `umbral_venta_grande` | `100` | `01 · Eventos de la tienda`, nodo `Leer umbral de venta grande` (HU-09): avisa de las ventas con `importe` **mayor** que este valor |

**Cómo crearla:** en n8n, **Overview → Data tables → Create data table**, nombre `Configuración` (exactamente así), columnas `clave` (String) y `valor` (Number). Después, añadir la fila `umbral_venta_grande` · `100`. Para cambiar el umbral, se edita `valor` en esa fila; el flujo no se toca.

### Cierres

El flujo `05 · Cierre diario` guarda un registro por fecha. Crear una tabla llamada `Cierres` con las 17 columnas definidas en [la spec de HU-04](../specs/05-cierre-diario.md): `fecha` (String), columnas de importes y operaciones (Number), y `sin_movimientos` (Boolean). No necesita credential ni filas iniciales. El nodo usa Upsert por `fecha`.

> **Las Data tables no se exportan con el JSON del workflow.** Al importar `workflows/01-eventos-tienda.json` en otra instancia (por ejemplo, la de la pareja), hay que crear antes la tabla `Configuración` con su fila y volver a elegirla en el nodo `Leer umbral de venta grande`. Si no, el nodo da error y lo avisa el `08`.

### recordatorios enviados (HU-06)

Overview → Data tables → Create data table → nombre exacto **recordatorios enviados**. Columnas:

| Columna | Tipo | Uso |
|---|---|---|
| `apartado_id` | Number | ID de la app |
| `dias` | Number | 7 o 1 |
| `fecha` | String | Día del envío AAAA-MM-DD en Europe/Madrid |

Dejar vacía al crearla. n8n añade sus columnas internas, no crearlas manualmente. No guardar nombres, teléfonos ni emails. `Leer recordatorios enviados`: Row Get, sin filtros, Return All ON, Execute Once ON, Always Output Data ON. `Registrar recordatorio enviado`: Row Insert, tras envío exitoso, Execute Once OFF. La pareja debe volver a seleccionar la tabla en ambos nodos al importar: los datos y la tabla no se exportan con el workflow. Es persistencia local de n8n, sin credencial Google OAuth; sustituye el Sheets propuesto en #63. Conservar histórico real; borrar solo filas de prueba identificadas. Restaurar tienda.db no limpia esta tabla.

## Cómo crear cada credencial en n8n

En n8n: **Overview → Credentials → Create credential**, buscar el tipo y guardar con el nombre exacto de la tabla (así las dos de la pareja usan los mismos nombres y es fácil reasignarlas al importar un workflow).

### Mailpit (SMTP)

1. Tipo: **SMTP**.
2. User y Password: vacíos.
3. Host: `mailpit` · Port: `1025`.
4. SSL/TLS: desactivado.
5. Nombre: `Mailpit`.

### API Tienda (Header Auth)

1. Tipo: **Header Auth**.
2. Name: `X-API-Key` (exactamente así; si no, la app responde `401`).
3. Value: el valor de `API_KEY` de vuestro `.env`.
4. Nombre: `API Tienda`.
5. En cada nodo HTTP Request: Authentication → Generic Credential Type → Header Auth → `API Tienda`.

### Panel Marisa (Basic Auth)

1. Tipo: **Basic Auth**.
2. User y Password: los elige la pareja. No se escriben en ningún archivo ni mensaje.
3. Nombre: `Panel Marisa`.
4. En el Webhook `Abrir el panel` del `12`: Authentication → Basic Auth → `Panel Marisa`.

### Groq (Groq API)

1. Tipo: **Groq API**.
2. API Key: la clave de vuestra cuenta de Groq (capa gratuita).
3. Nombre: `Groq`.

**Verificado HU-06 (28/10/2026):** tabla local `recordatorios enviados`, columnas Number/Number/String, dos filas tras ejecución #45 y ninguna adicional tras #58. Tras restaurar la tienda, se eliminaron solo las dos filas de prueba; tabla vacía. Las credenciales importadas de otro ordenador se reasignaron a la credencial local existente sin guardar valores secretos.

### Extensión IA de recordatorios (#121)

`06 · Recordatorios y vencimientos` añade la credencial **Groq** (Groq API) al HTTP `Redactar con Groq`. Solo se envían instrucciones de tono genéricas; ningún dato de cliente, importe o fecha. API Tienda, sub-workflow 10, Data table y Error workflow 08 conservan su configuración anterior. El flujo permanece inactivo.
