# Flujo 06 · Recordatorios y vencimientos

> **Alcance de esta versión:** spec de la **rama de vencimientos** (HU-07, criterios 1 y 3): cada mañana se vencen por API los apartados fuera de plazo y la tienda recibe la lista de zapatos que vuelven a la venta. El criterio 2 (el vale al cliente) va en el `01`, rama `apartado.vencido` ([specs/01-eventos-tienda.md](01-eventos-tienda.md)). La **rama de recordatorios** (HU-06) la añadirá Beste en este mismo workflow (sección 4.2, pendiente). Todavía no está construido.

## 1. Cabecera

- **Flujo:** `06 · Recordatorios y vencimientos` (`workflows/06-recordatorios-vencimientos.json`), flujo 6 del README.
- **HU:** HU-07 · Apartados vencidos con su vale (#64; sub-issues #65–#69). HU-06 · Recordatorios de vencimiento, pendiente (Beste).
- **Nivel:** Medio.
- **Responsable:** Esra (vencimientos) · Beste (recordatorios).
- **Credenciales y variables:**
  - `API Tienda` (Header Auth), en `Vencer apartado`;
  - los sub-workflows `10 · Buscar apartado` (usa `API Tienda`) y `10 · Enviar notificación` (usa `Mailpit`).
  - Ver [docs/credenciales.md](../docs/credenciales.md).
- **Error Workflow:** `08 · Error Workflow`.
- **Settings:** zona horaria `Europe/Madrid`.

## 2. Objetivo

Que los apartados que se han pasado de plazo se cierren solos cada mañana, la app genere el vale con lo abonado y la tienda sepa qué zapatos vuelven a la venta, sin revisarlos uno a uno.

## 3. Disparador y entradas

### 3.1 Disparadores

- **`Cada mañana a las 9:00`** (Schedule Trigger):
  - **Trigger Interval** Days, **Days Between Triggers** `1`, **Trigger at Hour** 9am y **Trigger at Minute** `0`. Todos los días, también el domingo.
  - Equivale a la expresión cron `0 9 * * *`.
  - Solo funciona con el flujo publicado (lo publica la pareja).
  - **Por qué todos los días:** el disparador será el mismo para los recordatorios de HU-06, y un aviso de «vence en 1 día» no puede saltarse el domingo. Para los vencimientos da igual: el que vence en domingo se vence ese día y la tienda ve la lista el lunes.
  - **Por qué a las 9:00, por la mañana:**
    - El README dice «cada mañana», y así la dependienta tiene la lista al abrir.
    - No se cruza con el cierre diario ni con el datáfono, que son por la noche (HU-13 a las 22:00, antes del cierre). Vencer no crea ventas ni abonos, así que no cambia el cierre de ningún día.
    - No va cerca de medianoche. La app decide si un apartado está fuera de plazo con su propia fecha (`date.today()`, contenedor con `TZ=Europe/Madrid`). A las 9:00 n8n (`Europe/Madrid`) y la app tienen el mismo «hoy».
- **`Probar a mano`** (Manual Trigger), para las pruebas: se elige en el desplegable de **Execute workflow**. Se ejecutan los mismos nodos que en la programada. Una ejecución manual no hace saltar el `08`.

### 3.2 Entradas

No recibe datos: lee de la app los apartados `activo` con `10 · Buscar apartado`. Campos del Apartado que usa (ontología): `id`, `cliente`, `producto`, `talla`, `fecha_limite`, `estado`; y del Vale que devuelve `POST /vencer`: `codigo` e `importe`.

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

1. `Leer apartados activos` (Execute Workflow a `10 · Buscar apartado`):
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

### 4.2 Rama de recordatorios (HU-06) · pendiente, Beste

Esta sección la escribe Beste. Para que las dos ramas convivan en el mismo workflow:

- **Disparadores:** puede usar los mismos (`Cada mañana a las 9:00` y `Probar a mano`). Por eso el Schedule va todos los días (3.1).
- **Lectura:** puede salir del mismo `Leer apartados activos` (una segunda conexión desde su salida) en vez de llamar otra vez a `Buscar apartado`.
- **No se pisan:** los recordatorios son para los apartados con `fecha_limite` igual a hoy + 7 o hoy + 1, y los vencimientos para los de `fecha_limite` anterior a hoy. Un mismo apartado nunca está en las dos ramas el mismo día.
- **Nombres de nodo:** los de la sección 4.1 ya están usados; los suyos tienen que ser distintos.
- **Envío:** con `10 · Enviar notificación`, Mode Run once for each item (un recordatorio por cliente: es justo el caso que motivó la regla).
- Quedan para su spec: cómo se cumple «cada aviso una sola vez», qué hacer con un cliente sin email y la prueba.

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

**Prueba 1 · primera ejecución** (`Probar a mano`, las dos partes juntas)

- `Leer apartados activos`: `total` 20.
- `Elegir los fuera de plazo`: 4 items, por este orden: 16, 15, 14 y 13.
- `Vencer apartado`: 4 respuestas `200`.
- **Lista a la tienda:** «Vencimientos del 27/10/2026: 4 pares vuelven a la venta», con «4 apartados vencidos de 20 activos revisados», los 4 pares de la tabla y 0 que no se han podido vencer.
- **Correos a los clientes** (del `01`, uno por webhook): a `paula16@example.com`, `sergio15@example.com`, `marta14@example.com` y `pablo13@example.com`, cada uno con su código y su importe. Ninguno va a la tienda por falta de email.
- En Mailpit, 5 correos. En las ejecuciones: la del `06` (con sus sub-ejecuciones) y 4 del `01`, cada una con su sub-ejecución de `Enviar notificación`.
- **En la app:** `resumen` da 16 activos, 9 liquidados y 5 vencidos. `GET /api/vales` da 5 vales: `VALE-00022` y los 4 nuevos, con la `fecha` de hoy y el `importe` de la tabla.

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

**Prueba 4 · disparador programado** (opcional, después de restaurar): al publicar el `06`, se ejecuta solo a las 9:00 del día siguiente. Ojo: vencerá **de verdad** los apartados fuera de plazo de ese día (los 4 de la tabla y, desde el 29/10, también el 11 y el 12). Si no se quiere, se despublica después de las pruebas manuales.

**Al terminar:** restaurar la copia y reiniciar la app.

```bash
docker compose cp ~/tienda-antes-hu07.db tienda:/data/tienda.db
docker compose restart tienda
```

La app no vuelve a cargar el seed al reiniciar, porque la base de datos no está vacía (`backend/main.py`).

> **Por qué restaurar:** las pruebas vencen 4 apartados de verdad. Sin restaurar, las pruebas de otros flujos que cuentan con ellos como activos dejarían de cuadrar (por ejemplo, el total pendiente de cobro y los vencidos de octubre del informe mensual, [specs/07-informe-mensual.md](07-informe-mensual.md)).

**Comprobado en local con node** (sin n8n ni `POST`): el filtro y la lista, con el `GET` real de los activos y las respuestas de `/vencer` construidas según `backend/models/apartado.py`. Salen los 4 apartados de la tabla, en ese orden, y la lista de la sección 5. Con un `422` simulado en el 14, la lista da 3 vencidos y 1 con error. Con los activos que quedan después, `Elegir los fuera de plazo` da `{ id: null }`. Con el código de los 2 Code (HU-07, `~/hu07/`) se repitieron las pruebas 1, 2 y 3 (el `9999` sale primero, por su `fecha_limite`) y los casos de `500` y `401` del paso 8, con los mensajes de arriba.

**Evidencias previstas:**
- Lista a la tienda en Mailpit: `docs/evidencias/06-hu07-lista-tienda.png`
- Correo con el vale a un cliente: `docs/evidencias/06-hu07-vale-cliente.png`
- Los 5 vales en la app (`GET /api/vales` o la página de vales): `docs/evidencias/06-hu07-vales-en-la-app.png`
- Segunda ejecución, por la rama false: `docs/evidencias/06-hu07-segunda-ejecucion.png`
- Prueba 3, lista con los dos errores: `docs/evidencias/06-hu07-errores.png`

## 8. Criterios de aceptación

**HU-07 · Apartados vencidos con su vale** (flujo 6):

- [ ] Los apartados fuera de plazo se vencen por API y la app genera el vale (pruebas 1 y 2).
- [ ] El cliente recibe un mensaje con el código y el importe de su vale. Se cumple en el `01`, rama `apartado.vencido` ([specs/01-eventos-tienda.md](01-eventos-tienda.md)); aquí se comprueba de extremo a extremo en la prueba 1.
- [ ] Marisa recibe la lista de zapatos que vuelven a la venta (prueba 1).

**HU-06 · Recordatorios de vencimiento:** pendiente (Beste, sección 4.2).

## 9. Preguntas para la pareja

1. **Validez y uso del vale.** La app no dice cuánto dura un vale ni cómo se marca como usado (`usado` es `0`, sin endpoint para cambiarlo). El correo al cliente no pone caducidad. ¿Tiene caducidad el vale? Si la tiene, hay que añadirla al texto.
2. **Hora.** Se ha elegido las 9:00 suponiendo que la tienda abre después. ¿A qué hora abre?
3. **Día sin vencidos.** Se ha decidido no enviar nada (sección 5). Si Marisa prefiere un correo diario para saber que el flujo funciona, habría que conectar la rama false de `¿Hay apartados que vencer?` a `Preparar lista` y que `Preparar lista` lea `Vencer apartado` solo si se ejecutó (`isExecuted`, como en el `09`).
