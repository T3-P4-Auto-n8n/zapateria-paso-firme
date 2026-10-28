# Flujo 10 · Sub-workflows reutilizables

> **Alcance de esta versión:** los dos sub-workflows, `10 · Buscar apartado` y `10 · Enviar notificación`, están construidos en n8n, exportados en `workflows/10-buscar-apartado.json` y `workflows/10-enviar-notificacion.json` (6 nodos cada uno) y probados con los datos de ejemplo (sección 7). El `08 · Error Workflow` ya envía su aviso con `Enviar notificación` (`workflows/08-error-workflow.json`). Los demás flujos los usarán en PR aparte (sección 4.3, #95).

## 1. Cabecera

- **Flujo:** dos workflows que no son flujos del README; son la tarea «Sub-workflows reutilizables (**Execute Workflow**), por ejemplo "buscar apartado" o "enviar notificación"» del nivel Medio:
  - `10 · Buscar apartado` (`workflows/10-buscar-apartado.json`)
  - `10 · Enviar notificación` (`workflows/10-enviar-notificacion.json`)
- **Numeración:** comparten el `10` porque salen de la misma tarea y de esta spec; el `09` ya es la migración del Excel. Ver [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas).
- **Issues:** #92 (sub-issues #93, #94 y #95)
- **Nivel:** Medio
- **Responsable:** Esra
- **Credenciales y variables:** `API Tienda` (Header Auth) en `Buscar apartado` y `Mailpit` (SMTP) en `Enviar notificación`, ver [docs/credenciales.md](../docs/credenciales.md).
- **Error Workflow:** **ninguno** en los dos sub-workflows. Un error del sub-workflow hace fallar el nodo que lo llama, y lo avisa el `08` del flujo que llama (sección 6). En `Enviar notificación` es obligatorio: si tuviera el `08` asignado y el `08` lo usa para avisar, un fallo podría volver a llamarse a sí mismo.
- **Quién puede llamarlos:** solo los workflows del mismo propietario (`"callerPolicy": "workflowsFromSameOwner"` en los JSON exportados, el valor por defecto). En n8n 2.4.5 community la opción **This workflow can be called by** no aparece en Settings, así que no se puede cambiar desde la interfaz.

## 2. Objetivo

Que la búsqueda de apartados y el envío de correos se hagan en un solo sitio y siempre igual, para no repetir en cada flujo la misma llamada a la API, la credencial, el remitente y la opción de no añadir la firma de n8n.

**Dónde se repite hoy:**
- **Envío de correos:** hay 8 nodos Send Email con la misma configuración (credencial `Mailpit`, From `tienda@pasofirme.example`, **Append n8n Attribution** desactivado):
  - 5 en el `01`, contando la rama de HU-09 (PR #159, ya en `dev`);
  - 1 en el `07` (PR #161, ya en `dev`);
  - 1 en el `08` (en este PR pasa a usar `Enviar notificación`, 4.4);
  - 1 en el `09` (PR #160, ya en `dev`);
  - y los que traigan los flujos 3 y 6.
- **Búsqueda de apartados:** la necesitan el flujo 3 (por número de apartado o por nombre del ordenante), el flujo 6 (apartados activos) y el asistente de Telegram (por nombre o teléfono). Hoy ningún flujo construido busca: el `01` recibe el apartado en el webhook, y el `07` y el `09` leen la lista completa.

## 3. Disparador y entradas

Los dos empiezan con un **Execute Workflow Trigger** («When Executed by Another Workflow»), versión 1.3, con **Input data mode** «Define using fields below». Así, en el nodo que llama (**Execute Workflow**, versión 1.4, **Source** Database, **Workflow** From list) aparecen los campos para rellenar o mapear.

**Regla para quien llama: cada llamada a un sub-workflow es una sola petición.**
- El Execute Workflow que llama usa siempre **Mode: Run once for each item**. n8n ejecuta el sub-workflow una vez por cada item que le llega y devuelve una salida por cada item, en el mismo orden.
- **Por qué:** los Code de los sub-workflows leen solo `$input.first()`. Con **Run once with all items**, el sub-workflow recibiría todos los items en una sola ejecución y solo atendería el primero; los demás se perderían **sin error**. Es el caso del flujo 6 (un recordatorio por cliente) o de un flujo que envía un aviso por cada fila.
- Así los sub-workflows quedan sencillos (una petición, una respuesta) y el flujo que llama decide cuántas veces llama. Ver [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas).

### 3.1 `10 · Buscar apartado` (#93)

- **Disparador:** `Al buscar un apartado`.
- **Entradas** (todas opcionales, pero al menos una):

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | Number | Nº de apartado (`id` de la ontología) |
| `texto` | String | Texto libre: nombre del cliente, producto o teléfono. Es el filtro `q` de la API |
| `estado` | String | `activo`, `liquidado` o `vencido`. Vacío = todos |

### 3.2 `10 · Enviar notificación` (#94)

- **Disparador:** `Al enviar una notificación`.
- **Entradas:**

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `para` | String | Sí | Dirección de correo del destinatario (el `email` del apartado o `tienda@pasofirme.example`) |
| `asunto` | String | Sí | Asunto del correo |
| `texto` | String | Sí, si no hay `html` | Cuerpo en texto plano |
| `html` | String | No | Cuerpo en HTML (por ejemplo, el informe mensual) |

Estos campos no son de la ontología: son la interfaz del sub-workflow, igual que los datos del Error Trigger en el `08`.

## 4. Pasos y reglas

### 4.1 `10 · Buscar apartado`

**Qué permite la API** (`backend/routes/apartados.py`, `backend/models/apartado.py`):
- `GET /api/apartados?q=&estado=`: `estado` filtra por estado exacto. `q` busca con `LIKE` (contiene) en `cliente`, `producto` y `telefono`, o el `id` exacto (admite `#12`). Sin `pagina` devuelve todos, ordenados por `fecha_limite`.
- `GET /api/apartados/{id}`: un apartado con sus `abonos` y su `vale`; `404` si no existe.
- **Limitaciones del `LIKE`:** no quita tildes, distingue el formato del teléfono (`612 345 001` no encuentra `612345001`) y un texto que es solo un número también encuentra teléfonos que lo contienen (`q=12` da el apartado 12 y cualquier teléfono con `12`). Por eso el número va en `id`, no en `texto`.

**Pasos:**

1. `Al buscar un apartado` (Execute Workflow Trigger) recibe `{ id, texto, estado }`.
2. `Comprobar la búsqueda` (Code, Run Once for All Items):
   - Quita los espacios de los extremos de `texto` y `estado`.
   - Si no llega ninguno de los tres, **para con error** «Buscar apartado: falta `id`, `texto` o `estado`». Sin esta comprobación devolvería todos los apartados, con los datos de todos los clientes. Es el riesgo del asistente de Telegram (HU-11, HU-14).
   - Si `estado` no es `activo`, `liquidado` ni `vencido`, para con error.
   - Si `id` no es un entero positivo, para con error.
   - Si `texto` es un teléfono de 9 cifras sin espacios (`612345001`), lo pasa al formato de la app (`612 345 001`), el mismo que usa la migración.
   - Si llegan `id` y `texto`, manda `id` (es exacto) y `texto` se ignora.
   - Devuelve `{ por_numero: true/false, id, texto, estado }`.
3. IF `¿Por número?` (`{{ $json.por_numero }}` is true):
   - **true →** `Leer apartado por número`: `GET http://tienda:8000/api/apartados/{{ $json.id }}`.
   - **false →** `Buscar apartados por texto`: `GET http://tienda:8000/api/apartados` con query `q` = `{{ $json.texto }}` y `estado` = `{{ $json.estado }}`. Un parámetro vacío no filtra, porque la app lo trata como «sin filtro».
4. Los dos `GET` llevan Authentication **Generic Credential Type → Header Auth → `API Tienda`** y, en Options, **Include Response Headers and Status** y **Never Error**.
   - Siempre devuelven **un item** `{ statusCode, body }`, también con una lista vacía. No hace falta Always Output Data.
   - Un `404` no para el flujo.
   - **Settings → Retry On Fail:** 3 intentos, 2000 ms. Con Never Error solo se reintentan los errores sin respuesta (app parada, tiempo agotado); un `401` o un `5xx` llegan a `Preparar resultado` sin reintento ([specs/08-error-workflow.md](08-error-workflow.md#reintentos), #56).
5. `Preparar resultado` (Code), al que llegan las dos ramas:
   - **`200`:** la lista de apartados (por número, una lista de uno). Si se buscó por número y llega `estado`, se filtra también por `estado`.
   - **`404` por número:** lista vacía.
   - **Cualquier otro código** (`401`, `422`, `5xx`): para con error «Buscar apartado: la app respondió `<código>`: `<detail>`».
   - De cada apartado devuelve solo los campos de la lista (`id`, `fecha`, `cliente`, `telefono`, `email`, `producto`, `talla`, `precio`, `fecha_limite`, `estado`, `abonado`, `pendiente`), también cuando viene del detalle. Así la salida tiene siempre la misma forma. Quien necesite los `abonos` o el `vale` llama al detalle directamente.
   - `abonado` y `pendiente` son los de la app; no se recalculan.

**Salida** (lo que recibe el nodo que llama): **siempre un solo item**, también con 0 resultados. Ejemplo:

```json
{ "total": 1, "apartados": [ { "id": 12, "fecha": "2026-09-01", "cliente": "Laura Ortega", "telefono": "600 000 012", "email": "laura12@example.com", "producto": "Deportiva blanca", "talla": "38", "precio": 55.0, "fecha_limite": "2026-11-30", "estado": "activo", "abonado": 10.0, "pendiente": 45.0 } ] }
```

Con 0 resultados: `{ "total": 0, "apartados": [] }`. **No es un error:** el flujo que llama decide qué hacer (por ejemplo, el flujo 3 avisa a Marisa de que no encuentra el apartado).

**Por qué un item con la lista y no un item por apartado:** con 0 resultados no habría ningún item y el flujo que llama se pararía (el problema de los 0 items de HU-10). Con un item, el que llama mira `total` en un IF y sigue.

### 4.2 `10 · Enviar notificación`

1. `Al enviar una notificación` (Execute Workflow Trigger) recibe `{ para, asunto, texto, html }`.
2. `Comprobar la notificación` (Code):
   - Quita los espacios de los extremos de los cuatro campos.
   - **Para con error** si `para` está vacío o no tiene `@` («Enviar notificación: falta `para`»), si `asunto` está vacío («falta `asunto`»), o si `texto` y `html` están vacíos los dos («falta el cuerpo del correo»). No envía nada.
   - **No decide** si hay que avisar a la tienda porque el cliente no tiene email. Eso lo sigue decidiendo cada flujo con su IF `¿Tiene email?` antes de llamar (por ejemplo, HU-01 avisa a la tienda y HU-02 no envía nada). El error es solo una red de seguridad: un `email` `" "` que pasa el IF ya no llega al Send Email.
3. IF `¿Lleva HTML?` (`{{ !!$json.html }}` is true):
   - **true →** `Enviar correo en HTML` (Send Email, **Email Format** Both): **Text** `{{ $json.texto }}` y **HTML** `{{ $json.html }}`.
   - **false →** `Enviar correo de texto` (Send Email, **Email Format** Text): **Text** `{{ $json.texto }}`.
   - Los dos: credencial `Mailpit`, **From Email** `tienda@pasofirme.example`, **To Email** `{{ $json.para }}`, **Subject** `{{ $json.asunto }}` y **Options → Append n8n Attribution** desactivado.
   - **Por qué dos nodos:** con un solo nodo en Both y sin `html`, el correo llevaría una parte HTML vacía y algunos clientes lo mostrarían en blanco.
4. `Preparar respuesta` (Code), al que llegan las dos ramas, devuelve un item:

```json
{ "enviado": true, "para": "carmen@example.com", "asunto": "Tu apartado en Paso Firme: Botín piel marrón", "messageId": "<...@pasofirme.example>" }
```

`messageId` es el que devuelve el Send Email. Si el envío falla, no se llega aquí: el Send Email da error (sección 6).

### 4.3 Uso en los flujos (#95)

| Workflow | Nodo actual | Se sustituye por | Cuándo |
|---|---|---|---|
| `08 · Error Workflow` | `Avisar a la tienda del error` | `Enviar notificación` | **En este PR** (4.4) |
| `01 · Eventos de la tienda`, flujo 1 (HU-01) | `Enviar confirmación al cliente` · `Avisar a la tienda: sin email` | `Enviar notificación` | **En la PR de #95 (ejemplo)**, ver [specs/01-eventos-tienda.md](01-eventos-tienda.md) |
| `01`, flujo 2 (HU-02) | `Enviar recibo del abono` · `Avisar de que puede recoger` | `Enviar notificación` | Se queda con Send Email (opcional) |
| `01`, flujo 4 (HU-09) | `Avisar a la tienda: venta grande` | `Enviar notificación` | Se queda con Send Email (opcional) |
| `07 · Informe mensual` | `Enviar informe mensual` (HTML) | `Enviar notificación` con `html` | Se queda con Send Email (opcional) |
| `09 · Migración del Excel` | `Enviar informe de migración` | `Enviar notificación` | Se queda con Send Email (opcional) |
| `03 · Abonos a distancia` (Beste, PR #158) | Pasos 2 y 3 de su spec: `GET /api/apartados/{id}` y `GET /api/apartados?estado=activo&q=...` | `Buscar apartado`: con `id` (sin `estado`, para poder avisar si está liquidado o fuera de plazo) o con `texto` y `estado` `activo` | Lo decide Beste al construirlo o corregirlo |
| `03` | Consulta o rechazo a Marisa (sección 5 de su spec) | `Enviar notificación` | Igual |
| `06 · Recordatorios y vencimientos` (vencimientos: Esra, HU-07, [specs/06-recordatorios-vencimientos.md](06-recordatorios-vencimientos.md); recordatorios: Beste) | Leer los apartados activos | `Buscar apartado` con `estado` `activo` (`Leer apartados activos`) | Al construirlo |
| `06` | Recordatorios al cliente (7 días y 1 día) y lista de zapatos que vuelven a la venta a la tienda (`Enviar lista a la tienda`) | `Enviar notificación` | Al construirlo |
| `01`, rama `apartado.vencido` (HU-07) | Vale al cliente (`Enviar vale al cliente`) y aviso a la tienda si no tiene email (`Avisar a la tienda: vencido sin email`) | `Enviar notificación` | Al construirla ([specs/01-eventos-tienda.md](01-eventos-tienda.md)) |

- Los PR #159, #160 y #161 ya están fusionados en `dev`.
- **Por qué el flujo 1 como ejemplo:** la prueba de HU-05 (`error-email-espacio.json`) pasa por `Enviar confirmación al cliente`. Con el cambio comprueba también que un error del sub-workflow lo avisa el `08` del flujo que llama, lo que quedó pendiente al construir #92.
- **Por qué los demás se quedan con Send Email (opcional):**
  - ya funcionan y están probados;
  - el correo sería el mismo;
  - cambiarlos obliga a reescribir cada texto como expresión de una línea y a repetir todas sus pruebas.
  - El uso del sub-workflow ya queda demostrado con el `08` y el flujo 1. Se pueden cambiar más adelante, uno por PR.
- El `POST /api/apartados/{id}/vencer` del flujo 6 **no** pasa a un sub-workflow: solo se reutilizan la búsqueda y el envío.
- Los flujos 1 y 2 no usan `Buscar apartado`: el webhook ya trae el apartado actualizado.
- **#95** («usarlos desde los flujos 1, 2, 3, 6») queda **abierta**: este PR solo la referencia (`Refs #95`). Se cierra cuando los cuatro flujos usen los sub-workflows.

### 4.4 Cambio en el `08 · Error Workflow` (en este PR)

El `08` está en `dev` y ningún PR abierto lo toca.

| Antes | Después |
|---|---|
| `Si falla un flujo` (Error Trigger) | Sin cambios |
| `Avisar a la tienda del error` (Send Email, `Mailpit`, From y To `tienda@pasofirme.example`, texto, sin atribución) | `Avisar a la tienda del error` (**Execute Workflow**, versión 1.4): **Workflow** `10 · Enviar notificación` (From list), **Mode** Run once for each item (la regla de la sección 3; el Error Trigger da un solo item, pero el `08` sigue la regla igual que los demás), **Options → Wait For Sub-Workflow Completion** activado. **Workflow Inputs:** `para` = `tienda@pasofirme.example`; `asunto` = `Ha fallado el flujo «{{ $json.workflow.name }}»`; `texto` = el mismo texto de ahora (flujo, paso, error y enlace), escrito como expresión con `\n` (abajo); `html` vacío |

**`texto` como expresión con `\n`:** los campos de **Workflow Inputs** son de una sola línea. Al pegar el texto de varias líneas o pulsar Enter se pierden los saltos y el aviso llega en una sola línea. Por eso los saltos se escriben dentro de la expresión:

```text
{{ 'Una automatización ha fallado.\n\nFlujo: ' + $json.workflow.name + '\nPaso: ' + $json.execution.lastNodeExecuted + '\nError: ' + $json.execution.error.message + '\nEjecución: ' + $json.execution.url }}
```

- El nodo conserva el nombre, así que la spec del `08` solo cambia en el paso 2.
- El correo que llega tiene que ser igual que antes: mismo remitente, destinatario, asunto y texto, y sin firma de n8n.
- **Si falla el propio `Enviar notificación`** (Mailpit caído, sub-workflow borrado, sin permiso para llamarlo o, si n8n 2.4.5 lo exige, sin publicar):
  - el nodo `Avisar a la tienda del error` falla y el aviso se pierde;
  - queda solo en las ejecuciones de n8n del `08`, igual que hoy cuando falla su Send Email (un Error Workflow no se vigila a sí mismo).
  - El riesgo nuevo es que ahora hay una pieza más que puede fallar. Por eso:
    - `Enviar notificación` no lleva Error workflow (sección 1);
    - no se borra ni se renombra sin revisar el `08`;
    - su prueba (sección 7) se repite cada vez que se cambie.
- **Alternativa descartada:** dejar el `08` con su propio Send Email para que el aviso de errores no dependa de otro workflow. La issue #92 pide reutilizar el envío, y el riesgo es el mismo que ya tiene el Send Email (Mailpit caído). Queda anotado por si la pareja prefiere esa opción.

## 5. Salidas

| Sub-workflow | Destinatario | Canal | Qué devuelve al flujo que llama |
|---|---|---|---|
| `10 · Buscar apartado` | El flujo que llama | — | Un item `{ total, apartados: [...] }` con los campos del apartado de la ontología |
| `10 · Enviar notificación` | `para` (cliente o tienda) | Correo (`Mailpit`), From `tienda@pasofirme.example`, texto o HTML, sin atribución | Un item `{ enviado, para, asunto, messageId }` |

`Buscar apartado` solo hace `GET`; no cambia nada en la app.

## 6. Casos de error

**Cómo llega un error al `08`:** los sub-workflows no tienen Error workflow. Si un sub-workflow para con error, falla el nodo **Execute Workflow** del flujo que llama, y con él la ejecución del que llama. Su `08` avisa con:
- el flujo que llama;
- el paso, que es el nombre del nodo Execute Workflow (por ejemplo, `Enviar confirmación al cliente`);
- el mensaje **genérico de n8n** «Error executing workflow with item at index 0», no el del sub-workflow. n8n no lo pasa al nodo que llama.

**El motivo real** («Enviar notificación: falta `para`», «Buscar apartado: la app respondió 401: ...») solo está en la ejecución del sub-workflow. Para verlo:
- abrir la ejecución del enlace del aviso y, desde el nodo Execute Workflow, ir a la sub-ejecución;
- o buscar en las ejecuciones del sub-workflow la de la misma hora.

Se comprobó en #95 con la prueba de HU-05 ([specs/01-eventos-tienda.md](01-eventos-tienda.md), sección 7).

Como siempre, solo en ejecuciones de producción.

| Sub-workflow | Caso | Qué hace |
|---|---|---|
| Buscar apartado | Sin `id`, `texto` ni `estado` | Para con error «falta `id`, `texto` o `estado`» |
| Buscar apartado | `estado` no válido o `id` que no es un entero positivo | Para con error |
| Buscar apartado | Sin resultados (texto que no encuentra nada, o `404` por número) | **No es error:** `{ total: 0, apartados: [] }` |
| Buscar apartado | La API responde `401` (credencial `API Tienda` mal) u otro código que no es `200` ni el `404` por número | Para con error con el código y el `detail`; lo avisa el `08` del flujo que llama |
| Buscar apartado | La app no responde | El `GET` se reintenta (3 intentos, 2 s); si sigue sin responder, falla (Never Error no cubre los errores de red) y lo avisa el `08` del flujo que llama |
| Buscar apartado | Varios resultados | Se devuelven todos; elegir uno es cosa del flujo que llama (en el flujo 3, varios candidatos = consulta a Marisa) |
| Enviar notificación | Falta `para`, `asunto` o el cuerpo, o `para` sin `@` | Para con error sin enviar nada |
| Enviar notificación | Mailpit caído o credencial `Mailpit` mal | Falla el Send Email; lo avisa el `08` del flujo que llama, salvo si quien llama es el propio `08` (4.4) |
| Los dos | El sub-workflow no existe, no se puede llamar (`callerPolicy`, sección 1) o no está publicado si n8n 2.4.5 lo exige | Falla el Execute Workflow del flujo que llama. Los dos están publicados (`"active": true` en el JSON exportado) |
| Los dos | Un flujo llama con **Run once with all items** y le pasa varios items (incumple la regla de la sección 3) | El sub-workflow solo atiende el primer item: `Enviar notificación` envía un correo y los demás se pierden; `Buscar apartado` solo hace la primera búsqueda. **No hay error** y el `08` no avisa. Se evita con la regla y se comprueba en la revisión de cada flujo que llame (el Mode se ve en el JSON exportado: `"mode": "each"`) |

## 7. Prueba

**Probar un sub-workflow suelto:** en el editor del sub-workflow, fijar datos de prueba en `Al buscar un apartado` / `Al enviar una notificación` (**Pin data** con el JSON de entrada) y pulsar **Execute workflow**. Se ve la salida del último nodo, que es lo que recibiría el flujo que llama.

**`10 · Buscar apartado`** (datos de ejemplo de la app, `SEED=1`):

| Entrada (pin data) | Resultado esperado |
|---|---|
| `{ "id": 22 }` | `total` 1: el apartado 22, `estado` `vencido`, sin `abonos` ni `vale` en la salida |
| `{ "id": 22, "estado": "activo" }` | `total` 0 (el 22 está `vencido`) |
| `{ "id": 9999 }` | `total` 0 (`404` de la app, no es error) |
| `{ "texto": "Carmen Ruiz" }` | Los apartados de Carmen Ruiz de los datos de ejemplo, cada uno con `abonado` y `pendiente` de la app |
| `{ "texto": "Carmen Ruiz", "estado": "activo" }` | Solo los activos |
| `{ "texto": "600000001" }` | Lo mismo que con `600 000 001` (teléfono normalizado) |
| `{ "texto": "Nadie Inventado" }` | `{ "total": 0, "apartados": [] }` |
| `{ "estado": "activo" }` | Todos los activos; `total` igual a `activo` de `GET /api/apartados/resumen` |
| `{}` | Error «Buscar apartado: falta `id`, `texto` o `estado`» |
| `{ "estado": "pagado" }` | Error de estado no válido |
| `{ "id": 22 }` con la credencial de los `GET` cambiada por una con clave mal (temporalmente) | Error «Buscar apartado: la app respondió 401: ...». Al terminar, volver a poner `API Tienda` |

Los resultados por texto dependen del día en que se cargó el seed. Se comparan con `GET /api/apartados?q=...` en Swagger, no con números fijos.

**`10 · Enviar notificación`:**

| Entrada (pin data) | Resultado esperado |
|---|---|
| `{ "para": "tienda@pasofirme.example", "asunto": "Prueba de texto", "texto": "Hola" }` | En Mailpit llega «Prueba de texto», desde `tienda@pasofirme.example`, en texto plano y sin la firma de n8n. Salida `enviado` `true` con `messageId` |
| `{ "para": "tienda@pasofirme.example", "asunto": "Prueba HTML", "texto": "Hola", "html": "<b>Hola</b>" }` | Llega «Prueba HTML» con «Hola» en negrita; la parte de texto dice «Hola» |
| `{ "para": " ", "asunto": "x", "texto": "x" }` | Error «falta `para`»; no llega nada |
| `{ "para": "tienda@pasofirme.example", "asunto": "", "texto": "x" }` | Error «falta `asunto`» |
| `{ "para": "tienda@pasofirme.example", "asunto": "x" }` | Error «falta el cuerpo del correo» |

**Llamándolo desde otro flujo: el `08`** (con el `01` y el `08` publicados, y `10 · Enviar notificación` publicado si n8n lo exige):

| Entrada | Resultado esperado |
|---|---|
| La misma prueba de HU-05: `tests/payloads/error-email-espacio.json` a la **Production URL** (`curl` de [specs/08-error-workflow.md](08-error-workflow.md), sección 7) | Igual que en HU-05: en Mailpit llega a `tienda@pasofirme.example` «Ha fallado el flujo «01 · Eventos de la tienda»», con el flujo, el paso (`Enviar confirmación al cliente`), el error («No recipients defined») y el enlace, sin claves ni firma de n8n. En las ejecuciones de n8n se ven dos: la del `08` y la de `10 · Enviar notificación` |

> La prueba de HU-05 es la del correo con `email` `" "` («No recipients defined»), no un `401`.

**Varios items con Run once for each item** (`Enviar notificación`). Se usa un flujo de prueba que **no se exporta**: su nombre no empieza por `NN · `, así que `scripts/flujos.py` lo ignora. Por ejemplo, `Prueba de sub-workflows (no exportar)`, con estos nodos:

1. Manual Trigger.
2. Code `Dos avisos`, que devuelve 2 items:
   `[{ json: { para: 'tienda@pasofirme.example', asunto: 'Aviso 1 de 2', texto: 'Primero' } }, { json: { para: 'tienda@pasofirme.example', asunto: 'Aviso 2 de 2', texto: 'Segundo' } }]`
3. Execute Workflow `Enviar los avisos`: `10 · Enviar notificación`, **Mode** Run once for each item. **Workflow Inputs:** `para` = `{{ $json.para }}`, `asunto` = `{{ $json.asunto }}` y `texto` = `{{ $json.texto }}`.

| Entrada | Resultado esperado |
|---|---|
| Execute workflow con **Run once for each item** | Llegan a Mailpit **2 correos**, «Aviso 1 de 2» y «Aviso 2 de 2». `Enviar los avisos` da 2 items con `enviado` `true` y dos `messageId` distintos. En las ejecuciones se ven 2 de `10 · Enviar notificación` |
| Lo mismo cambiando el Mode a **Run once with all items** (para ver el fallo) | Llega **1 correo** («Aviso 1 de 2»), una sola ejecución del sub-workflow, y ningún error. Al terminar, volver a poner Run once for each item, o borrar el flujo de prueba |

**Resultado real** (datos de ejemplo, seed del 21/10/2026, pin data en el trigger):

`10 · Buscar apartado`

| Entrada | Resultado |
|---|---|
| `{ "id": 22 }` | `total` 1: apartado 22, Beatriz Medina, `vencido`, `abonado` 25, `pendiente` 14.9, sin `abonos` ni `vale` |
| `{ "id": 22, "estado": "activo" }` | `total` 0 |
| `{ "id": 9999 }` | `total` 0. `Leer apartado por número` sale en verde: el `404` con Never Error no es un error |
| `{ "texto": "Carmen Ruiz" }` | `total` 1: apartado 1 (Zueco sanitario, `activo`, `abonado` 15, `pendiente` 19.5). Coincide con `GET /api/apartados?q=Carmen Ruiz` |
| `{ "texto": "Carmen Ruiz", "estado": "activo" }` | `total` 1 |
| `{ "texto": "600000001" }` | `total` 2: apartados 1 y 27, que tienen el mismo teléfono. En la API, `q=600000001` sin espacios da 0 y `q=600 000 001` da 2: lo resuelve la normalización de `Comprobar la búsqueda` |
| `{ "texto": "Nadie Inventado" }` | `{ "total": 0, "apartados": [] }` |
| `{ "estado": "activo" }` | `total` 20, igual que `activo` en `GET /api/apartados/resumen` |
| `{}` | Error «Buscar apartado: falta `id`, `texto` o `estado`» |
| `{ "estado": "pagado" }` | Error «Buscar apartado: estado no válido: «pagado» (activo, liquidado o vencido)» |
| `401` | **No realizada.** Obligaba a crear una credencial falsa. El camino de error está en `Preparar resultado`: cualquier código que no sea `200` ni el `404` por número para con error con el código y el `detail` |

`10 · Enviar notificación`

| Entrada | Resultado |
|---|---|
| HTML | Llega «Prueba HTML» con «Hola» en negrita |
| Texto | Llega en texto plano. Al principio salía la firma de n8n: en `Enviar correo de texto` faltaba desactivar **Append n8n Attribution**. Se desactivó y el JSON exportado lo tiene (`appendAttribution: false` en los dos Send Email) |
| Sin `para` | Error y no llega nada |

`08` llamando a `Enviar notificación` (`curl` de HU-05 con `tests/payloads/error-email-espacio.json` a la Production URL): llega «Ha fallado el flujo «01 · Eventos de la tienda»» con el flujo, el paso `Enviar confirmación al cliente`, el error «No recipients defined» y el enlace a la ejecución 71, sin firma de n8n. La primera vez el cuerpo llegó en una sola línea; se resolvió con la expresión con `\n` (4.4).

Varios items (flujo `Prueba de sub-workflows (no exportar)`, que no se exporta):

| Mode | Resultado |
|---|---|
| **Run once for each item** | `Enviar los avisos` da «2 items, 2 sub-executions», `enviado` `true` y dos `messageId` distintos. Llegan «Aviso 1 de 2» y «Aviso 2 de 2» |
| **Run once with all items** | Llega 1 solo correo y no hay ningún error: el fallo silencioso de la sección 6. Se volvió a poner Run once for each item |

**Evidencias:**

- Ejecución de `Buscar apartado` con resultados (Carmen Ruiz): [docs/evidencias/10-buscar-apartado-texto.png](../docs/evidencias/10-buscar-apartado-texto.png)
- Ejecución de `Buscar apartado` con 0 resultados (Nadie Inventado): [docs/evidencias/10-buscar-apartado-sin-resultados.png](../docs/evidencias/10-buscar-apartado-sin-resultados.png)
- Correo HTML de `Enviar notificación` en Mailpit: [docs/evidencias/10-enviar-notificacion-html.png](../docs/evidencias/10-enviar-notificacion-html.png)
- Aviso del `08` enviado a través de `Enviar notificación`: [docs/evidencias/10-08-aviso-con-sub-workflow.png](../docs/evidencias/10-08-aviso-con-sub-workflow.png)
- Los 2 correos de la prueba con varios items: [docs/evidencias/10-enviar-notificacion-varios-items.png](../docs/evidencias/10-enviar-notificacion-varios-items.png)

## 8. Criterios de aceptación

Las issues #92–#95 no traen checklist: solo el título. Los criterios salen de esos títulos y de la línea del README.

**#92 · Sub-workflows reutilizables** (README, nivel Medio: «Sub-workflows reutilizables (**Execute Workflow**), por ejemplo "buscar apartado" o "enviar notificación"»)

- [x] **#93** Sub-workflow «buscar apartado»: busca por número, texto o estado y devuelve siempre `{ total, apartados }`, también con 0 resultados.
- [x] **#94** Sub-workflow «enviar notificación»: envía por `Mailpit` desde `tienda@pasofirme.example`, en texto o HTML y sin firma de n8n, y para con error si falta `para` o `asunto`.
- [x] El `08` envía su aviso con `Enviar notificación` y el correo llega igual que antes.
- [ ] **#95** Usarlos desde los flujos 1, 2, 3, 6 (en este PR, solo el `08`; queda abierta, `Refs #95`):
  - [x] Flujo 1 (`01`, HU-01): en la PR de #95 (ejemplo), probado
  - [ ] Flujo 2 (`01`, HU-02): se queda con Send Email (opcional, 4.3)
  - [ ] Flujo 3 (`03`, Beste)
  - [ ] Flujo 6 (`06`, Beste)
