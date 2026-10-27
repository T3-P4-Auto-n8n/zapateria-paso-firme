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

- **A comprobar:**
  - **El texto exacto del error.** Lo esperado es «Enviar notificación: falta `para`», pero n8n puede ponerle algo delante o detrás al pasarlo del sub-workflow al nodo que lo llama.
  - **De dónde sale el error.** El payload no trae `precio`, así que el `.toFixed(2)` del `texto` da error. Lo esperado es que n8n deje el `texto` vacío y no falle: es lo que pasaba con el Send Email, que llegaba a «No recipients defined». Si en cambio falla el Execute Workflow por la expresión, el `08` avisa igual, con el mismo paso, pero el error no viene del sub-workflow.
- Esta prueba comprueba también lo que quedó pendiente en #92: que un error de un sub-workflow lo avisa el `08` del flujo que llama. En las ejecuciones se ven la del `01` (fallida), la de `10 · Enviar notificación` (fallida) y la del `08`.

> Un evento con campos que faltan (por ejemplo, `abono.registrado` sin `importe`) **no** sirve para probar: las expresiones de n8n con campos que faltan dan texto vacío y el `01` no falla (envía un correo con campos vacíos).

**Evidencias:**

- Aviso del error en Mailpit: [docs/evidencias/08-hu05-aviso-error.png](../docs/evidencias/08-hu05-aviso-error.png)

## 8. Criterios de aceptación

**HU-05 · Avisos de errores**

- [x] Cualquier flujo que falle envía un aviso con el nombre del flujo, el paso y el error.
- [x] El aviso no incluye contraseñas ni claves.
