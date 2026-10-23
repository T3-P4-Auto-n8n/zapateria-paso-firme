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
- **Flujos en n8n:** cada workflow se numera por el flujo más bajo que contiene: `01 · Eventos de la tienda` (webhook + Switch; flujos 1, 2, 4 y aviso de vencido), `03 · Abonos a distancia`, `05 · Cierre diario`, `06 · Recordatorios y vencimientos`, `07 · Informe mensual` y `08 · Error Workflow`.
- **Nodos:** nombres descriptivos en español, por ejemplo `Buscar apartado por id`.
- **Specs:** `specs/NN-nombre.md` · **Workflows:** `workflows/NN-nombre.json` (mismo `NN` que el flujo).
- **Commits y PRs:** en inglés, con Conventional Commits (`docs: ...`, `feat: ...`, `fix: ...`, `chore: ...`). La documentación del proyecto (specs, `docs/`, `AGENTS.md`) sigue en español.

## 6. Forma de trabajo

1. **Primero la spec, luego el flujo.** Cada flujo empieza con su spec en `specs/` usando la plantilla.
2. **Una tarea = una rama = una PR** con el JSON exportado del flujo.
3. Cada flujo tiene datos de prueba y resultado esperado; si la prueba falla, se arregla el flujo, no la prueba.
4. Registrar los prompts relevantes y las decisiones (qué se aceptó, qué se rechazó y por qué) en `docs/ai-log.md`.

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
| Las transferencias bancarias se registran con `forma_pago` `"bizum"` | La app no acepta `"transferencia"` (devuelve `422`) | Pendiente de confirmar con el profesor |
| Un abono de un cliente sin email no envía nada (ni al cliente ni a la tienda) | En un abono el cliente está en contacto con la tienda; avisar a la tienda en cada abono la llenaría de correos | Tomada |

## 9. Lo que el agente NO debe hacer

- Escribir claves, tokens o contraseñas en los flujos, en el repo o en los mensajes, ni copiar el contenido de `.env`.
- Activar o publicar flujos.
- Recalcular `abonado` o `pendiente`: se usan siempre los que da la app.
- Dejar que la IA decida en el flujo 3: la IA solo extrae ordenante, importe y concepto; las decisiones las toma el flujo con la API.
- Hacer push a `main` o `dev`, ni mergear PRs.
- Modificar `backend/` o `frontend/` sin que la pareja lo pida.
- Inventar entidades o campos que no estén en [docs/ontologia.md](docs/ontologia.md).
- Enviar a modelos externos más datos personales de los imprescindibles.
