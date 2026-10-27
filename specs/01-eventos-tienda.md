# Flujo 01 · Eventos de la tienda

> **Alcance de esta versión:** router (webhook + Switch), rama de HU-01 (`apartado.creado`), rama de HU-02 (`abono.registrado`) y rama de HU-09 (`venta.registrada`, flujo 4). Queda pendiente:
> `apartado.vencido` → HU-07 (aviso de vencido, flujo 6).
>
> **En esta versión (#95):** los 2 correos de la rama HU-01 se envían con el sub-workflow `10 · Enviar notificación` ([specs/10-sub-workflows.md](10-sub-workflows.md)). Es el ejemplo de uso de #95. Los demás Send Email del `01` (HU-02 y HU-09) no cambian. Pendiente de construir y probar en n8n.

## 1. Cabecera

- **Flujo:** `01 · Eventos de la tienda` (`workflows/01-eventos-tienda.json`)
- **HU:** HU-01, HU-02, HU-09 · HU-07 (rama pendiente)
- **Nivel:** Esencial (router, HU-01, HU-02) · Medio (HU-09, HU-07)
- **Responsable:** Esra
- **Credenciales y variables:** `Mailpit` (SMTP; en la rama HU-01 la usa el sub-workflow `10 · Enviar notificación`) y la Data table `Configuración` (umbral de venta grande), ver [docs/credenciales.md](../docs/credenciales.md). El webhook no lleva autenticación.

## 2. Objetivo

Recibir en un único webhook todos los avisos de la app, repartir cada uno a su rama según el `evento` y avisar por correo: al cliente, confirmación al crear un apartado (o aviso a la tienda si no tiene email) y recibo de cada abono (o aviso de que puede recoger sus zapatos si queda liquidado); a la tienda, cada venta que supere el umbral que decide Marisa.

## 3. Disparador y entradas

- **Disparador:** nodo Webhook `Evento de la tienda`, `POST` con Path `tienda` (Production URL `http://n8n:5678/webhook/tienda`, la que usa la app).
- **Entradas:** el aviso de la app, `{ "evento": ..., "datos": ... }`, que n8n guarda dentro de `body`:
  - `$json.body.evento`: `apartado.creado`, `abono.registrado`, `venta.registrada` o `apartado.vencido`.
  - `$json.body.datos`: el Apartado (más `importe` del Abono en `abono.registrado`), la Venta, o `{ apartado, vale }` en `apartado.vencido`. Ver [docs/guia-de-la-app.md](../docs/guia-de-la-app.md#6-el-webhook-app--n8n).
- **Rama HU-01** (`apartado.creado`), campos del Apartado que usa: `id`, `cliente`, `email`, `producto`, `talla`, `precio`, `abonado`, `pendiente`, `fecha_limite`.
- **Rama HU-02** (`abono.registrado`), campos que usa: del Apartado ya actualizado, `email`, `cliente`, `producto`, `talla`, `precio`, `abonado`, `pendiente`, `fecha_limite` y `estado` (estado después del abono); del Abono, `importe` (lo que se acaba de pagar).
- **Rama HU-09** (`venta.registrada`), campos de la Venta que usa: `id`, `fecha`, `concepto`, `importe` y `forma_pago`. Además lee el umbral de la Data table `Configuración` de n8n (fila con `clave` `umbral_venta_grande`, columna `valor`). No es una entidad de la app: es configuración de n8n, ver [docs/credenciales.md](../docs/credenciales.md#data-tables-de-n8n).

## 4. Pasos y reglas

**Router**

1. `Evento de la tienda` recibe el `POST` y responde a la app en el momento (opción por defecto del nodo).
2. `Según el evento` (Switch, comparación exacta y sensible a mayúsculas sobre `{{ $json.body.evento }}`) envía el item por una de sus 5 salidas:
   - `apartado.creado` → rama HU-01
   - `abono.registrado` → rama HU-02
   - `venta.registrada` → rama HU-09
   - `apartado.vencido` (sin conectar todavía)
   - `Evento desconocido` (salida de respaldo: cualquier otro valor o sin `evento`)

**Rama HU-01 · Confirmación de apartado** (salida `apartado.creado`)

3. IF `¿Tiene email?`: **Sí** si `{{ $json.body.datos.email }}` no está vacío; **No** si está vacío o es `null`.
4. **Sí →** `Enviar confirmación al cliente` (Execute Workflow a `10 · Enviar notificación`, ver abajo): `para` = `datos.email`, con `producto`, `talla`, `precio`, `abonado`, `pendiente` y `fecha_limite` del apartado. Los importes son los que da la app, solo formateados con 2 decimales (`$json.body.datos.precio.toFixed(2)`); no se recalculan. La `fecha_limite` se muestra como `dd/MM/yyyy` (`DateTime.fromISO($json.body.datos.fecha_limite).toFormat('dd/MM/yyyy')`).
5. **No →** `Avisar a la tienda: sin email` (Execute Workflow a `10 · Enviar notificación`): `para` = `tienda@pasofirme.example`. Avisa de que no se pudo enviar la confirmación e incluye `id`, `cliente`, `telefono` (o «sin teléfono» si no lo tiene) y `producto` con su `talla`.

**Cómo se configuran los 2 nodos de la rama HU-01** (#95):
- **Antes** eran Send Email con credencial `Mailpit`, From `tienda@pasofirme.example` y sin firma de n8n.
- **Ahora** son **Execute Workflow** (versión 1.4) con el mismo nombre y las mismas conexiones:
  - **Workflow:** `10 · Enviar notificación` (Source Database, From list).
  - **Mode:** Run once for each item (regla de [specs/10-sub-workflows.md](10-sub-workflows.md), sección 3).
  - **Options → Wait For Sub-Workflow Completion:** activado.
  - El remitente, la credencial y la firma los pone el sub-workflow.
- **Workflow Inputs:** `para`, `asunto` y `texto`; `html` vacío. Los campos son de una sola línea, así que `texto` es **una sola expresión con `\n`**, como el `texto` del `08`.
- El correo que llega es **el mismo** que antes, con el mismo asunto, las mismas líneas y el mismo formato. Se comprobó en local con los payloads de prueba (sección 7).

| Nodo | `para` | `asunto` |
|---|---|---|
| `Enviar confirmación al cliente` | `{{ $json.body.datos.email }}` | `Tu apartado en Paso Firme: {{ $json.body.datos.producto }}` |
| `Avisar a la tienda: sin email` | `tienda@pasofirme.example` | `Apartado {{ $json.body.datos.id }} sin email: no se envió la confirmación` |

`texto` de `Enviar confirmación al cliente`:

```text
{{ 'Hola ' + $json.body.datos.cliente + ':\n\nHemos registrado tu apartado n.º ' + $json.body.datos.id + ' en Zapatería Paso Firme.\n\nModelo: ' + $json.body.datos.producto + '\nTalla: ' + $json.body.datos.talla + '\nPrecio: ' + $json.body.datos.precio.toFixed(2) + ' €\nAbonado: ' + $json.body.datos.abonado.toFixed(2) + ' €\nPendiente: ' + $json.body.datos.pendiente.toFixed(2) + ' €\nFecha límite: ' + DateTime.fromISO($json.body.datos.fecha_limite).toFormat('dd/MM/yyyy') + '\n\nPuedes pagar lo pendiente en abonos de cualquier importe antes de la fecha límite.\n\nGracias,\nZapatería Paso Firme' }}
```

`texto` de `Avisar a la tienda: sin email`:

```text
{{ 'No se pudo enviar la confirmación del apartado porque el cliente no tiene email.\n\nApartado: ' + $json.body.datos.id + '\nCliente: ' + $json.body.datos.cliente + '\nTeléfono: ' + ($json.body.datos.telefono || 'sin teléfono') + '\nProducto: ' + $json.body.datos.producto + ' (talla ' + $json.body.datos.talla + ')\n\nAvisad al cliente por teléfono o en la tienda.' }}
```

**Rama HU-02 · Recibo de abono** (salida `abono.registrado`)

6. IF `¿Tiene email? (abono)`: **Sí** si `{{ $json.body.datos.email }}` no está vacío; **No** si está vacío o es `null` → termina sin enviar nada (ver decisión en [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)).
7. IF `¿Liquidado?`: **Sí** si `{{ $json.body.datos.estado }}` es igual a `liquidado`.
8. **No liquidado →** `Enviar recibo del abono` (Send Email, credencial `Mailpit`): From `tienda@pasofirme.example`, To `datos.email`, con `producto`, `talla`, `importe` (lo que acaba de pagar), `abonado`, `pendiente` (2 decimales, valores de la app) y `fecha_limite` (`dd/MM/yyyy`).
9. **Liquidado →** `Avisar de que puede recoger` (Send Email, credencial `Mailpit`): From `tienda@pasofirme.example`, To `datos.email`, con `producto`, `talla`, `importe` del último abono y `abonado` (total pagado, valor de la app), con 2 decimales. Sin `pendiente` ni `fecha_limite`.

**Rama HU-09 · Aviso de ventas grandes** (salida `venta.registrada`, flujo 4)

El umbral no se guarda en el flujo ni en una Variable de n8n (`$vars`), porque nuestra versión community las tiene bloqueadas («Upgrade to unlock variables»). Se guarda en la Data table `Configuración`, y Marisa lo cambia en la tabla sin editar el flujo (ver [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)).

10. `Leer umbral de venta grande` (Data table, Resource **Row**, Operation **Get**):
    - Data table: `Configuración` (From list).
    - Must Match: **All Conditions**. Conditions: Column `clave`, Condition **Equals**, Value `umbral_venta_grande`.
    - Return All: desactivado; Limit: `1` (si hubiera filas repetidas, solo se usa una y no se envían avisos duplicados).
    - Settings → **Always Output Data**: activado. Sin esta opción, si no hay fila el nodo no devuelve nada, la ejecución termina ahí y el siguiente IF no llega a ejecutarse (no habría error que avisar).
    - Tras este nodo, `$json` es la fila de la tabla (`$json.valor`), ya no el aviso de la app. Los datos de la venta se leen con `$('Evento de la tienda').item.json.body.datos`.
11. IF `¿Hay umbral?`: **Sí** si `{{ $json.valor }}` (Number) **is not empty**. **No** si no hay fila o el `valor` está vacío.
12. **No →** `Falta el umbral` (Stop and Error, Error Type **Error Message**), con Error Message `Falta el umbral de venta grande en la Data table Configuración`. La ejecución falla y la recoge el Error Workflow `08` (ver [specs/08-error-workflow.md](08-error-workflow.md)).
13. **Sí →** IF `¿Venta grande?`: **Sí** si `{{ $('Evento de la tienda').item.json.body.datos.importe }}` (Number) **is greater than** `{{ $json.valor }}`. La comparación es estricta: una venta igual al umbral no avisa.
14. **Venta grande →** `Avisar a la tienda: venta grande` (Send Email, credencial `Mailpit`): From y To `tienda@pasofirme.example`.
    - Subject: `=Venta grande: {{ $('Evento de la tienda').item.json.body.datos.importe.toFixed(2) }} €`
    - Texto con `id`, `concepto`, `importe` (`.toFixed(2)`), `forma_pago` y `fecha` en `dd/MM/yyyy` (`{{ DateTime.fromISO($('Evento de la tienda').item.json.body.datos.fecha).toFormat('dd/MM/yyyy') }}`) de la venta, más el umbral actual (`{{ $json.valor.toFixed(2) }}`).
15. **No es venta grande →** termina sin hacer nada.

No llama a la API: todos los datos llegan en el aviso (y el umbral, en la Data table de n8n).

## 5. Salidas

| Destinatario | Canal | Cuándo | Datos que incluye |
|---|---|---|---|
| Cliente (`datos.email`) | Correo (`Mailpit`), From `tienda@pasofirme.example` | `apartado.creado` con email | `producto`, `talla`, `precio`, `abonado`, `pendiente` (2 decimales) y `fecha_limite` (`dd/MM/yyyy`) |
| Tienda (`tienda@pasofirme.example`) | Correo (`Mailpit`) | `apartado.creado` sin email | Aviso de que no se pudo enviar la confirmación, con `id`, `cliente`, `telefono` (o «sin teléfono») y `producto` con `talla` |
| Cliente (`datos.email`) | Correo (`Mailpit`), From `tienda@pasofirme.example` | `abono.registrado` con email y `estado` ≠ `liquidado` | Recibo: `producto`, `talla`, `importe`, `abonado`, `pendiente` (2 decimales) y `fecha_limite` (`dd/MM/yyyy`) |
| Cliente (`datos.email`) | Correo (`Mailpit`), From `tienda@pasofirme.example` | `abono.registrado` con email y `estado` = `liquidado` | Aviso de que puede recoger: `producto`, `talla`, `importe` y `abonado` (total pagado), 2 decimales |
| — | — | `abono.registrado` sin email | Nada |
| Tienda (`tienda@pasofirme.example`) | Correo (`Mailpit`), From `tienda@pasofirme.example` | `venta.registrada` con `importe` > umbral | Aviso de venta grande: asunto con el `importe`; texto con `id`, `concepto`, `importe` (2 decimales), `forma_pago`, `fecha` (`dd/MM/yyyy`) y umbral actual |
| — | — | `venta.registrada` con `importe` ≤ umbral | Nada |

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| Llega un `evento` que no es ninguno de los 4 (o falta) | Sale por `Evento desconocido` y termina sin hacer nada (pendiente: decidir si avisa a la tienda) |
| `apartado.creado` sin `email` (vacío o `null`) | No falla: va por la rama **No** y avisa a la tienda |
| `abono.registrado` sin `email` (vacío o `null`) | No falla: termina sin enviar nada (decisión: el cliente está en contacto con la tienda) |
| `venta.registrada` sin fila `umbral_venta_grande` en `Configuración`, o con `valor` vacío | `Falta el umbral` (Stop and Error) hace fallar la ejecución; el `08` avisa a la tienda |
| No existe la Data table `Configuración`, o el nodo no la tiene elegida (por ejemplo, tras importar el JSON) | `Leer umbral de venta grande` da error; lo avisa el `08`. Hay que crear la tabla y volver a elegirla en el nodo |
| `venta.registrada` con `importe` igual al umbral | No avisa: la comparación es estrictamente mayor |
| Falla el envío del correo (Mailpit caído, credencial mal) | El nodo da error; lo recoge el Error Workflow, ver [specs/08-error-workflow.md](08-error-workflow.md). En la rama HU-01 falla el Send Email del sub-workflow y, con él, el Execute Workflow del `01` |
| Pendiente de mejorar: un `email` con solo espacios (`" "`) pasa el IF `¿Tiene email?` | En HU-02 y HU-09, el envío falla con «No recipients defined». En HU-01, el sub-workflow para con «Enviar notificación: falta `para`» y falla `Enviar confirmación al cliente`. En los dos casos lo avisa el `08` |
| `apartado.creado` sin `precio`, `abonado` o `pendiente` (rama HU-01) | El `.toFixed(2)` da error de JavaScript dentro de la expresión de `texto`. Lo esperado (**a comprobar**) es que n8n deje vacío todo el `texto`: el sub-workflow para con «falta el cuerpo del correo» (o «falta `para`» si el email tampoco vale) y lo avisa el `08`. Antes se enviaba un correo con esos campos vacíos |
| Pendiente de mejorar: un evento con datos incompletos (por ejemplo, sin `importe`) | No falla: envía un correo con campos vacíos (y «Invalid DateTime» en la fecha) |
| El flujo no está publicado | La Production URL responde 404 y el aviso se pierde; la app no reintenta |
| n8n está apagado | El aviso se pierde; la tienda sigue funcionando |

## 7. Prueba

Payloads en `tests/payloads/`, enviados a la Test URL (`http://localhost:5678/webhook-test/tienda`) con el editor escuchando:

| Entrada | Resultado esperado |
|---|---|
| `apartado.creado.json` | Sale por `apartado.creado` → **Sí**. En Mailpit (http://localhost:8025) llega a `carmen@example.com`, desde `tienda@pasofirme.example`, un correo con Botín piel marrón, talla 38, precio 89.90, abonado 10.00, pendiente 79.90 y fecha límite 18/01/2027 |
| `apartado.creado-sin-email.json` | Sale por `apartado.creado` → **No**. En Mailpit llega a `tienda@pasofirme.example` el aviso de que no se pudo enviar la confirmación del apartado 26: Andrés Ruiz, teléfono 612 345 002, Zapatilla running azul (talla 42) |
| `error-email-espacio.json` a la **Production URL** (con el `01`, el `08` y `10 · Enviar notificación` publicados) | Ver la prueba del `08`, abajo |
| `abono.registrado.json` | Sale por `abono.registrado` → con email → no liquidado. Llega a `carmen@example.com` el recibo: Botín piel marrón, talla 38, importe 20.00, abonado 30.00, pendiente 59.90, fecha límite 18/01/2027 |
| `abono.registrado-liquidado.json` | Sale por `abono.registrado` → con email → liquidado. Llega a `carmen@example.com` el aviso de que puede recoger: Botín piel marrón, talla 38, último abono 59.90, total pagado (`abonado`) 89.90; sin pendiente ni fecha límite |
| `abono.registrado-sin-email.json` | Sale por `abono.registrado` → sin email. No llega ningún correo a Mailpit y la ejecución termina sin error |
| `venta.registrada-grande.json` (umbral `100`) | Sale por `venta.registrada` → hay umbral → venta grande. Llega a `tienda@pasofirme.example` el aviso «Venta grande: 129.90 €» con la venta 258, Botas de montaña, importe 129.90, tarjeta, fecha 21/10/2026 y umbral 100.00 |
| `venta.registrada-umbral.json` (umbral `100`) | Sale por `venta.registrada` → hay umbral → no es venta grande (100 no es mayor que 100). No llega ningún correo y la ejecución termina sin error |
| `venta.registrada.json` (umbral `100`) | Sale por `venta.registrada` → hay umbral → no es venta grande (4.50). No llega ningún correo |
| Cambiar `valor` a `50` en la tabla `Configuración` (sin tocar el flujo) y enviar `venta.registrada-60.json` | Llega el aviso «Venta grande: 60.00 €» con la venta 260, Sandalia mujer beige, efectivo, fecha 21/10/2026 y umbral 50.00. Es la evidencia del criterio 2 de HU-09. Al terminar, volver a poner `100` |
| Borrar temporalmente la fila `umbral_venta_grande` y enviar `venta.registrada.json` a la **Production URL** (con el `01` y el `08` publicados) | `¿Hay umbral?` va por **No** y `Falta el umbral` hace fallar la ejecución. Llega a la tienda el correo del `08` «Ha fallado el flujo «01 · Eventos de la tienda»» con el paso `Falta el umbral` y el mensaje «Falta el umbral de venta grande en la Data table Configuración». Al terminar, volver a crear la fila. Por la Test URL no sirve: el `08` solo salta con ejecuciones de producción |
| `apartado.vencido.json` | Sale por `apartado.vencido` (sin rama todavía) |
| `evento-desconocido.json` | Sale por `Evento desconocido` |

```bash
curl -X POST http://localhost:5678/webhook-test/tienda \
  -H "Content-Type: application/json" -d @tests/payloads/apartado.creado.json
```

**Rama HU-01 con `Enviar notificación` (#95).** Tras el cambio se repiten estas pruebas. Los `curl` están en `~/subflujos/LEEME-95.md`.

| Prueba | Resultado esperado |
|---|---|
| `apartado.creado.json` (Test URL) | Llega la confirmación a `carmen@example.com` **igual que antes**: «Tu apartado en Paso Firme: Botín piel marrón», con talla 38, precio 89.90 €, abonado 10.00 €, pendiente 79.90 € y fecha límite 18/01/2027. En las ejecuciones se ven la del `01` y la de `10 · Enviar notificación` |
| `apartado.creado-sin-email.json` (Test URL) | Llega a la tienda el aviso **igual que antes**: «Apartado 26 sin email: no se envió la confirmación», con Andrés Ruiz, 612 345 002 y Zapatilla running azul (talla 42) |
| HU-05: `error-email-espacio.json` a la **Production URL** | Llega a la tienda el aviso del `08` «Ha fallado el flujo «01 · Eventos de la tienda»», con el paso `Enviar confirmación al cliente` y el error que llega del sub-workflow. Lo esperado es «Enviar notificación: falta `para`»; **a comprobar** el texto exacto que pone n8n. No llega nada al cliente. Ver [specs/08-error-workflow.md](08-error-workflow.md), sección 7 |
| Los tres correos | Remitente `tienda@pasofirme.example`, sin la firma de n8n y con los saltos de línea correctos (líneas en blanco donde las había) |

Comprobado en local con node, sin n8n: con `apartado.creado.json` y `apartado.creado-sin-email.json`, las expresiones nuevas dan **exactamente** el mismo `para`, `asunto` y `texto` que las plantillas de los Send Email de `workflows/01-eventos-tienda.json`.

**Evidencias previstas:**
- `docs/evidencias/01-95-confirmacion-con-sub-workflow.png`
- `docs/evidencias/01-95-sin-email-con-sub-workflow.png`
- `docs/evidencias/01-95-error-sub-workflow-08.png`

**De extremo a extremo** (cuando `scripts/datos_demo.py` esté en `dev`): con el flujo publicado, `python3 scripts/datos_demo.py` crea un apartado con email y otro sin él, abona 20 € al primero y liquida el segundo. Resultado esperado en Mailpit: la confirmación al cliente del primero, el aviso a la tienda del segundo y el recibo del abono parcial del primero, con los importes que muestra el script. El abono que liquida el segundo no envía nada, porque ese cliente no tiene email.

**Evidencias:**

- Confirmación al cliente en Mailpit: [docs/evidencias/01-hu01-confirmacion-cliente.png](../docs/evidencias/01-hu01-confirmacion-cliente.png)
- Aviso a la tienda por apartado sin email: [docs/evidencias/01-hu01-aviso-tienda-sin-email.png](../docs/evidencias/01-hu01-aviso-tienda-sin-email.png)
- Recibo de un abono parcial: [docs/evidencias/01-hu02-recibo-abono.png](../docs/evidencias/01-hu02-recibo-abono.png)
- Aviso de que puede recoger (apartado liquidado): [docs/evidencias/01-hu02-puede-recoger.png](../docs/evidencias/01-hu02-puede-recoger.png)
- Abono de un cliente sin email (no se envía nada): [docs/evidencias/01-hu02-abono-sin-email.png](../docs/evidencias/01-hu02-abono-sin-email.png)
- Aviso de venta grande: [docs/evidencias/01-hu09-aviso-venta-grande.png](../docs/evidencias/01-hu09-aviso-venta-grande.png)
- Venta igual al umbral sin aviso (ejecución en n8n): [docs/evidencias/01-hu09-venta-igual-umbral.png](../docs/evidencias/01-hu09-venta-igual-umbral.png)
- Umbral cambiado a 50 en la Data table y aviso de la venta de 60 €: [docs/evidencias/01-hu09-umbral-cambiado.png](../docs/evidencias/01-hu09-umbral-cambiado.png)
- Aviso del `08` sin fila de umbral: [docs/evidencias/01-hu09-sin-umbral-error.png](../docs/evidencias/01-hu09-sin-umbral-error.png)

## 8. Criterios de aceptación

Del nivel Esencial del README (el router no tiene HU propia):

- [ ] Un único webhook que reparta los eventos con un nodo Switch según el campo `evento`.
- [ ] Los eventos de la app llegan a n8n.

**HU-01 · Confirmación al apartar**

- [x] Al crear un apartado en la app, el cliente recibe un mensaje en menos de un minuto.
- [x] El mensaje incluye modelo, talla, precio, abonado, pendiente y fecha límite, con los importes que da la app.
- [x] Si el cliente no tiene correo, el flujo no falla: avisa a la tienda de que no se pudo enviar.

**HU-02 · Recibo de cada abono**

- [x] Cada abono registrado genera un recibo con el importe pagado y lo que queda pendiente.
- [x] Si el apartado queda liquidado, el mensaje cambia: avisa de que ya puede recoger sus zapatos.

**HU-09 · Aviso de ventas grandes** (flujo 4)

- [x] Las ventas por encima de un importe configurable generan un aviso a Marisa.
- [x] Cambiar el importe no obliga a editar el flujo (se guarda en una variable).

> En nuestra versión de n8n las Variables están bloqueadas: el «importe configurable» se guarda en la Data table `Configuración` (ver [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)).

La checklist de HU-07 se copiará aquí al añadir su rama.
