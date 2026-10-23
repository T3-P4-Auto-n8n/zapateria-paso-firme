# Flujo 01 · Eventos de la tienda

> **Alcance de esta versión:** solo el router (webhook + Switch). Las ramas de cada evento se añadirán después:
> `apartado.creado` → HU-01 (flujo 1) · `abono.registrado` → HU-02 (flujo 2) · `venta.registrada` → HU-09 (flujo 4) · `apartado.vencido` → HU-07 (aviso de vencido, flujo 6).

## 1. Cabecera

- **Flujo:** `01 · Eventos de la tienda` (`workflows/01-eventos-tienda.json`)
- **HU:** HU-01, HU-02, HU-09, HU-07 (ramas pendientes)
- **Nivel:** Esencial (router, HU-01, HU-02) · Medio (HU-09, HU-07)
- **Responsable:** Esra
- **Credenciales y variables:** ninguna en esta versión (el webhook no lleva autenticación)

## 2. Objetivo

Recibir en un único webhook todos los avisos de la app y repartir cada uno a su rama según el `evento`.

## 3. Disparador y entradas

- **Disparador:** nodo Webhook `Evento de la tienda`, `POST` con Path `tienda` (Production URL `http://n8n:5678/webhook/tienda`, la que usa la app).
- **Entradas:** el aviso de la app, `{ "evento": ..., "datos": ... }`, que n8n guarda dentro de `body`:
  - `$json.body.evento`: `apartado.creado`, `abono.registrado`, `venta.registrada` o `apartado.vencido`.
  - `$json.body.datos`: el Apartado (más `importe` del Abono en `abono.registrado`), la Venta, o `{ apartado, vale }` en `apartado.vencido`. Ver [docs/guia-de-la-app.md](../docs/guia-de-la-app.md#6-el-webhook-app--n8n).

## 4. Pasos y reglas

1. `Evento de la tienda` recibe el `POST` y responde a la app en el momento (opción por defecto del nodo).
2. `Según el evento` (Switch, comparación exacta y sensible a mayúsculas sobre `{{ $json.body.evento }}`) envía el item por una de sus 5 salidas:
   - `apartado.creado`
   - `abono.registrado`
   - `venta.registrada`
   - `apartado.vencido`
   - `Evento desconocido` (salida de respaldo: cualquier otro valor o sin `evento`)
3. Ninguna salida está conectada todavía: el flujo termina en el Switch.

No llama a la API.

## 5. Salidas

- Ninguna por ahora. Cada salida del Switch enviará los mensajes de su HU cuando se añada la rama.

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| Llega un `evento` que no es ninguno de los 4 (o falta) | Sale por `Evento desconocido` y termina sin hacer nada (pendiente: decidir si avisa a la tienda) |
| El flujo no está publicado | La Production URL responde 404 y el aviso se pierde; la app no reintenta |
| n8n está apagado | El aviso se pierde; la tienda sigue funcionando |

## 7. Prueba

Payloads en `tests/payloads/`, enviados a la Test URL (`http://localhost:5678/webhook-test/tienda`) con el editor escuchando:

| Entrada | Resultado esperado |
|---|---|
| `apartado.creado.json` | El item sale por `apartado.creado` |
| `abono.registrado.json` | El item sale por `abono.registrado` |
| `venta.registrada.json` | El item sale por `venta.registrada` |
| `apartado.vencido.json` | El item sale por `apartado.vencido` |
| `evento-desconocido.json` | El item sale por `Evento desconocido` |

```bash
curl -X POST http://localhost:5678/webhook-test/tienda \
  -H "Content-Type: application/json" -d @tests/payloads/apartado.creado.json
```

## 8. Criterios de aceptación

Del nivel Esencial del README (el router no tiene HU propia):

- [ ] Un único webhook que reparta los eventos con un nodo Switch según el campo `evento`.
- [ ] Los eventos de la app llegan a n8n.

Las checklists de HU-01, HU-02, HU-09 y HU-07 se copiarán aquí al añadir cada rama.
