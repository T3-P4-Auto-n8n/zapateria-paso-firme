# Credenciales y variables

Qué credenciales y variables necesita cada workflow. **Aquí nunca se escriben valores**: las claves viven solo en el `.env` (que no se sube a GitHub) y en las credenciales de n8n.

## Credenciales de n8n

| Credencial | Tipo en n8n | Configuración (sin valores secretos) | Para qué |
|---|---|---|---|
| `Mailpit` | SMTP | Host `mailpit`, puerto `1025`, sin usuario ni contraseña, SSL/TLS desactivado | Enviar correos de prueba en local (se ven en http://localhost:8025) |
| `API Tienda` | Header Auth | Name `X-API-Key`, Value = `API_KEY` del `.env` | Llamar a la API de la app (`http://tienda:8000/api/...`) |
| `Groq` | Groq API | API Key de Groq | Modelo de IA en los nodos de IA |

## Workflow → credenciales

| Workflow | Credenciales | Notas |
|---|---|---|
| `01 · Eventos de la tienda` | `Mailpit` | Usa la Data table `Configuración` (rama HU-09), ver [Data tables de n8n](#data-tables-de-n8n) |
| `03 · Abonos a distancia` | por completar | |
| `05 · Cierre diario` | por completar | |
| `06 · Recordatorios y vencimientos` | por completar | |
| `07 · Informe mensual` | por completar | |
| `08 · Error Workflow` | por completar | |

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

> **Las Data tables no se exportan con el JSON del workflow.** Al importar `workflows/01-eventos-tienda.json` en otra instancia (por ejemplo, la de la pareja), hay que crear antes la tabla `Configuración` con su fila y volver a elegirla en el nodo `Leer umbral de venta grande`. Si no, el nodo da error y lo avisa el `08`.

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

### Groq (Groq API)

1. Tipo: **Groq API**.
2. API Key: la clave de vuestra cuenta de Groq (capa gratuita).
3. Nombre: `Groq`.
