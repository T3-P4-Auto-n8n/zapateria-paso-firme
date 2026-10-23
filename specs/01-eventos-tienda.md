# Flujo 01 · Eventos de la tienda

> **Alcance de esta versión:** router (webhook + Switch) y rama de HU-01 (`apartado.creado`). Las demás ramas se añadirán después:
> `abono.registrado` → HU-02 (flujo 2) · `venta.registrada` → HU-09 (flujo 4) · `apartado.vencido` → HU-07 (aviso de vencido, flujo 6).

## 1. Cabecera

- **Flujo:** `01 · Eventos de la tienda` (`workflows/01-eventos-tienda.json`)
- **HU:** HU-01 · HU-02, HU-09, HU-07 (ramas pendientes)
- **Nivel:** Esencial (router, HU-01, HU-02) · Medio (HU-09, HU-07)
- **Responsable:** Esra
- **Credenciales y variables:** `Mailpit` (SMTP), ver [docs/credenciales.md](../docs/credenciales.md). El webhook no lleva autenticación.

## 2. Objetivo

Recibir en un único webhook todos los avisos de la app, repartir cada uno a su rama según el `evento` y, al crear un apartado, enviar al cliente la confirmación (o avisar a la tienda si no tiene email).

## 3. Disparador y entradas

- **Disparador:** nodo Webhook `Evento de la tienda`, `POST` con Path `tienda` (Production URL `http://n8n:5678/webhook/tienda`, la que usa la app).
- **Entradas:** el aviso de la app, `{ "evento": ..., "datos": ... }`, que n8n guarda dentro de `body`:
  - `$json.body.evento`: `apartado.creado`, `abono.registrado`, `venta.registrada` o `apartado.vencido`.
  - `$json.body.datos`: el Apartado (más `importe` del Abono en `abono.registrado`), la Venta, o `{ apartado, vale }` en `apartado.vencido`. Ver [docs/guia-de-la-app.md](../docs/guia-de-la-app.md#6-el-webhook-app--n8n).
- **Rama HU-01** (`apartado.creado`), campos del Apartado que usa: `id`, `cliente`, `email`, `producto`, `talla`, `precio`, `abonado`, `pendiente`, `fecha_limite`.

## 4. Pasos y reglas

**Router**

1. `Evento de la tienda` recibe el `POST` y responde a la app en el momento (opción por defecto del nodo).
2. `Según el evento` (Switch, comparación exacta y sensible a mayúsculas sobre `{{ $json.body.evento }}`) envía el item por una de sus 5 salidas:
   - `apartado.creado` → rama HU-01
   - `abono.registrado` (sin conectar todavía)
   - `venta.registrada` (sin conectar todavía)
   - `apartado.vencido` (sin conectar todavía)
   - `Evento desconocido` (salida de respaldo: cualquier otro valor o sin `evento`)

**Rama HU-01 · Confirmación de apartado** (salida `apartado.creado`)

3. IF `¿Tiene email?`: **Sí** si `{{ $json.body.datos.email }}` no está vacío; **No** si está vacío o es `null`.
4. **Sí →** `Enviar confirmación al cliente` (Send Email, credencial `Mailpit`): From `tienda@pasofirme.example`, To `datos.email`, con `producto`, `talla`, `precio`, `abonado`, `pendiente` y `fecha_limite` del apartado. Los importes son los que da la app, solo formateados con 2 decimales (`{{ $json.body.datos.precio.toFixed(2) }}`); no se recalculan. La `fecha_limite` se muestra como `dd/MM/yyyy` (`{{ DateTime.fromISO($json.body.datos.fecha_limite).toFormat('dd/MM/yyyy') }}`).
5. **No →** `Avisar a la tienda: sin email` (Send Email, credencial `Mailpit`): From y To `tienda@pasofirme.example`, avisa de que no se pudo enviar la confirmación e incluye `id`, `cliente`, `telefono` (o «sin teléfono» si no lo tiene) y `producto` con su `talla`.

No llama a la API: todos los datos llegan en el aviso.

## 5. Salidas

| Destinatario | Canal | Cuándo | Datos que incluye |
|---|---|---|---|
| Cliente (`datos.email`) | Correo (`Mailpit`), From `tienda@pasofirme.example` | `apartado.creado` con email | `producto`, `talla`, `precio`, `abonado`, `pendiente` (2 decimales) y `fecha_limite` (`dd/MM/yyyy`) |
| Tienda (`tienda@pasofirme.example`) | Correo (`Mailpit`) | `apartado.creado` sin email | Aviso de que no se pudo enviar la confirmación, con `id`, `cliente`, `telefono` (o «sin teléfono») y `producto` con `talla` |

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| Llega un `evento` que no es ninguno de los 4 (o falta) | Sale por `Evento desconocido` y termina sin hacer nada (pendiente: decidir si avisa a la tienda) |
| El apartado no tiene `email` (vacío o `null`) | No falla: va por la rama **No** y avisa a la tienda |
| Falla el envío del correo (Mailpit caído, credencial mal) | El nodo da error; lo recogerá el Error Workflow (`08`, pendiente) |
| El flujo no está publicado | La Production URL responde 404 y el aviso se pierde; la app no reintenta |
| n8n está apagado | El aviso se pierde; la tienda sigue funcionando |

## 7. Prueba

Payloads en `tests/payloads/`, enviados a la Test URL (`http://localhost:5678/webhook-test/tienda`) con el editor escuchando:

| Entrada | Resultado esperado |
|---|---|
| `apartado.creado.json` | Sale por `apartado.creado` → **Sí**. En Mailpit (http://localhost:8025) llega a `carmen@example.com`, desde `tienda@pasofirme.example`, un correo con Botín piel marrón, talla 38, precio 89.90, abonado 10.00, pendiente 79.90 y fecha límite 18/01/2027 |
| `apartado.creado-sin-email.json` | Sale por `apartado.creado` → **No**. En Mailpit llega a `tienda@pasofirme.example` el aviso de que no se pudo enviar la confirmación del apartado 26: Andrés Ruiz, teléfono 612 345 002, Zapatilla running azul (talla 42) |
| `abono.registrado.json` | Sale por `abono.registrado` (sin rama todavía) |
| `venta.registrada.json` | Sale por `venta.registrada` (sin rama todavía) |
| `apartado.vencido.json` | Sale por `apartado.vencido` (sin rama todavía) |
| `evento-desconocido.json` | Sale por `Evento desconocido` |

```bash
curl -X POST http://localhost:5678/webhook-test/tienda \
  -H "Content-Type: application/json" -d @tests/payloads/apartado.creado.json
```

**De extremo a extremo** (cuando `scripts/datos_demo.py` esté en `dev`): con el flujo publicado, `python3 scripts/datos_demo.py` crea un apartado con email y otro sin él. Resultado esperado: en Mailpit, la confirmación al cliente del primero y el aviso a la tienda del segundo, con los importes que muestra el script.

**Evidencias:**

- Confirmación al cliente en Mailpit: [docs/evidencias/01-hu01-confirmacion-cliente.png](../docs/evidencias/01-hu01-confirmacion-cliente.png)
- Aviso a la tienda por apartado sin email: [docs/evidencias/01-hu01-aviso-tienda-sin-email.png](../docs/evidencias/01-hu01-aviso-tienda-sin-email.png)

## 8. Criterios de aceptación

Del nivel Esencial del README (el router no tiene HU propia):

- [ ] Un único webhook que reparta los eventos con un nodo Switch según el campo `evento`.
- [ ] Los eventos de la app llegan a n8n.

**HU-01 · Confirmación al apartar**

- [x] Al crear un apartado en la app, el cliente recibe un mensaje en menos de un minuto.
- [x] El mensaje incluye modelo, talla, precio, abonado, pendiente y fecha límite, con los importes que da la app.
- [x] Si el cliente no tiene correo, el flujo no falla: avisa a la tienda de que no se pudo enviar.

Las checklists de HU-02, HU-09 y HU-07 se copiarán aquí al añadir cada rama.
