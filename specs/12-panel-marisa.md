# Flujo 12 · Panel de Marisa

> **Alcance de esta versión:**
> - **Construido** en n8n por la pareja, **publicado**, exportado en `workflows/12-panel-marisa.json` (6 nodos) y **probado** el 28/10/2026 (sección 7).
> - El Code `Preparar panel` del JSON es idéntico a `~/panel/preparar-panel.js`, y el JSON pasa `validate_workflow` sin errores.
> - **Pendiente:** los 3 `GET` se exportaron con **Max Tries `2`**, y la spec pide `3` (sección 4). Hay que cambiarlo en n8n y volver a exportar.

## 1. Cabecera

- **Flujo:** `12 · Panel de Marisa` (`workflows/12-panel-marisa.json`). No es uno de los flujos 1–8 del enunciado. Lleva el `12` porque el `09`, el `10` y el `11` ya están ocupados, y el número está libre: HU-12 no se hace.
- **HU:** HU-15 · Panel para Marisa (issue #127; sub-issues #128–#130).
- **Nivel:** Experto.
- **Responsable:** Esra.
- **Credenciales y variables:**
  - `API Tienda` (Header Auth), para las lecturas;
  - **`Panel Marisa`** (Basic Auth, nueva), para abrir el panel.
  - Ver [docs/credenciales.md](../docs/credenciales.md).
- **Error Workflow:** `08 · Error Workflow` (**Settings → Error workflow**).
- **Zona horaria:** **Settings → Timezone** `Europe/Madrid`.

## 2. Objetivo

Que Marisa abra una dirección en el navegador (también en el móvil) y vea, al momento y con las cifras de la app:
- lo cobrado hoy y en el mes;
- lo pendiente de cobro;
- los apartados que van a vencer.

Todo sin abrir hojas ni correos.

### Por qué una web servida por n8n

El enunciado admite «Looker Studio, una web o similar». Elegimos una **página HTML que devuelve el propio n8n** (Webhook + Respond to Webhook):

- **Sin servicios ni cuentas nuevas.** Looker Studio necesitaría volcar las cifras a Google Sheets, con OAuth y una cuenta de Google (#128 y #129). Esta página solo usa n8n y la API.
- **Siempre actualizada.** Cada vez que se abre o se recarga, n8n pide los datos a la API. No hay copia intermedia que se quede vieja (criterio 1).
- **Una sola página, sin JavaScript ni recursos externos.** Se ve igual en el ordenador y en el móvil (criterio 2) y no carga nada de fuera.
- **Protegida con Basic Auth:** las cifras del negocio y los nombres de los clientes no quedan abiertos a cualquiera que conozca la URL.

## 3. Disparador y entradas

- **Disparador:** `Abrir el panel` (Webhook):
  - **HTTP Method** `GET`, **Path** `panel`;
  - **Authentication** Basic Auth, con la credencial `Panel Marisa`;
  - **Respond** Using 'Respond to Webhook' Node.
- **URLs:**
  - Production URL: `http://localhost:5678/webhook/panel`. Funciona solo con el flujo **publicado**; es la que usa Marisa.
  - Test URL: `http://localhost:5678/webhook-test/panel`. Funciona solo mientras el editor escucha (**Execute workflow**), y una vez por cada escucha.
- **Basic Auth:** el navegador pide usuario y contraseña la primera vez y los recuerda durante la sesión. Sin ellos, n8n responde `401` y no ejecuta nada.
- **Entradas** (todas de la API, campos de [docs/ontologia.md](../docs/ontologia.md)):
  - **Venta:** `id`, `fecha`, `importe` y `forma_pago`.
  - **Abono:** `id`, `fecha`, `importe` y `forma_pago`.
  - **Apartado:** `id`, `cliente`, `producto`, `talla`, `estado`, `pendiente` y `fecha_limite`.
- La petición del navegador no trae datos: el panel no tiene filtros.

## 4. Pasos y reglas

```
Abrir el panel ─ Leer ventas del mes ─ Leer abonos del mes ─ Leer apartados activos ─ Preparar panel ─ Mostrar el panel
```

**Lecturas de la API**

Son 3 HTTP Request a `http://tienda:8000/api/...` en cadena, como en el `07`, todos con:
- Authentication **Generic Credential Type → Header Auth → `API Tienda`**;
- **Settings:** **Execute Once**, **Always Output Data** y **Retry On Fail** (Max Tries `3`, Wait Between Tries `2000` ms).

Por qué cada ajuste:
- **Execute Once:** cada `GET` se hace una sola vez, aunque el anterior le pase un item por venta.
- **Always Output Data:** una lista vacía (un mes sin abonos) no corta el flujo. Llega un item vacío y el Code lo ignora.
- **Retry On Fail:** solo `GET` ([AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas), #56).

Las fechas van en expresiones de la propia petición (no hace falta un Code `Calcular periodo`):
- **día 1:** `{{ $now.setZone('Europe/Madrid').startOf('month').toFormat('yyyy-MM-dd') }}`;
- **hoy:** `{{ $now.setZone('Europe/Madrid').toFormat('yyyy-MM-dd') }}`.

1. `Leer ventas del mes`: `GET /api/ventas` con Query `desde` = día 1 y `hasta` = hoy. Sin `pagina`, la API devuelve todas ([guía de la app](../docs/guia-de-la-app.md), «Sin `pagina` devuelve todo»), igual que en el `07`.
2. `Leer abonos del mes`: `GET /api/abonos` con `desde` = día 1 y `hasta` = hoy. Incluye los abonos iniciales, que también son cobros (como en el cierre diario y en el `07`).
3. `Leer apartados activos`: `GET /api/apartados` con Query `estado` = `activo`, sin `pagina` (todos).
   - **Por qué un HTTP Request y no `10 · Buscar apartado`:**
     - es el mismo patrón que las lecturas del `07`;
     - el sub-workflow devolvería un solo item `{ total, apartados }`, que el Code tendría que leer de otra forma que las ventas y los abonos;
     - cada vez que se abriera el panel se crearía una ejecución más (la del sub-workflow).
   - El filtro `estado=activo` ya limita la lista, que es justo lo que `Buscar apartado` exige ([AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)).

**Cálculo** (`Preparar panel`, Code, **Run Once for All Items**; código en `~/panel/preparar-panel.js`, fuera del repo, como en los flujos anteriores)

4. Lee los 3 nodos con `$('…').all()` y descarta los items vacíos (sin `id`). Calcula hoy y el día 1 en `Europe/Madrid` con Luxon, igual que las URL. Por seguridad, solo cuenta las ventas y los abonos con `fecha` entre el día 1 y hoy.
5. Suma en céntimos (`Math.round(importe * 100)`), como el `07`. Muestra los importes con 2 decimales, coma decimal, punto de miles y `€` (`1.234,56 €`, como en la app). Las fechas, en `dd/MM/yyyy`.
6. Cifras del panel:

| Bloque | De dónde sale | Regla |
|---|---|---|
| **Cobrado hoy** | Ventas y abonos con `fecha` = hoy | Total, ventas directas y abonos por separado, desglose por `forma_pago` (`efectivo`, `tarjeta`, `bizum`) y nº de operaciones. Sin cobros: «Hoy todavía no hay cobros» y `0,00 €` |
| **Recaudado en <mes>** | Ventas y abonos del día 1 a hoy | Las mismas reglas que la recaudación del `07` ([specs/07-informe-mensual.md](07-informe-mensual.md), paso 7), pero del mes en curso hasta hoy |
| **Pendiente de cobro** | `Leer apartados activos` | Suma del `pendiente` que da la app de cada apartado `activo`, sin recalcularlo, y nº de apartados activos. Incluye los fuera de plazo que el `06` todavía no ha vencido, como el `07` |
| **Vencen en los próximos 7 días** | Activos con `fecha_limite` entre hoy y hoy + 7 (ambos incluidos) | Ordenados por `fecha_limite` y `id`. De cada uno: `cliente`, `producto`, `talla`, nº, `pendiente`, `fecha_limite` y cuánto falta («Vence hoy», «Vence mañana», «Faltan N días»). El día de su `fecha_limite` todavía se puede abonar (regla de la app) |
| **Fuera de plazo, todavía activos** | Activos con `fecha_limite` anterior a hoy | La misma regla que el `06` ([specs/06-recordatorios-vencimientos.md](06-recordatorios-vencimientos.md)). Mismos datos y «Venció hace N días». Una nota explica que el `06` los vence cada mañana a las 9:00 |
| **Actualizado** | Hora de la ejecución | `dd/MM/yyyy` y `HH:mm` en `Europe/Madrid` |

7. **HTML** (un solo item `{ html }`):
   - una sola página en español, con `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">` y `<meta name="robots" content="noindex">`;
   - el CSS va dentro de `<style>`: nada externo (ni CDN ni fuentes descargadas; fuentes del sistema) y **sin JavaScript**;
   - **diseño:** tres tarjetas grandes con la cifra principal (hoy, mes y pendiente), y debajo dos listas de apartados en bloques, no en tablas anchas. Las tarjetas se colocan en una columna en el móvil y en varias en el ordenador (`grid` con `auto-fit`, mínimo 260 px), así que se ven bien con 360 px de ancho sin desplazamiento horizontal;
   - **escapado:** los textos que vienen de la app (`cliente`, `producto`, `talla`) se escapan (`&`, `<`, `>`, `"`, `'`) para que no rompan la página.

**Respuesta**

8. `Mostrar el panel` (Respond to Webhook):
   - **Respond With** Text;
   - **Response Body** `{{ $json.html }}`;
   - **Options → Response Code** `200`;
   - **Options → Response Headers:** `Content-Type` = `text/html; charset=utf-8`. Sin esta cabecera, el navegador mostraría el HTML como texto.

## 5. Salidas

| Destinatario | Canal | Cuándo | Datos que incluye |
|---|---|---|---|
| Marisa (o quien tenga la credencial `Panel Marisa`) | Página web, respuesta del webhook | Cada vez que abre o recarga `…/webhook/panel` | Cobrado hoy, recaudado en el mes, pendiente de cobro y las dos listas de apartados (sección 4, paso 6) |

- **No escribe nada** en la app: solo hace `GET`.
- **No envía correos.**
- Cada apertura del panel es una ejecución de producción del `12` (se ve en **Executions**).

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| Sin usuario y contraseña, o con unos que no son los de `Panel Marisa` | n8n responde `401` y no ejecuta el flujo (no aparece en Executions ni avisa el `08`) |
| El flujo no está publicado | La Production URL responde `404` |
| La API responde `401` (credencial `API Tienda` mal) | El `GET` se reintenta (3 intentos, 2 s) y falla. La ejecución se para sin llegar a `Mostrar el panel`, y el navegador recibe un **error de n8n** en vez del panel (pendiente de comprobar en la prueba el código exacto; se espera `500`). Si la ejecución es de producción, el `08` avisa a la tienda |
| La app no responde (contenedor parado, red) | Igual: hasta unos 4 s de reintentos. Si vuelve a tiempo, el panel sale normal; si no, error en el navegador y aviso del `08` |
| Una lista vacía (mes sin ventas o sin abonos, ningún apartado activo) | Sigue (Always Output Data): esa cifra sale a `0,00 €` y las listas dicen «Ninguno» |
| Un texto de la app con `<`, `&` o comillas | Se escapa: se ve tal cual y no rompe la página |
| Se abre la Test URL sin estar escuchando en el editor | `404` de n8n («The requested webhook … is not registered») |

## 7. Prueba

**Preparación:**
- copia de la base de datos antes de la prueba 3, y restauración al terminar ([docs/instalacion.md](../docs/instalacion.md), sección 10);
- credencial `Panel Marisa` creada;
- para las pruebas 2 a 5, el flujo **publicado**.

| # | Entrada | Resultado esperado |
|---|---|---|
| 1 · Test URL | En el editor, **Execute workflow**, y abrir `http://localhost:5678/webhook-test/panel` | El navegador pide usuario y contraseña. Con los de `Panel Marisa` sale el panel, y en el canvas los 6 nodos en verde |
| 2 · Sin clave | Publicado: abrir `http://localhost:5678/webhook/panel` en una ventana privada y pulsar **Cancelar** en la ventana de usuario y contraseña (o `curl -i http://localhost:5678/webhook/panel`) | `401`, sin panel. No aparece ninguna ejecución nueva |
| 3 · Cifras = API | Publicado: abrir el panel con la clave y comparar con la tabla de abajo, calculada aparte con `GET` | Todas las cifras coinciden |
| 4 · Se actualiza (criterio 1) | Registrar en la app una venta de prueba: concepto `Prueba panel`, `25` €, `efectivo`. Después, recargar el panel | Cobrado hoy pasa de `0,00 €` a **`25,00 €`** (efectivo `25,00 €`, 1 operación). Recaudado en octubre pasa a **`2.577,75 €`** (ventas directas `1.879,45 €`, efectivo `1.026,20 €`). El resto no cambia. La venta (`25` ≤ umbral `100`) no dispara el aviso de venta grande |
| 5 · Móvil (criterio 2) | En Chrome: herramientas de desarrollo → modo dispositivo, ancho 360 px. Si se puede, en un móvil real de la misma red: `http://<IP del Mac>:5678/webhook/panel` | Una columna, sin desplazamiento horizontal, cifras legibles sin hacer zoom |
| 6 · API caída (opcional) | Publicado: `docker compose stop tienda`, abrir el panel y después `docker compose start tienda` | Tras unos 4 s, un error de n8n en el navegador (anotar el código), y el aviso del `08` en Mailpit |

**Valores esperados del 28/10/2026**, antes de la prueba 4. Base de datos de las pruebas anteriores; calculados a la vez con `GET /api/ventas` y `GET /api/abonos` (`desde=2026-10-01&hasta=2026-10-28`) y `GET /api/apartados?estado=activo`, y por separado con el Code en local:

| Bloque | Valor |
|---|---|
| Cobrado hoy | `0,00 €` (ventas directas `0,00 €`, abonos `0,00 €`): «Hoy todavía no hay cobros» |
| Recaudado en octubre de 2026 | **`2.552,75 €`**: ventas directas `1.854,45 €` (63) y abonos `698,30 €` (48); efectivo `1.001,20 €`, tarjeta `795,20 €`, bizum `756,35 €`; 111 operaciones |
| Pendiente de cobro | **`787,05 €`** en 20 apartados activos (como en la prueba del `07`) |
| Vencen en los próximos 7 días (2) | nº 11 David Romero, Deportiva blanca, talla 44, pendiente `15,00 €`, vence hoy · nº 12 Laura Ortega, Deportiva blanca, talla 37, pendiente `10,00 €`, vence hoy |
| Fuera de plazo, todavía activos (4) | nº 16 Paula Ramos (`59,50 €`, hace 35 días) · nº 15 Sergio Delgado (`19,90 €`, 21) · nº 14 Marta Molina (`47,00 €`, 13) · nº 13 Pablo Rubio (`49,90 €`, 6). Siguen activos porque el `06` está sin publicar hasta terminar las pruebas de HU-03 |

Si la prueba se hace otro día, las cifras cambian (los datos de ejemplo y «hoy» se mueven). Se recalculan con los mismos `GET`.

**Capturas previstas** (en `docs/evidencias/`):
- `12-hu15-panel-escritorio.png`: el panel en el ordenador (prueba 3);
- `12-hu15-panel-movil.png`: a 360 px o en el móvil (prueba 5);
- `12-hu15-canvas.png`: el canvas con la ejecución en verde;
- `12-hu15-sin-clave.png`: el `401` (prueba 2).

**Resultado real** (28/10/2026, la pareja, en n8n, con el `12` publicado):
- **Base de datos:** copia en `~/tienda-antes-hu15.db`, restaurada al terminar.
- **Pruebas 1 y 3** (Production URL, con usuario y contraseña):
  - el panel muestra exactamente los valores esperados de la tabla de arriba: cobrado hoy `0,00 €`; octubre `2.552,75 €` (ventas directas `1.854,45 €` + abonos `698,30 €`, 111 operaciones); pendiente `787,05 €` en 20 activos; vencen hoy los nº 11 y 12; fuera de plazo los nº 16, 15, 14 y 13;
  - coincide con la API;
  - en el canvas, los 6 nodos en verde: 1 item → 63 ventas → 48 abonos → 20 apartados activos → 1 item → 1 item.
- **Prueba 2** (sin credenciales, ventana de incógnito):
  - n8n responde «Authorization is required!» y no muestra el panel;
  - la captura no muestra el código HTTP (se espera `401`), y no se comprobó si queda alguna ejecución.
- **Prueba 4:** tras registrar una venta de `25,00 €` en efectivo, al recargar:
  - cobrado hoy pasa a `25,00 €` (ventas directas `25,00 €`, efectivo `25,00 €`, 1 operación);
  - octubre pasa a `2.577,75 €` (ventas directas `1.879,45 €`, efectivo `1.026,20 €`, 112 operaciones);
  - el pendiente y las listas no cambian.
  - Es lo esperado. **Criterio 1 cumplido.**
- **Prueba 5** (Chrome, modo dispositivo): una columna y sin desplazamiento horizontal; las cifras se leen sin zoom. **Criterio 2 cumplido.** No se probó en un móvil real.
- **Prueba 6:** no se hizo; era opcional. El aviso del `08` ya está probado en HU-05 ([specs/08-error-workflow.md](08-error-workflow.md)). Sigue sin comprobar qué código recibe el navegador si falla la API (sección 6).
- **Problema encontrado:** la Test URL solo vale después de pulsar **Execute workflow**, y para una sola petición. Por eso las pruebas se hicieron con la Production URL y el flujo publicado.
- **Evidencias:**
  - canvas con la ejecución: [docs/evidencias/12-hu15-canvas.png](../docs/evidencias/12-hu15-canvas.png);
  - sin clave: [docs/evidencias/12-hu15-sin-clave.png](../docs/evidencias/12-hu15-sin-clave.png);
  - panel en el ordenador (prueba 3): [docs/evidencias/12-hu15-panel-escritorio.png](../docs/evidencias/12-hu15-panel-escritorio.png);
  - panel tras la venta de prueba (prueba 4): [docs/evidencias/12-hu15-panel-actualizado.png](../docs/evidencias/12-hu15-panel-actualizado.png);
  - modo dispositivo (prueba 5): [docs/evidencias/12-hu15-panel-movil.png](../docs/evidencias/12-hu15-panel-movil.png).

**Comprobado en local** (28/10/2026, `node` con el Luxon 3.7.2 del contenedor de n8n y `GET` reales a la API; sin n8n):
- las cifras de la tabla de arriba coinciden con un cálculo independiente en Python a partir de los mismos `GET`;
- con las tres listas vacías: todo a `0,00 €`, «Hoy todavía no hay cobros» y «Ningún apartado vence…»;
- un cliente `<b>Ana & "Eva"</b>` y un producto `<script>` salen escapados;
- `0,10 + 0,20` da `0,30 €`, y `1234.56` da `1.234,56 €`;
- el HTML no tiene `<script>` ni ninguna URL externa.

## 8. Criterios de aceptación

**HU-15 · Panel para Marisa** (enunciado, nivel Experto):

- [x] El panel muestra los datos de la app actualizados (pruebas 3 y 4).
- [x] Se entiende sin explicación y se ve bien en el móvil (prueba 5, con el modo dispositivo de Chrome).

## 9. Preguntas para la pareja

1. **Basic Auth sin HTTPS.** En local, el usuario y la contraseña viajan sin cifrar (Basic Auth es Base64, no cifrado). En `localhost` no importa; para el móvil por la red de casa es aceptable en una prueba. Para usarlo de verdad haría falta HTTPS (HU-16, Experto).
2. **Una ejecución por visita.** Cada recarga guarda una ejecución en **Executions**, con los datos de los clientes. ¿Desactivamos **Settings → Save successful production executions** en el `12`, o lo dejamos para poder ver las pruebas?
3. **Los dos de «vence hoy».** Los apartados que vencen hoy salen en «Vencen en los próximos 7 días». ¿Preferís una sección propia «Vencen hoy»?
