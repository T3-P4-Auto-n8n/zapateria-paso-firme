# Flujo 06 · Recordatorios y vencimientos

> **Alcance de esta versión:** spec de **vencimientos y recordatorios**; estado construido: **rama de vencimientos** (HU-07, criterios 1 y 3): cada mañana se vencen por API los apartados fuera de plazo y la tienda recibe la lista de zapatos que vuelven a la venta. El criterio 2 (el vale al cliente) va en el `01`, rama `apartado.vencido` ([specs/01-eventos-tienda.md](01-eventos-tienda.md)). La rama de vencimientos está **construida** en n8n, exportada en `workflows/06-recordatorios-y-vencimientos.json` (8 nodos) y probada a mano (sección 7). **Sin publicar** a propósito: publicado, vencería de verdad a las 9:00 los apartados fuera de plazo, entre ellos el 16, que la prueba de HU-03 (correo `06_bizum_paula`) necesita `activo` y fuera de plazo. Se publicará cuando terminen las pruebas de HU-03. La **rama de recordatorios** (HU-06) está construida y probada a mano el 28/10/2026: 17 nodos en total, 9 nuevos. Primera ejecución #45 con dos recordatorios y segunda #58 sin nuevos envíos. La programación real queda sin probar porque 06 continúa sin publicar. Ver pruebas HU-06 y capturas en sección 7.

## 1. Cabecera

- **Flujo:** `06 · Recordatorios y vencimientos` (`workflows/06-recordatorios-y-vencimientos.json`), flujo 6 del README.
  - El nombre del archivo lo pone `scripts/flujos.py`: quita «de», «la» y «del», pero no «y».
  - La spec se queda como `specs/06-recordatorios-vencimientos.md`. `AGENTS.md` (sección 5) solo pide el mismo `NN`, y el nombre ya está enlazado desde las specs del `01` y del `10`, `AGENTS.md` y los prompts literales de `docs/ai-log.md`.
- **HU:** HU-07 · Apartados vencidos con su vale (#64; sub-issues #65–#69). HU-06 · Recordatorios de vencimiento (#57; #58–#63): construida y probada manualmente (Beste); programación pendiente de publicación humana.
- **Nivel:** Medio.
- **Responsable:** Esra (vencimientos) · Beste (recordatorios).
- **Credenciales y variables:**
  - `API Tienda` (Header Auth), en `Vencer apartado`;
  - los sub-workflows `10 · Buscar apartado` (usa `API Tienda`) y `10 · Enviar notificación` (usa `Mailpit`).
  - Ver [docs/credenciales.md](../docs/credenciales.md).
- **Error Workflow:** `08 · Error Workflow`.
- **Settings:** zona horaria `Europe/Madrid`.

## 2. Objetivo

Avisar cada mañana de los apartados que vencen en 7 días o mañana, una vez por apartado y tipo de aviso, con el pendiente y la fecha límite de la app. Mantener la rama existente para que los apartados que se han pasado de plazo se cierren solos cada mañana, la app genere el vale con lo abonado y la tienda sepa qué zapatos vuelven a la venta, sin revisarlos uno a uno.

## 3. Disparador y entradas

### 3.1 Disparadores

- **`Cada mañana a las 9:00`** (Schedule Trigger):
  - **Trigger Interval** Days, **Days Between Triggers** `1`, **Trigger at Hour** 9am y **Trigger at Minute** `0`. Todos los días, también el domingo.
  - Equivale a la expresión cron `0 9 * * *`.
  - Solo funciona con el flujo publicado (lo publica la pareja). **Todavía sin publicar**, por la prueba de HU-03 (nota de alcance).
  - En el JSON exportado queda como `{"triggerAtHour": 9}`: Days, `1` y el minuto `0` son los valores por defecto y n8n no los guarda.
  - **Por qué todos los días:** el disparador será el mismo para los recordatorios de HU-06, y un aviso de «vence en 1 día» no puede saltarse el domingo. Para los vencimientos da igual: el que vence en domingo se vence ese día y la tienda ve la lista el lunes.
  - **Por qué a las 9:00, por la mañana:**
    - El README dice «cada mañana», y así la dependienta tiene la lista al abrir.
    - No se cruza con el cierre diario ni con el datáfono, que son por la noche (HU-13 a las 22:00, antes del cierre). Vencer no crea ventas ni abonos, así que no cambia el cierre de ningún día.
    - No va cerca de medianoche. La app decide si un apartado está fuera de plazo con su propia fecha (`date.today()`, contenedor con `TZ=Europe/Madrid`). A las 9:00 n8n (`Europe/Madrid`) y la app tienen el mismo «hoy».
- **`Probar a mano`** (Manual Trigger), para las pruebas: se elige en el desplegable de **Execute workflow**. Se ejecutan los mismos nodos que en la programada. Una ejecución manual no hace saltar el `08`.

### 3.2 Entradas

No recibe datos: lee de la app los apartados `activo` con `10 · Buscar apartado`. Campos del Apartado que usa (ontología): `id`, `cliente`, `producto`, `talla`, `fecha_limite`, `estado`; HU-06 añade `email`, `telefono`, `pendiente`; y del Vale que devuelve `POST /vencer`: `codigo` e `importe`.

**Qué hace la app al vencer** (`backend/models/apartado.py`, `vencer`):

| Respuesta | Cuándo | Cuerpo |
|---|---|---|
| `200` | El apartado está `activo` y hoy es posterior a su `fecha_limite` | `{ "apartado": {...}, "vale": {...} }`: el apartado ya `vencido` y el vale con `codigo` `VALE-<id con 5 cifras>` e `importe` = `abonado` |
| `422` | Ya no está `activo` | `{"detail": "El apartado ya está vencido"}` (o `liquidado`) |
| `422` | Todavía está en plazo (hoy ≤ `fecha_limite`) | `{"detail": "El apartado no vence hasta el AAAA-MM-DD"}` |
| `404` | No existe | `{"detail": "Apartado no encontrado"}` |
| `401` | Falta la clave o no es la buena | — |

Con el `200`, la app envía además el webhook `apartado.vencido` con el mismo cuerpo. Lo recibe el `01`, que envía el vale al cliente (parte B, [specs/01-eventos-tienda.md](01-eventos-tienda.md)).

## 4. Pasos y reglas

```
Cada mañana a las 9:00 ─┐
Probar a mano ──────────┴─ Leer apartados activos ─ Elegir los fuera de plazo ─ ¿Hay apartados que vencer? ─ true ─ Vencer apartado ─ Preparar lista ─ Enviar lista a la tienda
                                                                                                          └ false ─ (fin, sin correo)
```

### 4.1 Rama de vencimientos (HU-07)

**Lectura**

1. `Leer apartados activos` (Execute Workflow a `10 · Buscar apartado`; en n8n el nodo se llama «Execute Sub-workflow»):
   - **Mode** Run once for each item, la regla de [specs/10-sub-workflows.md](10-sub-workflows.md), sección 3. El disparador da un solo item, así que hay una sola llamada.
   - **Options → Wait For Sub-Workflow Completion:** activado (el valor por defecto).
   - **Workflow Inputs:** `estado` = `activo`; `id` y `texto` vacíos.
   - Devuelve **un item** `{ total, apartados: [...] }`, también con 0 activos. Los apartados vienen ordenados por `fecha_limite`, con `abonado` y `pendiente` de la app.

**Qué apartados se vencen** (`Elegir los fuera de plazo`, Code, Run Once for All Items)

2. Hoy es `DateTime.now().setZone('Europe/Madrid').toISODate()` (`AAAA-MM-DD`).
3. Se queda con los apartados con `fecha_limite` **anterior** a hoy (`fecha_limite < hoy`, comparando las fechas como texto `AAAA-MM-DD`).
   - El que tiene `fecha_limite` igual a hoy **no** se vence: todavía puede abonar hoy, y la app lo rechazaría con `422` («no vence hasta…»). Es la misma regla que en la app.
   - No se recalcula nada: ni la `fecha_limite`, ni lo abonado. El importe del vale lo pone la app.
4. Devuelve **un item por apartado a vencer**, ordenados por `fecha_limite` (y por `id`), con sus campos (`id`, `cliente`, `producto`, `talla`, `fecha_limite`, …) más `hoy` y `activos` (el `total` de la búsqueda).
   - Solo cuenta los que tienen `estado` `activo`. `Buscar apartado` ya filtra por `estado`; es una red de seguridad.
   - Si la entrada no trae la lista `apartados` (por ejemplo, el Execute Workflow apunta a otro sub-workflow), **para con error** «Elegir los fuera de plazo: «Leer apartados activos» no ha devuelto { total, apartados }». Sin esta comprobación parecería un día sin vencidos.
   - Si no hay ninguno, devuelve un solo item `{ id: null, hoy, activos }`, igual que el `{ cuerpo: null }` del `09` y del `11`: un Code nunca devuelve 0 items.
5. IF `¿Hay apartados que vencer?`: `{{ !!$json.id }}` · Boolean · is true.
   - **false →** no se conecta nada: el flujo termina sin error y **sin correo** (decisión en la sección 5).

**Vencimiento**

6. `Vencer apartado`: `POST http://tienda:8000/api/apartados/{{ $json.id }}/vencer`, sin cuerpo (Send Body desactivado), credencial `API Tienda`.
   - **Options → Batching:** Items per Batch `1` y Batch Interval `0`, para que vayan de uno en uno.
   - **Options → Response:** **Include Response Headers and Status** y **Never Error**. Un `404` o un `422` no paran el flujo: van a la lista.
   - Las respuestas salen en el mismo orden que los items, como en el `09` y el `11`.

**Lista para la tienda** (`Preparar lista`, Code, Run Once for All Items)

7. Empareja por orden cada item de `Elegir los fuera de plazo` con su respuesta de `Vencer apartado`. Si no llegan tantas respuestas como apartados, para con error «Vencer apartado: se esperaban 4 respuestas y llegaron 1».
8. Según el `statusCode`:
   - **`200` → vencido:** se guardan el `apartado` y el `vale` **de la respuesta** (el `codigo` y el `importe` los da la app).
   - **`404` o `422` → no se ha podido vencer:** el apartado y el `detail` de la app. Por ejemplo, otro proceso lo venció entre la lectura y el `POST`.
   - **Cualquier otro código** (`401`, `5xx`): **para con error** y lo avisa el `08`.
     - Con **Never Error**, `Vencer apartado` intenta **todos** los `POST` aunque uno dé `500`: los que van después también se pueden vencer.
     - Por eso el mensaje lleva el código y el `detail` del primero que falla, los demás que fallan y **todos** los que se vencieron en esta ejecución, con su vale:
       - `Vencer apartado: la app respondió 500 en el apartado 14: Internal Server Error. Ya vencidos: 16 (VALE-00016), 15 (VALE-00015), 13 (VALE-00013)`;
       - `Vencer apartado: la app respondió 401 en el apartado 16: Falta la cabecera X-API-Key o no es válida (y en 3 más: 15, 14, 13). Ya vencidos: ninguno`.
     - Así la tienda no pierde la lista de lo que sí se venció: la siguiente ejecución ya no los ve, porque están `vencido`.
9. Devuelve `{ asunto, texto }` (sección 5).
10. `Enviar lista a la tienda` (Execute Workflow a `10 · Enviar notificación`, **Mode** Run once for each item, Wait For Sub-Workflow Completion). Workflow Inputs:
    - `para`: `tienda@pasofirme.example`;
    - `asunto`: `{{ $json.asunto }}`;
    - `texto`: `{{ $json.texto }}`;
    - `html` vacío.

El texto lo arma el Code, así que no hace falta escribirlo como expresión de una línea con `\n`.

### 4.2 Rama de recordatorios (HU-06) · construida y probada, Beste

**Estado:** rama construida por la pareja con los Code de `~/hu06/`, exportada y probada en n8n. Los parámetros de los 8 nodos HU-07 se conservaron; solo se reasignó la credencial local de `Vencer apartado` (la referencia importada no existía). La segunda conexión sale de `Leer apartados activos`, con los mismos disparadores de 3.1. La tabla local se llama `recordatorios enviados` (minúscula), ID seleccionado en ambos nodos.

```text
Leer apartados activos → Elegir los que vencen pronto → ¿Hay recordatorios?
  true → Leer recordatorios enviados → Descartar avisos ya enviados
       → ¿Quedan recordatorios por enviar? → true → ¿Tiene email para el recordatorio?
          true → Enviar recordatorio al cliente ──────────────────┐
          false → Avisar a la tienda: recordatorio sin email ─────┴→ Registrar recordatorio enviado
```

Los false de los IF de existencia terminan sin correo. La rama HU-07 conserva su conexión y todos sus nombres. No hay Merge que espere las dos ramas de email.

1. **`Elegir los que vencen pronto`**, Code Run Once for All Items (`~/hu06/1-elegir-los-que-vencen-pronto.js`). Exige un item `{total, apartados}` coherente. Calcula hoy por calendario **Europe/Madrid** con Intl y +7/+1 sumando días de calendario, también en cambios de mes/año/DST. Solo `estado=activo` y `fecha_limite` exactamente hoy+7 u hoy+1. No incluye hoy, vencidos, liquidados ni fechas intermedias. No recalcula `pendiente` ni `fecha_limite`: copia los valores de la app, solo formatea euros a dos decimales y fecha a dd/MM/yyyy. Rechaza fechas inválidas, IDs duplicados y datos necesarios inválidos en candidatos. Devuelve un item por apartado, orden fecha/id, con `id`, `apartado_id`, `dias` (7/1), `hoy`, cliente/producto/talla/pendiente/fecha_limite, `tiene_email`, `para`, `asunto`, `texto`. No devuelve el teléfono en la rama cliente. Sin candidatos: `{id:null,hoy}`; enlazado al item de entrada.
2. **`¿Hay recordatorios?`**, IF Boolean is true `{{ $json.id !== null }}`; false sin conexión.
3. **`Leer recordatorios enviados`**, Data table, Resource Row, Get, tabla **recordatorios enviados**, sin filtros, **Return All ON**, **Execute Once ON**, **Always Output Data ON**. Lee TODO el histórico una sola vez para todos los candidatos; tabla vacía produce `{}`. No usar Get por candidato con un vacío global: se podrían perder clientes. Sin Continue On Error ni retry.
4. **`Descartar avisos ya enviados`**, Code Run Once for All Items (`~/hu06/2-descartar-avisos-ya-enviados.js`). Lee `$input.all()` del histórico y `$('Elegir los que vencen pronto').all()`; descarta parejas existentes `(apartado_id,dias)`, independientemente de fecha. Una fila malformada es error, no «histórico vacío». Devuelve los no enviados (manteniendo sus datos), o `{id:null}`. Cada item lleva pairedItem para que la vinculación posterior sea inequívoca.
5. **`¿Quedan recordatorios por enviar?`**, IF Boolean is true `{{ $json.id !== null }}`; false sin conexión.
6. **`¿Tiene email para el recordatorio?`**, IF Boolean is true `{{ $json.tiene_email }}`. Email vacío/null/espacios: false; email no vacío pero inválido: error en el primer Code.
7. **`Enviar recordatorio al cliente`** (true) y **`Avisar a la tienda: recordatorio sin email`** (false), Execute Sub-workflow **10 · Enviar notificación**, **Run once for each item**, Wait For Sub-Workflow Completion ON. Inputs Expression de una línea, cada uno por separado: `para` = `{{ $json.para }}`, `asunto` = `{{ $json.asunto }}`, `texto` = `{{ $json.texto }}`; html vacío. Los `\n` están construidos en el Code, no como saltos físicos en Workflow Inputs. El Code prepara:
   - Con email: para = email del cliente, asunto `Tu apartado vence en 7 días: <producto>` o `Tu apartado vence mañana: <producto>`; texto con cliente, número de apartado, producto, talla si existe, pendiente de la app, fecha límite, pago en tienda o Bizum/transferencia con datos habituales, número de apartado en concepto y contacto para solicitar datos. No inventa teléfono, cuenta ni enlace de pago.
   - Sin email: para = `tienda@pasofirme.example`, asunto `Recordatorio sin email: <cliente> · vence en 7 días/mañana`; texto con teléfono (o «No consta; revisar la ficha del cliente»), datos del apartado, pendiente y fecha, pidiendo avisar por teléfono. Se avisa a la tienda como HU-01/HU-07: el cliente no está delante; guardar un aviso a tienda no significa email entregado al cliente.
8. **`Registrar recordatorio enviado`**, Data table Row Insert, misma tabla. Ambas salidas de envío llegan directamente aquí. Execute Once OFF; Stop Workflow; sin retries. Columnas (Expression): `apartado_id` Number = `{{ $('Descartar avisos ya enviados').item.json.apartado_id }}`; `dias` Number = `{{ $('Descartar avisos ya enviados').item.json.dias }}`; `fecha` String = `{{ $('Descartar avisos ya enviados').item.json.hoy }}`. Usar `.item`, no `.first()`: el sub-workflow devuelve `{enviado,para,asunto,messageId}`, no el apartado. Solo registrar tras un envío que terminó correctamente.

**Data table**: `recordatorios enviados`, columnas `apartado_id` Number, `dias` Number, `fecha` String, inicialmente vacía. `id`/fechas internas son de n8n. Clave lógica por apartado y aviso: el recordatorio 7 no bloquea el 1, y dos apartados de un mismo cliente se siguen por separado. #63 proponía Sheets; esta Data table cumple el registro persistente sin OAuth, igual que Configuración. No se exporta con el workflow: crear y volver a seleccionar al importar.

**Una sola vez:** no basta con programar una ejecución diaria; Probar a mano, un reinicio o una segunda ejecución pueden repetir. La consulta persistente elimina los ya enviados en ejecuciones secuenciales. No hay transacción SMTP+Insert ni unicidad compuesta en esta configuración: no ejecutar en paralelo. Si el email se envió y falla Insert, revisar Mailpit y registrar solo el aviso confirmado antes de reintentar. Si el envío queda incierto, revisar antes de repetir. No prometer exactly-once ante caídas o concurrencia ni activar retries automáticos de envío.

## 5. Salidas

| Destinatario | Canal | Cuándo | Qué incluye |
|---|---|---|---|
| App | `POST /api/apartados/{id}/vencer` | Por cada apartado `activo` con `fecha_limite` anterior a hoy | La app lo pasa a `vencido`, genera el vale y envía el webhook `apartado.vencido` |
| Tienda (`tienda@pasofirme.example`) | Correo con `10 · Enviar notificación` | Cuando hay al menos un apartado que vencer | La lista (abajo) |
| Cliente | Correo con su vale | Por cada apartado vencido | Lo envía el `01` al recibir el webhook (parte B, [specs/01-eventos-tienda.md](01-eventos-tienda.md)) |
| — | — | Día sin apartados fuera de plazo | Nada |

**Lista a la tienda:**

- **Asunto:** `Vencimientos del <dd/MM/yyyy>: <n> pares vuelven a la venta` (con uno, `1 par vuelve a la venta`). Si alguno falla, se añade ` · <m> con error`.
- **Texto:**

```text
Vencimientos del 27/10/2026: 4 apartados vencidos de 20 activos revisados.

ZAPATOS QUE VUELVEN A LA VENTA (4)
- Zapatilla running azul, talla 40 · apartado 16 · Paula Ramos · plazo hasta el 23/09/2026 · vale VALE-00016 de 5.00 €
- …

NO SE HAN PODIDO VENCER (0)
- Ninguno

Los vales los ha generado la app con lo abonado en cada apartado. Cada cliente recibe su vale por correo; si no tiene email, llega un aviso aparte para avisarle por teléfono.
```

  - Por cada par: `producto`, `talla` (si no la tiene, se omite), `id`, `cliente`, `fecha_limite` (`dd/MM/yyyy`) y el `codigo` y el `importe` del vale (2 decimales, valores de la app).
  - Los que no se han podido vencer: `producto`, `talla`, `id`, `cliente` y la respuesta de la app.
  - La lista no lleva `email` ni `telefono`: la tienda no los necesita para devolver los zapatos a la venta. Si falta el email, el aviso del `01` ya lleva el teléfono.

**Día sin vencidos: no se envía nada.** Decisión:
- La lista es para actuar (sacar los zapatos del almacén de apartados). Una lista vacía no pide nada, y la mayoría de los días no vence ningún apartado: con un correo diario «ningún apartado vencido hoy», Marisa se acostumbraría a no abrirlos. Es el mismo motivo que el de no avisar a la tienda en cada abono (AGENTS, sección 8).
- Un fallo no queda en silencio: lo avisa el `08`. Lo que no se ve es que el flujo no se ejecute (por ejemplo, despublicado), y eso tampoco lo resolvería el correo diario si nadie lo echa en falta. El informe mensual (HU-08) cuenta los vencidos de cada mes.
- No es lo mismo que el cierre diario (HU-04), que pide expresamente «si ese día no hubo movimientos, el resumen lo dice».

### Salidas HU-06

Cliente con email: un recordatorio +7/+1; sin email: un aviso a tienda con teléfono. Sin candidatos o todos ya enviados: ningún correo ni Insert. La Data table guarda solo ID, tipo de aviso y fecha, sin email/teléfono ni cuerpo bancario.

## 6. Casos de error

Como siempre, el `08` solo salta en las ejecuciones de producción (la programada con el flujo publicado). En una ejecución manual, el error se ve en el editor.

| Caso | Qué hace el flujo |
|---|---|
| Ningún apartado activo, o ninguno fuera de plazo | `¿Hay apartados que vencer?` va por false. Termina sin error y sin correo |
| Un apartado con `fecha_limite` igual a hoy | No se vence (paso 3); se vencerá mañana |
| `POST /vencer` responde `422` (ya vencido o liquidado, o todavía en plazo) o `404` | Ese apartado va a «No se han podido vencer» con el `detail`; los demás siguen |
| `POST /vencer` responde `401` u otro código que no es `200`, `404` ni `422` | `Preparar lista` para con error y lo avisa el `08`, con los apartados ya vencidos en el mensaje (paso 8). Los ya vencidos se quedan así y sus clientes reciben el vale por el `01` |
| `Buscar apartado` falla (`401`, la app no responde) | Falla `Leer apartados activos` con el mensaje genérico «Error executing workflow with item at index 0» y se para **antes de vencer nada**. Lo avisa el `08`; el motivo real está en la ejecución de `10 · Buscar apartado` ([specs/10-sub-workflows.md](10-sub-workflows.md), sección 6) |
| La app deja de responder a mitad de los `POST` | Falla `Vencer apartado` (Never Error no cubre una conexión rechazada) y lo avisa el `08`. Los que ya se vencieron no salen en ninguna lista; se ven en `GET /api/vales`, y sus clientes reciben el vale por el `01` |
| Falla `Enviar lista a la tienda` (Mailpit caído) | Lo avisa el `08` con el mensaje genérico del sub-workflow. Los apartados ya están vencidos: la lista se recupera en la ejecución (salida de `Preparar lista`) o con `GET /api/vales` |
| El `01` no está publicado cuando se vence | El webhook `apartado.vencido` recibe un `404` y se pierde (la app no reintenta): el cliente no recibe su vale. La tienda tiene el código en la lista y puede avisarle |
| Se ejecuta dos veces el mismo día | La segunda no vence nada: los apartados ya están `vencido` y `Buscar apartado` solo devuelve los `activo` |

### Errores HU-06

- Lista/API inválida o candidato con fecha/pendiente/email inválidos: error, sin enviar un recordatorio engañoso.
- Tabla inexistente, permisos/Get fallido o histórico malformado: parar; no interpretar como tabla vacía. El 08 avisa solo en producción.
- SMTP/sub-workflow falla: Stop Workflow. Run once for each item crea subejecuciones por cliente, pero si una falla después de envíos previos del mismo nodo, Insert puede no haber recibido NINGUNA salida de ese lote. Reconciliar TODAS las subejecuciones y Mailpit: completar filas de cada envío confirmado sin registro antes de reintentar, no solo el último que falló. No marcar el fallido como enviado.
- Insert falla tras enviar: reconciliar Mailpit y tabla antes de repetir; posible duplicado si se ignora el fallo.
- Sin teléfono ni email: aviso a tienda indicando que no consta teléfono para revisar ficha.
- Concurrencia: ejecutar secuencialmente; la tabla no garantiza exclusión atómica.

## 7. Prueba

**Datos:** los datos de ejemplo de la app, cargados el **21/10/2026** (`SEED=1`). El seed calcula las fechas desde el día en que se carga: si se vuelve a cargar otro día, cambian los apartados fuera de plazo.

Apartados `activo` con `fecha_limite` anterior al **27/10/2026**, según `GET /api/apartados?estado=activo` (solo lectura). Son 4 de 20 activos, y los 4 tienen email:

| id | cliente | producto | talla | `fecha_limite` | `abonado` | Vale esperado |
|---|---|---|---|---|---|---|
| 16 | Paula Ramos | Zapatilla running azul | 40 | 2026-09-23 | 5.00 | `VALE-00016` · 5.00 € |
| 15 | Sergio Delgado | Bota montaña | 38 | 2026-10-07 | 60.00 | `VALE-00015` · 60.00 € |
| 14 | Marta Molina | Botín piel negro | 36 | 2026-10-15 | 45.00 | `VALE-00014` · 45.00 € |
| 13 | Pablo Rubio | Bota montaña | 43 | 2026-10-22 | 30.00 | `VALE-00013` · 30.00 € |

Antes de la prueba: `GET /api/apartados/resumen` da 20 activos, 9 liquidados y 1 vencido (el 22, con `VALE-00022`). Los apartados 11 y 12 vencen mañana (`2026-10-28`): siguen activos y no se tocan.

**Preparación** (como en HU-13):

1. Copia de la base de datos, fuera del repo:

   ```bash
   docker compose cp tienda:/data/tienda.db ~/tienda-antes-hu07.db
   ```

2. Publicados: el `01` con la rama `apartado.vencido` (parte B), el `08`, `10 · Buscar apartado` y `10 · Enviar notificación`. El `06` no hace falta publicarlo para las pruebas manuales.

**Cómo se hizo la prueba real:** con la copia en `~/tienda-antes-hu07.db`, el `06` sin publicar y el `01` publicado. Primero las 2 pruebas de la rama del `01` por la Test URL ([specs/01-eventos-tienda.md](01-eventos-tienda.md), sección 7), después las pruebas 1 y 2. Al terminar se restauró la copia.

**Prueba 1 · primera ejecución** (`Probar a mano`, las dos partes juntas)

- `Leer apartados activos`: `total` 20.
- `Elegir los fuera de plazo`: 4 items, por este orden: 16, 15, 14 y 13.
- `Vencer apartado`: 4 respuestas `200`.
- **Lista a la tienda:** «Vencimientos del 27/10/2026: 4 pares vuelven a la venta», con «4 apartados vencidos de 20 activos revisados», los 4 pares de la tabla y 0 que no se han podido vencer.
- **Correos a los clientes** (del `01`, uno por webhook): a `paula16@example.com`, `sergio15@example.com`, `marta14@example.com` y `pablo13@example.com`, cada uno con su código y su importe. Ninguno va a la tienda por falta de email.
- En Mailpit, 5 correos. En las ejecuciones: la del `06` (con sus sub-ejecuciones) y 4 del `01`, cada una con su sub-ejecución de `Enviar notificación`.
- **En la app:** `resumen` da 16 activos, 9 liquidados y 5 vencidos. `GET /api/vales` da 5 vales: `VALE-00022` y los 4 nuevos, con la `fecha` de hoy y el `importe` de la tabla. La app no tiene página de vales: cada vale se ve en la página de su apartado.

**Prueba 2 · segunda ejecución**

- `Leer apartados activos`: `total` 16.
- `Elegir los fuera de plazo` da `{ id: null }` y `¿Hay apartados que vencer?` va por false.
- No se ejecuta ningún `POST` y no llega ningún correo. El `resumen` sigue en 16 / 9 / 5.

**Prueba 3 · respuestas que no son `200`** (sin cambiar datos)

Con pin data en la salida de `Leer apartados activos`: un item `{ total: 2, apartados: [...] }` con
- el apartado 22 (`GET /api/apartados/22`, ya `vencido`, `fecha_limite` 2026-09-11), cambiando su `estado` a `activo` en el pin data;
- y un apartado inventado con `id` 9999 y `fecha_limite` pasada.

Resultado esperado:
- `Vencer apartado`: un `422` («El apartado ya está vencido») y un `404` («Apartado no encontrado»);
- la lista: «0 pares vuelven a la venta · 2 con error», con los dos en «No se han podido vencer» y la respuesta de la app.

No cambia nada en la app. Al terminar, quitar el pin data.

**Prueba 4 · disparador programado** (opcional): al publicar el `06`, se ejecuta solo a las 9:00 del día siguiente. Ojo: vencerá **de verdad** los apartados fuera de plazo de ese día (los 4 de la tabla y, desde el 29/10, también el 11 y el 12).

**Al terminar:** restaurar la copia y reiniciar la app.

```bash
docker compose cp ~/tienda-antes-hu07.db tienda:/data/tienda.db
docker compose restart tienda
```

La app no vuelve a cargar el seed al reiniciar, porque la base de datos no está vacía (`backend/main.py`).

> **Por qué restaurar:** las pruebas vencen 4 apartados de verdad. Sin restaurar, las pruebas de otros flujos que cuentan con ellos como activos dejarían de cuadrar (por ejemplo, el total pendiente de cobro y los vencidos de octubre del informe mensual, [specs/07-informe-mensual.md](07-informe-mensual.md)).

**Comprobado en local con node** (sin n8n ni `POST`): el filtro y la lista, con el `GET` real de los activos y las respuestas de `/vencer` construidas según `backend/models/apartado.py`. Salen los 4 apartados de la tabla, en ese orden, y la lista de la sección 5. Con un `422` simulado en el 14, la lista da 3 vencidos y 1 con error. Con los activos que quedan después, `Elegir los fuera de plazo` da `{ id: null }`. Con el código de los 2 Code (HU-07, `~/hu07/`) se repitieron las pruebas 1, 2 y 3 (el `9999` sale primero, por su `fecha_limite`) y los casos de `500` y `401` del paso 8, con los mensajes de arriba.

**Resultado real** (coincide con el esperado):

- **Prueba 1:**
  - `Leer apartados activos`: `total` 20. `Elegir los fuera de plazo`: 4 items (16, 15, 14 y 13). `Vencer apartado`: 4 respuestas `200`.
  - En Mailpit, 5 correos:
    - la lista «Vencimientos del 27/10/2026: 4 pares vuelven a la venta», con «4 apartados vencidos de 20 activos revisados», los 4 pares con su vale y 0 con error;
    - los 4 vales del `01`, a `paula16`, `sergio15`, `marta14` y `pablo13` (5.00, 60.00, 45.00 y 30.00 €).
  - En la app: `resumen` 16 activos / 9 liquidados / 5 vencidos; `GET /api/vales` da `VALE-00022` y los 4 nuevos, con fecha 27/10/2026.
  - La página del apartado 15 muestra «Vale de compra VALE-00015 por 60,00 €»: es la suma de sus abonos (10 + 20 + 20 + 10). El importe lo pone la app; n8n no lo calcula.
- **Prueba 2:** `Elegir los fuera de plazo` da `{ id: null }`, el IF va por false y no hay ningún `POST` ni correo.
- **Prueba 3: no se hizo** en n8n. Los caminos de `422`, `404`, `500` y `401` están comprobados en local con node, con el mismo código («Código de los nodos Code · HU-07», `docs/ai-log.md`).
- **Prueba 4: no se hizo.** El `06` no se ha publicado (nota de alcance).

**Evidencias:**
- Lista a la tienda en Mailpit: [docs/evidencias/06-hu07-lista-tienda.png](../docs/evidencias/06-hu07-lista-tienda.png)
- Vale de Sergio Delgado (prueba 1): [docs/evidencias/06-hu07-vale-cliente.png](../docs/evidencias/06-hu07-vale-cliente.png)
- Pestaña Vencidos de la app (22, 16, 15, 14 y 13): [docs/evidencias/06-hu07-vencidos-en-la-app.png](../docs/evidencias/06-hu07-vencidos-en-la-app.png)
- Apartado 15 con su vale: [docs/evidencias/06-hu07-vale-en-la-app.png](../docs/evidencias/06-hu07-vale-en-la-app.png)
- Aviso a la tienda de un vencido sin email (`01`): [docs/evidencias/06-hu07-sin-email.png](../docs/evidencias/06-hu07-sin-email.png)
- Segunda ejecución, por la rama false: [docs/evidencias/06-hu07-segunda-ejecucion.png](../docs/evidencias/06-hu07-segunda-ejecucion.png)

### Prueba HU-06 · preparación y resultados reales

Guía exacta: `~/hu06/LEEME.md`. La pareja construyó los nodos; después autorizó al agente a aplicar dos correcciones locales y completar pruebas, capturas, restauración y export. No se publicó 06.

**Baseline real del 28/10/2026:** 16 activos, 0 con fecha límite hoy+7/hoy+1; fuera de plazo IDs 16,15,14,13. Volver a consultar el día de la prueba; seed/abonos de otras HU pueden cambiar datos. No copiar las cifras históricas de HU-07 como baseline actual.

1. Desde carpeta principal, copia `docker compose cp tienda:/data/tienda.db ~/tienda-antes-hu06.db`; comprobar antes de cambiar datos. No sobrescribir copia previa sin comprobarla.
2. Crear Nora Prueba con email (fecha hoy−83, precio 60, inicial 20) y Hugo Prueba sin email con teléfono (hoy−89, precio 50, inicial 10). Ambos pendiente 40 de la app; límites +7/+1. Guardar IDs reales. Los curl exactos están en LEEME.
3. Separar confirmaciones de alta del 01; guardar evidencias previas antes de limpiar mensajes de prueba en Mailpit. Tabla vacía solo si no hay histórico real.
4. `Probar a mano` primera vez: Nora recibe «7 días», 40.00 €, límite; tienda recibe Hugo «mañana» con teléfono. Dos filas (IDs reales, dias 7/1, fecha de hoy), más los candidatos reales que existan. La rama HU-07 también vence los fuera de plazo: con el baseline son 4 vales y lista adicionales si 01 está publicado. No contarlos como duplicados HU-06.
5. Segunda ejecución: sin recordatorios nuevos, sin filas adicionales; IF de pendientes false. Registrar IDs de ejecución y cantidades antes/después.
6. Restaurar SIEMPRE desde carpeta principal: `docker compose cp ~/tienda-antes-hu06.db tienda:/data/tienda.db` y `docker compose restart tienda`. Borrar solo filas de prueba por IDs Nora/Hugo, no histórico real. Verificar restauración. La Data table no se restaura con tienda.db.
7. Capturas guardadas: `docs/evidencias/06-hu06-primera-ejecucion.png`, `06-hu06-nora-mailpit.png`, `06-hu06-hugo-sin-email-mailpit.png`, `06-hu06-tabla-primera.png`, `06-hu06-segunda-ejecucion.png`.

**Pruebas locales realizadas:** `node --test ~/hu06/test-hu06.cjs`, 4/4: filtro/mensajes/importes sin recalcular, sentinel/entrada inválida, calendario Madrid (medianoche, año, DST), histórico vacío con dos candidatos/deduplicación secuencial/7 no bloquea 1/histórico inválido. Se observaron fallar antes de implementar y pasar después. No acreditan SMTP, Data tables ni n8n. Resultados reales n8n: se detallan a continuación, sin confundir la ejecución manual con la programada.

### Resultados HU-06 · 28/10/2026

- Copia previa `~/tienda-antes-hu06.db`, integridad SQLite `ok`, tomada desde carpeta principal. No se sobrescribió una copia previa.
- Creación real autorizada: **Nora ID 25**, email, fecha límite **04/11/2026** (+7), pendiente **40.00 €**; **Hugo ID 26**, sin email, teléfono ficticio, límite **29/10/2026** (+1), pendiente **40.00 €**. Los valores se comprobaron en las respuestas de la app.
- [Primera ejecución #45](http://localhost:5678/workflow/LEG1cBDsrLXn6wL2/executions/45), **Succeeded, 1.934 s**, Probar a mano: 18 activos; rama HU-07 vence 16/15/14/13 y envía lista + 4 vales. HU-06 elige 25/26: Nora recibe «Tu apartado vence en 7 días: Sandalia cuero» con 40.00 € y 04/11/2026; tienda recibe «Recordatorio sin email: Hugo Prueba · vence mañana» con teléfono 600 444 555, 40.00 € y 29/10/2026. Data table: exactamente dos filas `(25,7,2026-10-28)` y `(26,1,2026-10-28)`.
- [Segunda ejecución #58](http://localhost:5678/workflow/LEG1cBDsrLXn6wL2/executions/58), **Succeeded, 427 ms**: 14 activos, cero nuevos vencimientos, histórico con 2 filas, `Descartar avisos ya enviados` da `{id:null}` y el IF corta. **Ningún email nuevo**, ni recordatorio ni vencimiento. Mailpit antes/después: 13 mensajes, los mismos dos IDs de recordatorio. No se borraron emails de otras HU para probar: se compararon IDs y cantidades exactas.
- Restauración completada desde carpeta principal y reinicio de tienda. GET posterior: **16 activos**, fuera de plazo **16/15/14/13**, **ningún Nora/Hugo**. Se borraron únicamente las dos filas de prueba de la Data table; total final **0**. Se conservaron los emails como evidencia.
- Export con `COMPOSE_PROJECT_NAME=zapateria-paso-firme python3 scripts/flujos.py exportar`. Se restauraron los otros JSON rastreados y se apartaron los exports nuevos 03/05 fuera del worktree, sin añadirlos a esta PR. 06 sigue `active:false`.
- Comprobación del export: 17 nodos; parámetros de los 8 nodos previos sin cambios; los dos Code coinciden con sus fuentes probadas. n8n-mcp: **0 errores, 1 aviso intencional Execute Once** en Get de histórico. Suite local 4/4. La hora de las 9:00 y Error workflow se mantienen; no se ha probado programación ni error de producción.

**Capturas HU-06:**

- [Primera ejecución, ambas ramas](../docs/evidencias/06-hu06-primera-ejecucion.png)
- [Nora: 7 días, pendiente y fecha](../docs/evidencias/06-hu06-nora-mailpit.png)
- [Hugo: aviso a tienda con teléfono](../docs/evidencias/06-hu06-hugo-sin-email-mailpit.png)
- [Data table con 2 filas](../docs/evidencias/06-hu06-tabla-primera.png)
- [Segunda ejecución, sin envíos](../docs/evidencias/06-hu06-segunda-ejecucion.png)
- [Segunda ejecución: Succeeded e ID](../docs/evidencias/06-hu06-segunda-estado.png)
- [Resultados estructurados](../docs/evidencias/06-hu06-resultados.json) y [validación](../docs/evidencias/06-hu06-validacion.json)

## 8. Criterios de aceptación

**HU-07 · Apartados vencidos con su vale** (flujo 6):

- [x] Los apartados fuera de plazo se vencen por API y la app genera el vale (pruebas 1 y 2).
- [x] El cliente recibe un mensaje con el código y el importe de su vale. Se cumple en el `01`, rama `apartado.vencido` ([specs/01-eventos-tienda.md](01-eventos-tienda.md)), y se comprobó de extremo a extremo en la prueba 1.
- [x] Marisa recibe la lista de zapatos que vuelven a la venta (prueba 1).

Las pruebas se lanzaron a mano: el disparador de cada mañana no se ha probado, porque el `06` está sin publicar.

**HU-06 · Recordatorios de vencimiento** (Beste, sección 4.2):

- [ ] Cada mañana se avisa a los clientes cuyo plazo vence en 7 días y en 1 día.
- [x] Cada cliente recibe cada aviso una sola vez (pruebas secuenciales #45 y #58; límites de caídas/concurrencia en 4.2).
- [x] El mensaje incluye lo que falta por pagar y la fecha límite (correos Nora/Hugo, valores de la app).

Construcción y dos pruebas manuales completas. El primer criterio queda sin marcar porque «cada mañana» exige comprobar una ejecución programada después de revisión/publicación humana; la selección +7/+1 sí está verificada manualmente. El 06 sigue sin publicar, como se pidió.

## 9. Preguntas para la pareja

1. **Validez y uso del vale.** La app no dice cuánto dura un vale ni cómo se marca como usado (`usado` es `0`, sin endpoint para cambiarlo). El correo al cliente no pone caducidad. ¿Tiene caducidad el vale? Si la tiene, hay que añadirla al texto.
2. **Hora.** Se ha elegido las 9:00 suponiendo que la tienda abre después. ¿A qué hora abre?
3. **Día sin vencidos.** Se ha decidido no enviar nada (sección 5). Si Marisa prefiere un correo diario para saber que el flujo funciona, habría que conectar la rama false de `¿Hay apartados que vencer?` a `Preparar lista` y que `Preparar lista` lea `Vencer apartado` solo si se ejecutó (`isExecuted`, como en el `09`).

## Extensión de estilo IA (#121)

Esta versión añade tres nodos solo en la rama de email del cliente, después de decidir a quién corresponde avisar. El modelo redacta introducción/despedida genéricas; no recibe datos del cliente ni cifras. El bloque de datos de la API y el texto original se conservan completos, con fallback a la plantilla si la respuesta no es válida.

Diseño, configuración, resultados reales y límites: [docs/recordatorios-ia.md](../docs/recordatorios-ia.md). Prueba aislada n8n #70: dos items, dos emails, 40.00 €/04-11 y 12.50 €/29-10 sin cambios. La rama completa y el Schedule no se reejecutaron en esta tarea; revisión humana antes de publicar.
