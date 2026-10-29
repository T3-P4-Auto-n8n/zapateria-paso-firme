# Flujo 08 · Error Workflow

## 1. Cabecera

- **Flujo:** `08 · Error Workflow` (`workflows/08-error-workflow.json`)
- **HU:** HU-05
- **Nivel:** Esencial
- **Responsable:** Esra
- **Credenciales y variables:** `Mailpit` (SMTP), ver [docs/credenciales.md](../docs/credenciales.md)

## 2. Objetivo

Avisar a la tienda por correo en cuanto falle cualquier flujo, con el flujo, el paso y el error, para no descubrirlo semanas después.

## 3. Disparador y entradas

- **Disparador:** Error Trigger `Si falla un flujo`. Se activa cuando falla una ejecución de un flujo que tiene asignado este workflow en **Settings → Error workflow**.
- **Asignación:** ahora en `01 · Eventos de la tienda`; después en `03`, `05`, `06` y `07`.
- **Entradas** (datos que entrega el Error Trigger, no son entidades de la ontología):
  - `$json.workflow.name`: nombre del flujo que ha fallado.
  - `$json.execution.lastNodeExecuted`: paso (nodo) donde falló.
  - `$json.execution.error.message`: mensaje del error.
  - `$json.execution.url`: enlace a la ejecución en n8n.

## 4. Pasos y reglas

1. `Si falla un flujo` (Error Trigger) recibe los datos del fallo.
2. `Avisar a la tienda del error` (Send Email, credencial `Mailpit`): From y To `tienda@pasofirme.example`.
   - Subject: `Ha fallado el flujo «{{ $json.workflow.name }}»`
   - Texto con flujo (`$json.workflow.name`), paso (`$json.execution.lastNodeExecuted`), error (`$json.execution.error.message`) y enlace (`$json.execution.url`).
   - Solo esos cuatro datos: nunca credenciales, cabeceras ni el `.env` (criterio 2 de HU-05).

Reglas:

- El `08` **tiene que estar publicado**; si no, no avisa.
- Cada flujo que se quiera vigilar debe tener el `08` asignado en **Settings → Error workflow**.

No llama a la API.

## 5. Salidas

| Destinatario | Canal | Cuándo | Datos que incluye |
|---|---|---|---|
| Tienda (`tienda@pasofirme.example`) | Correo (`Mailpit`), From `tienda@pasofirme.example` | Falla una ejecución de un flujo con el `08` asignado | Nombre del flujo, paso, mensaje de error y enlace a la ejecución |

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| El `08` no está publicado | No se ejecuta: el fallo no se avisa |
| El flujo que falla no tiene el `08` asignado | No se avisa; revisar **Settings → Error workflow** de ese flujo |
| Falla el propio envío del correo (Mailpit caído, credencial mal) | El aviso se pierde; queda solo en las ejecuciones de n8n (un Error Workflow no se vigila a sí mismo) |
| El mensaje de error incluye datos sensibles | El aviso solo usa los cuatro campos del paso 2; si algún error mostrara datos sensibles, se revisa ese flujo |

### Reintentos

#56. Los HTTP Request de **lectura** (`GET`) llevan **Settings → Retry On Fail** con **Max Tries** `3` y **Wait Between Tries** `2000` ms. Los `POST`, no. Decisión en [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas). La pareja los activó a mano en n8n y los exportó.

**Cómo encaja con el `08`:**

1. Primero, los reintentos. Si el nodo falla, n8n espera 2 s y lo vuelve a intentar, hasta 3 intentos en total.
2. Si un intento sale bien, el flujo sigue y no hay aviso.
3. Si fallan los 3, el nodo falla, la ejecución se para y, en las ejecuciones de producción, salta el `08` **una sola vez**, con el error del último intento.

Un fallo pasajero (la app reiniciándose, un corte de red) ya no llega como aviso. Un fallo que dura, sí, unos 4 s más tarde.

**Solo reintenta si el nodo falla.** Con **Never Error** (cualquier código de respuesta da salida) o **On Error → Continue**, el nodo no falla y no reintenta. Los `GET` de `10 · Buscar apartado` llevan Never Error: allí solo se reintentan los errores sin respuesta (app parada, tiempo agotado). Un `401` o un `5xx` llegan a `Preparar resultado`, que para con el error, como antes.

| Workflow | Nodo | Método | Reintento | Por qué |
|---|---|---|---|---|
| `07 · Informe mensual` | `Leer ventas del mes`, `Leer abonos desde el día 1`, `Leer apartados`, `Leer vales` | `GET` | **Sí** | Lectura: repetirla no cambia nada |
| `09 · Migración del Excel` | `Leer apartados de la app`, `Leer abonos de la app`, `Leer ventas de la app`, `Comprobar pendientes` | `GET` | **Sí** | Lectura |
| `10 · Buscar apartado` | `Leer apartado por número`, `Buscar apartados por texto` | `GET` | **Sí** (solo errores de red, por Never Error) | Lectura. Lo aprovechan los flujos que lo llaman, como `Leer apartados activos` del `06` |
| `11 · Datáfono` | `Leer ventas de esos días` | `GET` | **Sí** | Lectura |
| `06 · Recordatorios y vencimientos` | `Vencer apartado` | `POST` | **No** | Si el `POST` llegó pero la respuesta se perdió, el segundo intento recibiría `422` «ya está vencido» y el apartado saldría en la lista como no vencido |
| `09 · Migración del Excel` | `Crear apartados`, `Registrar abonos`, `Registrar ventas` | `POST` | **No** | Un segundo intento crearía un apartado, un abono o una venta duplicados. Una segunda ejecución del flujo ya no duplica (lo comprueba con los `GET`) |
| `11 · Datáfono` | `Registrar ventas` | `POST` | **No** | Igual: una venta duplicada. La siguiente ejecución no repite lo creado |
| `03 · Abonos a distancia`, `05 · Cierre diario` | — | — | Los decide la pareja en su rama | Ver [specs/03-abonos-distancia.md](03-abonos-distancia.md) (paso 8: «no reintentar un POST a ciegas») |

Los 5 `POST` llevan además Never Error: un código de error tampoco los reintentaría. Pero un error de red, sí, y es justo el caso peligroso, en el que no se sabe si la app guardó el registro.

**En el JSON exportado:** `"retryOnFail": true` y `"waitBetweenTries": 2000` en cada uno de esos 11 nodos. `maxTries` no aparece, porque `3` es el valor por defecto y n8n no exporta los valores por defecto.

## 7. Prueba

Con el `01` y el `08` publicados y el `08` asignado en el `01`, enviar a la **Production URL** un evento que haga fallar el `01`:

| Entrada | Resultado esperado |
|---|---|
| `tests/payloads/error-email-espacio.json` (`apartado.creado` con `email` `" "`) | El IF `¿Tiene email?` deja pasar `" "` (no está vacío) y `Enviar confirmación al cliente` falla con «No recipients defined». En Mailpit llega a `tienda@pasofirme.example` el correo «Ha fallado el flujo «01 · Eventos de la tienda»» con el flujo, el paso (`Enviar confirmación al cliente`), el error y el enlace a la ejecución, sin claves ni contraseñas |

```bash
curl -X POST http://localhost:5678/webhook/tienda \
  -H "Content-Type: application/json" -d @tests/payloads/error-email-espacio.json
```

**Con la rama HU-01 del `01` usando `Enviar notificación` (#95).** `Enviar confirmación al cliente` pasa a ser un Execute Workflow a `10 · Enviar notificación` ([specs/01-eventos-tienda.md](01-eventos-tienda.md), paso 4). La misma prueba falla en otro sitio:

| Entrada | Resultado esperado |
|---|---|
| `tests/payloads/error-email-espacio.json` a la Production URL (con el `01`, el `08` y `10 · Enviar notificación` publicados) | El IF `¿Tiene email?` sigue dejando pasar `" "`. Ya no falla un Send Email: en el sub-workflow, `Comprobar la notificación` quita los espacios y para con «Enviar notificación: falta `para`», sin enviar nada. Falla el Execute Workflow `Enviar confirmación al cliente` del `01`, y en Mailpit llega a `tienda@pasofirme.example` «Ha fallado el flujo «01 · Eventos de la tienda»» con el paso `Enviar confirmación al cliente`, el error que llega del sub-workflow y el enlace a la ejecución, sin claves ni firma |

**Resultado real** (#95):

- **Ejecuciones:**
  - `01` (100): error en `Enviar confirmación al cliente`, «Error executing workflow with item at index 0»;
  - `10 · Enviar notificación` (101): error en `Comprobar la notificación`, «Enviar notificación: falta `para` [line 14]»;
  - `08` (102): correcta.
- **El aviso:** llega a `tienda@pasofirme.example` «Ha fallado el flujo «01 · Eventos de la tienda»», con Paso `Enviar confirmación al cliente`, **Error «Error executing workflow with item at index 0»** y el enlace a la ejecución 100.
- **El mensaje es el genérico de n8n, no el del sub-workflow.** n8n no pasa el mensaje del sub-workflow al nodo que lo llama. El motivo real solo se ve en la ejecución del sub-workflow:
  - abrir la ejecución del enlace del aviso y, desde el nodo `Enviar confirmación al cliente`, ir a la sub-ejecución;
  - o buscar en las ejecuciones de `10 · Enviar notificación` la de la misma hora.
- **El error sale del sub-workflow, no de la expresión del `01`.** Con este payload incompleto (sin `precio`), el sub-workflow recibió `para` como el texto literal de la expresión, sin resolver, y ningún `texto`. Paró en la comprobación de `para`. Detalle en [specs/01-eventos-tienda.md](01-eventos-tienda.md), sección 7.
- **Queda comprobado lo pendiente de #92:** un error de un sub-workflow hace fallar el nodo que lo llama, y lo avisa el `08` del flujo que llama.
- **Evidencias:**
  - [docs/evidencias/01-95-error-sub-workflow-08.png](../docs/evidencias/01-95-error-sub-workflow-08.png) (aviso);
  - [docs/evidencias/01-95-error-en-sub-workflow.png](../docs/evidencias/01-95-error-en-sub-workflow.png) (ejecución 101).

> Un evento con campos que faltan (por ejemplo, `abono.registrado` sin `importe`) **no** sirve para probar: las expresiones de n8n con campos que faltan dan texto vacío y el `01` no falla (envía un correo con campos vacíos).

**Evidencias:**

- Aviso del error en Mailpit: [docs/evidencias/08-hu05-aviso-error.png](../docs/evidencias/08-hu05-aviso-error.png)

## 8. Criterios de aceptación

**HU-05 · Avisos de errores**

- [x] Cualquier flujo que falle envía un aviso con el nombre del flujo, el paso y el error.
- [x] El aviso no incluye contraseñas ni claves.

**#56 · Reintentos (Retry On Fail) en los nodos HTTP Request**

- [x] Los HTTP Request `GET` reintentan (3 intentos, 2 s) antes de fallar y avisar con el `08`; los `POST`, no (sección [Reintentos](#reintentos)). Comprobado en los 4 JSON exportados: tienen `retryOnFail` esos 11 nodos y solo ellos.
