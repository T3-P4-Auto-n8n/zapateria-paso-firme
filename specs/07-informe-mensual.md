# Flujo 07 · Informe mensual

> **Alcance de esta versión:** spec con los valores esperados de septiembre de 2026 calculados con los datos de ejemplo. El flujo todavía no está construido.

## 1. Cabecera

- **Flujo:** `07 · Informe mensual` (`workflows/07-informe-mensual.json`), flujo 7 de «Automatizaciones a construir» del README.
- **HU:** HU-08 (issue #70, sub-issues #71–#76)
- **Nivel:** Medio (flujo 7 e «Informe mensual en PDF o con tabla en el correo»)
- **Responsable:** Esra (antes, Beste)
- **Credenciales y variables:** `API Tienda` (Header Auth) y `Mailpit` (SMTP), ver [docs/credenciales.md](../docs/credenciales.md).
- **Error Workflow:** `08 · Error Workflow` (**Settings → Error workflow**), ver [specs/08-error-workflow.md](08-error-workflow.md).
- **Zona horaria:** **Settings → Timezone** `Europe/Madrid`. Es la misma que la de la instancia (`GENERIC_TIMEZONE` en `docker-compose.yml`), pero se fija también en el flujo para que no dependa de ella.

## 2. Objetivo

Enviar a Marisa el día 1 de cada mes un correo con lo recaudado el mes anterior (ventas directas y abonos por separado), lo que le deben y los apartados nuevos, liquidados y vencidos, con los importes de la app y sin que tenga que hacer cuentas.

## 3. Disparador y entradas

- **Disparador:** dos disparadores que van al mismo nodo `Calcular periodo`.
  - **`Día 1 a las 8:00`** (Schedule Trigger): **Trigger Interval** Months, **Months Between Triggers** `1`, **Trigger at Day of Month** `1`, **Trigger at Hour** 8am, **Trigger at Minute** `0`. Informa del **mes anterior**. Solo funciona con el flujo publicado (lo publica la pareja).
    - A las 8:00 la tienda aún no ha abierto, así que ese día no hay movimientos que se queden fuera, y Marisa lo tiene al empezar el día.
    - Si la versión de n8n muestra la opción **If Execution Is Missed**, poner *Run the Most Recent Missed Execution Per Rule*: si n8n estaba parado a las 8:00 del día 1, el informe sale al arrancar.
  - **`Elegir mes`** (Form Trigger) para las pruebas y para repetir un informe: un campo **Date** `mes`, obligatorio, con la descripción «Cualquier día del mes del que quieres el informe». Informa del mes de esa fecha (por ejemplo, `2026-09-15` → septiembre de 2026). Se usa por la Test URL, sin publicar el flujo.
- **Por qué un formulario y no un Manual Trigger:** con el Manual Trigger habría que editar el flujo (un Set con el mes) para cada prueba. El formulario deja elegir el mes sin tocar nada y es el mismo patrón que `09 · Migración del Excel`. Un campo Date evita los errores de formato de un texto `AAAA-MM`.
- **Entradas** (todas de la API, campos de [docs/ontologia.md](../docs/ontologia.md)):
  - **Venta:** `fecha`, `concepto`, `importe` y `forma_pago`.
  - **Abono:** `apartado_id`, `fecha`, `importe` y `forma_pago`.
  - **Apartado:** `id`, `fecha`, `cliente`, `producto`, `talla`, `precio`, `estado` y `pendiente`.
  - **Vale:** `codigo`, `apartado_id`, `fecha` e `importe`.

**Qué fechas hay en la app:** la venta, el abono y el apartado tienen `fecha`, y el vale tiene la `fecha` en que se generó. El apartado **no** tiene fecha de liquidación ni de vencimiento (solo `fecha_limite`, que es el plazo, no el día en que venció). Por eso los liquidados y los vencidos siguen las reglas del paso 7.

## 4. Pasos y reglas

**Periodo**

1. `Calcular periodo` (Code, **Run Once for All Items**):
   - Si llega `mes` (formulario): el mes de esa fecha.
   - Si no (Schedule Trigger): el mes anterior a hoy en `Europe/Madrid` (`DateTime.now().setZone('Europe/Madrid').minus({ months: 1 })`).
   - Devuelve un solo item `{ desde, hasta, nombre_mes }`: `desde` es el día 1 y `hasta` el último día del mes (`startOf('month')` y `endOf('month')` de Luxon, en `yyyy-MM-dd`), y `nombre_mes` es, por ejemplo, «septiembre de 2026».

**Lecturas de la API**

Todas usan HTTP Request a `http://tienda:8000/api/...` con Authentication **Generic Credential Type → Header Auth → `API Tienda`**. Van en cadena, con **Execute Once** y **Always Output Data**:

- **Execute Once** hace que cada `GET` se haga una vez, aunque el anterior le pase muchos items (uno por venta, por abono...).
- **Always Output Data** evita que el flujo se pare cuando una lista está vacía (un `GET` sin resultados no da ningún item): llega un item vacío y el Code lo ignora.

2. `Leer ventas del mes`: `GET /api/ventas?desde={{ desde }}&hasta={{ hasta }}`. Sin `pagina` devuelve todas.
3. `Leer abonos desde el día 1`: `GET /api/abonos?desde={{ desde }}`, **sin `hasta`**. Trae los abonos del mes y los posteriores. Los posteriores solo sirven para la regla de liquidados (paso 7); la recaudación usa solo los del mes.
4. `Leer apartados`: `GET /api/apartados`, todos los estados.
5. `Leer vales`: `GET /api/vales`. No admite filtros: devuelve todos.

Las expresiones `desde` y `hasta` se leen de `$('Calcular periodo').first().json`.

**Cálculo** (`Preparar informe`, Code, Run Once for All Items)

6. Lee los cuatro nodos con `$('…').all()` y descarta los items vacíos (sin `id`). Suma en céntimos (`Math.round(importe * 100)`) para que no salgan decimales raros, y muestra los importes con 2 decimales.
7. Cifras del informe:

| Cifra | De dónde sale | Regla |
|---|---|---|
| **Ventas directas** | `Leer ventas del mes` | Suma de `importe`. Desglose por `forma_pago` (`efectivo`, `tarjeta`, `bizum`) y nº de ventas |
| **Abonos** | `Leer abonos desde el día 1`, solo los de `fecha` ≤ `hasta` | Suma de `importe`, **incluidos los abonos iniciales** (como en el cierre diario). Desglose por `forma_pago` y nº de abonos |
| **Total recaudado** | Las dos anteriores | Ventas directas + abonos, y también por `forma_pago` |
| **Pendiente de cobro** | `Leer apartados`, `estado` `activo` | Suma del `pendiente` que da la app, sin recalcularlo. Es lo pendiente **en el momento de ejecutar el flujo**: el día 1 a las 8:00 coincide con el cierre del mes; si se pide un mes antiguo por el formulario, es el de hoy (el informe lo indica). Incluye los activos fuera de plazo que el flujo 6 aún no ha vencido |
| **Apartados nuevos** | `Leer apartados` | `fecha` del apartado dentro del mes, en cualquier estado. Tabla: nº, `fecha`, `cliente`, `producto`, `talla`, `precio` y `estado` actual |
| **Apartados liquidados** | `Leer apartados` + `Leer abonos desde el día 1` | `estado` `liquidado` y la `fecha` de su **último abono** dentro del mes (decisión, ver [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)). Un apartado liquidado no admite más abonos, así que su último abono es el que lo liquidó. Si se liquidó al crearlo (abono inicial = `precio`), es el abono inicial. Si no tiene abonos desde el día 1, se liquidó antes. Tabla: nº, `cliente`, `producto`, `precio` y fecha del último abono |
| **Apartados vencidos** | `Leer vales` + `Leer apartados` | `fecha` del **vale** dentro del mes (decisión, ver AGENTS.md): es el día en que n8n lo venció y la app generó el vale. Tabla: nº, `cliente`, `producto`, `fecha_limite`, `codigo` e `importe` del vale |

8. **Mes sin movimientos:** si no hay ventas, ni abonos, ni apartados nuevos, liquidados o vencidos, el flujo no falla. El informe dice «No hubo movimientos en <mes>», con los importes a `0.00` y el pendiente de cobro igual.
9. Devuelve un solo item `{ asunto, html }`.
   - **Asunto:** `Informe de <nombre_mes>: <total> € recaudados` (por ejemplo, «Informe de septiembre de 2026: 4061.75 € recaudados»).
   - **HTML:** ver la sección 5. Los textos que vienen de la app (`cliente`, `producto`, `concepto`) se escapan (`&`, `<`, `>`) antes de meterlos en la tabla.

**Envío**

10. `Enviar informe mensual` (Send Email, credencial `Mailpit`):
    - From y To `tienda@pasofirme.example`, como en los demás avisos a la tienda.
    - **Email Format** HTML, **Subject** `{{ $json.asunto }}` y **HTML** `{{ $json.html }}`.
    - **Append n8n Attribution** desactivado.

**Por qué HTML y no PDF:** el README admite las dos opciones. La tabla en el correo se ve directamente en Mailpit y en el móvil de Marisa, sin adjuntos. Además no necesita nodos ni servicios para generar el PDF, que n8n no trae de serie. Ver AGENTS.md, sección 8.

## 5. Salidas

| Destinatario | Canal | Cuándo | Datos que incluye |
|---|---|---|---|
| Marisa (`tienda@pasofirme.example`) | Correo (`Mailpit`), HTML, From `tienda@pasofirme.example` | El día 1 a las 8:00 (o al enviar el formulario) | **Recaudación** (tabla: filas Ventas directas, Abonos y Total; columnas Efectivo, Tarjeta, Bizum, Total y nº de operaciones) · **Pendiente de cobro** (importe y nº de apartados activos, con la fecha y hora del cálculo) · **Apartados nuevos**, **liquidados** y **vencidos** (nº y una tabla de cada uno, o «Ninguno») · Periodo (`desde`–`hasta`) |

No escribe nada en la app: solo hace `GET`.

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| La API responde `401` (credencial `API Tienda` mal) | El `GET` falla y la ejecución se para; lo avisa el `08` (solo en ejecuciones de producción, como la del día 1). No se envía un informe incompleto |
| La app no responde (contenedor parado, error de red) | El `GET` falla y lo avisa el `08`. Al arreglarlo, el informe se repite con el formulario |
| Otro error de la API (`404`, `5xx`) | Igual que el `401` |
| Una lista vacía (ninguna venta, abono, apartado o vale) | Sigue (Always Output Data): el Code ignora el item vacío y esa cifra sale a `0.00` o «Ninguno» |
| Mes sin ningún movimiento | El informe lo dice (paso 8) y se envía igual |
| Falla el envío (Mailpit caído) | El nodo da error y lo avisa el `08` |
| n8n parado a las 8:00 del día 1 | Si está **If Execution Is Missed** (paso del disparador), sale al arrancar. Si no, se envía a mano con el formulario |
| Un apartado se vence con retraso (el flujo 6 no se ejecutó a tiempo) | Cuenta en el mes de la `fecha` del vale, no en el de su `fecha_limite` |

## 7. Prueba

**Datos:** los de ejemplo de la app (`SEED=1`). Las fechas del seed son relativas al día en que se cargó, así que los valores de abajo sirven para la base de datos actual (seed cargado el **21/10/2026**). Si se vuelve a cargar otro día, hay que recalcularlos.

Se calcularon con una consulta de solo lectura a la base de datos de la app (`mode=ro`), sin ningún `POST`.

**Prueba 1 · septiembre de 2026** (formulario `Elegir mes` con `mes` = `2026-09-15`, Test URL)

Periodo: `2026-09-01` a `2026-09-30`.

| Cifra | Efectivo | Tarjeta | Bizum | Total | Nº |
|---|---|---|---|---|---|
| Ventas directas | 1264.35 | 1579.80 | 928.60 | **3772.75** | 109 |
| Abonos (con los iniciales) | 109.50 | 145.00 | 34.50 | **289.00** | 21 |
| **Total recaudado** | 1373.85 | 1724.80 | 963.10 | **4061.75** | 130 |

Asunto esperado: «Informe de septiembre de 2026: 4061.75 € recaudados».

| Cifra | Valor esperado |
|---|---|
| Pendiente de cobro | **787.05 €** en 20 apartados activos (valor del 26/10/2026). Cambia si se registran abonos o apartados antes de la prueba: el correo debe dar la suma de `pendiente` de `GET /api/apartados?estado=activo` en ese momento |
| Apartados nuevos | **6:** nº 8 (01/09), 19 (06/09), 7 (10/09), 6 (21/09), 18 (23/09) y 5 (29/09). Los nº 19 y 18 salen como `liquidado`, su estado actual |
| Apartados liquidados | **2:** nº 9 (Zueco sanitario, último abono 03/09) y nº 20 (Zapatilla running azul, último abono 26/09). Los nº 19 y 18 se liquidaron en octubre: no salen |
| Apartados vencidos | **0** (la tabla dice «Ninguno»). El único vale (`VALE-00022`, apartado 22, 25.00 €) es del 21/10/2026, aunque la `fecha_limite` del apartado era el 11/09: sale en el informe de octubre. Es el caso de vencimiento con retraso de la sección 6 |

**Prueba 2 · mes sin movimientos** (formulario con `mes` = `2026-01-15`)

- Ventas, abonos y total a `0.00`; nuevos, liquidados y vencidos «Ninguno».
- El informe dice «No hubo movimientos en enero de 2026», con el pendiente de cobro igual que en la prueba 1.
- Asunto: «Informe de enero de 2026: 0.00 € recaudados».

**Prueba 3 · disparador programado**

Se comprueba sin esperar al día 1. En `Calcular periodo`, con **Execute step** desde el Schedule Trigger (sin `mes`), el periodo debe ser el del mes anterior al de hoy: hoy 26/10/2026 → `2026-09-01` a `2026-09-30`.

No hace falta cambiar la programación. Comprobar también en **Settings** que la zona es `Europe/Madrid`.

**Prueba 4 · error** (Production URL del formulario, con el `07` y el `08` publicados)

Cambiar temporalmente la credencial del `Leer ventas del mes` por una con clave mal. Llega a la tienda el correo del `08` con el paso `Leer ventas del mes` y el `401`. Al terminar, volver a poner `API Tienda`.

**Evidencias previstas** (todavía no existen):

- Informe de septiembre en Mailpit, con la tabla: `docs/evidencias/07-hu08-informe-septiembre.png`
- Informe de un mes sin movimientos: `docs/evidencias/07-hu08-mes-sin-movimientos.png`
- Periodo calculado desde el Schedule Trigger (ejecución en n8n): `docs/evidencias/07-hu08-periodo-programado.png`
- Aviso del `08` con el `401`: `docs/evidencias/07-hu08-error-401.png`

## 8. Criterios de aceptación

**HU-08 · Informe mensual** (flujo 7)

- [ ] El día 1 llega un informe con lo recaudado el mes anterior (ventas directas y abonos por separado).
- [ ] Incluye el total pendiente de cobro, y los apartados nuevos, liquidados y vencidos del mes.
- [ ] Los importes coinciden con los de la app.
