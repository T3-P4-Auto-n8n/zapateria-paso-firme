# Flujo 09 · Migración del Excel

> **Alcance de esta versión:** spec y análisis fila a fila de los dos CSV de `data/`. El flujo todavía no está construido.

## 1. Cabecera

- **Flujo:** `09 · Migración del Excel` (`workflows/09-migracion-excel.json`). Es la «Migración del Excel actual» del nivel Medio del README; no tiene número en la tabla de flujos.
- **HU:** HU-10
- **Nivel:** Medio
- **Responsable:** Esra
- **Credenciales y variables:** `API Tienda` (Header Auth) y `Mailpit` (SMTP), ver [docs/credenciales.md](../docs/credenciales.md).
- **Error Workflow:** `08 · Error Workflow` (**Settings → Error workflow**), ver [specs/08-error-workflow.md](08-error-workflow.md).

## 2. Objetivo

Pasar a la app, por API y con su fecha original, los apartados, abonos y ventas del Excel de Marisa, limpiando los datos, sin duplicar nada si se ejecuta dos veces y dejando en un informe los casos dudosos para que Marisa decida.

## 3. Disparador y entradas

- **Disparador:** Form Trigger `Subir el Excel` con dos campos de tipo **File**, los dos obligatorios, con **Multiple Files** desactivado y **Accepted File Types** `.csv`:
  - `Apartados (CSV)`: `data/excel_actual_apartados.csv`
  - `Ventas (CSV)`: `data/excel_actual_ventas.csv`

  **Por qué un formulario:** el contenedor de n8n no ve la carpeta `data/` del repo. Con el formulario no hay que tocar `docker-compose.yml` para montarla.
- **Lectura:** un nodo Extract from File por fichero (Operation **Extract From CSV**, con **Header Row** activado), `Leer CSV de apartados` y `Leer CSV de ventas`. En **Input Binary Field** va el nombre del campo binario que crea el Form Trigger para cada fichero; se comprueba en la salida del formulario al construir.
- **Entradas.** Las columnas del Excel no son de la ontología. Esta tabla dice a qué campo de la app va cada una:

| CSV | Columna | Campo de la app | Notas |
|---|---|---|---|
| Apartados | `fecha` | `fecha` | Formatos mezclados (`02/09/2026`, `7/9/26`) |
| Apartados | `cliente` | `cliente` | Mayúsculas mezcladas (`carmen ruiz`) |
| Apartados | `telefono` | `telefono` | Con y sin espacios (`612345002`); a veces vacío |
| Apartados | `modelo` | `producto` | |
| Apartados | `talla` | `talla` | |
| Apartados | `precio` | `precio` | |
| Apartados | `abono` | `abono_inicial` (primera fila del grupo) o `importe` del abono (las siguientes) | A veces con `€` (`15€`) |
| Apartados | `resta` | — | Calculada a mano: solo para la comprobación del paso 12; no se envía |
| Apartados | `notas` | — | Solo para el informe (no hay campo en la app) |
| Ventas | `fecha` | `fecha` | |
| Ventas | `concepto` | `concepto` | |
| Ventas | `importe` | `importe` | El TOTAL usa coma decimal y punto de miles (`1.842,30`) |
| Ventas | `forma_pago` | `forma_pago` | `efectivo`, `tarjeta` o `bizum` |

El CSV de apartados no tiene `email` ni `forma_pago`. No se envía `email`. La `forma_pago` se toma del CSV de ventas cuando el mismo pago aparece allí; si no, va `efectivo` (paso 6 y [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)).

## 4. Pasos y reglas

**Lectura y limpieza**

1. `Subir el Excel` (Form Trigger) recibe los dos ficheros.
2. `Leer CSV de apartados` y `Leer CSV de ventas` (Extract from File) convierten cada fichero en un item por fila.
3. `Limpiar y clasificar` (Code, **Run Once for All Items**) lee las filas de los dos nodos anteriores (`$('Leer CSV de apartados').all()` y `$('Leer CSV de ventas').all()`) y limpia los datos. Solo cambia el formato: no recalcula ningún importe.
   - **Fechas:** `dd/MM/yyyy` y `d/M/yy` → `yyyy-MM-dd` (`7/9/26` → `2026-09-07`).
   - **Importes:** quita `€` y espacios. Si hay coma decimal, quita los puntos de miles y cambia la coma por punto (`1.842,30` → `1842.30`). Después lo convierte a número (`15€` → `15`).
   - **Nombres:** quita espacios sobrantes y pone mayúscula inicial en cada palabra (`carmen ruiz` → `Carmen Ruiz`).
   - **Teléfonos:** formato `612 345 001` (`612345002` → `612 345 002`). Si está vacío, el apartado va sin teléfono (no se envía `telefono`).
   - Una fila cuya fecha o importe no se puede limpiar no se carga: va al informe como dudosa («no se pudo leer la fecha / el importe»).

**Clasificación de los apartados** (en el mismo Code)

4. Agrupa las filas por **cliente normalizado + modelo** y las ordena por fecha dentro de cada grupo.
   - La **primera fila** de cada grupo es el **apartado**: `precio`, y su `abono` como `abono_inicial`.
   - Las **siguientes** son **abonos** de ese apartado, con su `fecha` y su `abono` como `importe`.
5. **Dudosos** (no se cargan; van al informe con su motivo y sus `notas`):
   - abono inicial menor de **5 €** (la app lo rechazaría con un `422`);
   - cualquier abono cuyo apartado no se carga, ya sea por dudoso o porque la API lo rechazó en el paso 9 (ver [AGENTS.md, sección 8](../AGENTS.md#8-decisiones-tomadas)).
6. **`forma_pago` de apartados y abonos.** El CSV de apartados no la indica, pero el CSV de ventas sí trae la de algunos pagos de apartados (las filas que el paso 7 omite como duplicados).
   - Si una fila omitida como duplicado coincide por **`fecha` + importe** con **exactamente un** pago del CSV de apartados (el abono inicial de un apartado o un abono), ese pago usa la `forma_pago` de la fila de ventas. Origen: «CSV de ventas, fila N».
   - Si no coincide con ninguno, o coincide con más de uno, va `efectivo`, el valor por defecto de la app. Origen: «`efectivo` por defecto».
   - Con los datos de `data/`:
     - el abono inicial de Sofía Navarro (06/10, 10 €) va como **`bizum`**;
     - el abono inicial de Miguel Ángel López (01/10, 5 €) y el abono de Ana Torres del 03/10 (20 €) van como `efectivo`, tomado del CSV de ventas;
     - el resto va como `efectivo` por defecto.
   - El informe indica, para cada apartado y abono, su forma de pago y de dónde sale.

**Clasificación de las ventas** (en el mismo Code)

7. Se cargan las ventas normales. **No** se cargan como venta (van al informe como omitidas):
   - Filas cuyo `concepto` contiene `abono` o `(apartado)`, sin distinguir mayúsculas. Son pagos de apartados que ya están en el CSV de apartados; cargarlas los contaría dos veces. Motivo: «Fila omitida: duplicado del CSV de apartados».
   - La fila `TOTAL` (total del mes sumado a mano; no es una venta). Motivo: «Fila omitida: total calculado a mano».
8. `Limpiar y clasificar` devuelve un item por operación, con un campo `tipo`: `apartado` (con sus `abonos`, la `resta` de su última fila y las filas de origen), `venta`, `dudoso` u `omitida`. El Switch `Según el tipo` los reparte.

**Carga de apartados y abonos** (un apartado cada vez, con Loop Over Items, para que sus abonos vayan después de crearlo y en orden de fecha)

Todas las llamadas usan HTTP Request a `http://tienda:8000/api/...` con Authentication **Generic Credential Type → Header Auth → `API Tienda`**.

9. **¿Ya existe el apartado?**
   - `Buscar apartado` hace `GET /api/apartados?q=<cliente>`. La app busca con `LIKE` en cliente, producto y teléfono, y sin `pagina` devuelve todos.
   - Después se compara **cliente normalizado + `producto` + `talla` + `fecha`**.
     - Si coincide uno, el apartado **ya existía**: no se crea y se usa su `id`.
     - Si no, `Crear apartado` hace `POST /api/apartados` con `cliente`, `telefono` (si lo hay), `producto`, `talla`, `precio`, `abono_inicial`, `forma_pago` (la del paso 6) y la `fecha` original.
   - **Ojo:** los datos de ejemplo de la app (`backend/seed.py`) tienen apartados de **los mismos clientes** (Carmen Ruiz, Jorge Martín, Lucía Gómez y los demás) con productos de la misma lista, tallas al azar y otras fechas. Comparar solo por nombre asignaría los abonos a un apartado equivocado. Por eso la comparación incluye `producto`, `talla` y `fecha`.
10. **Abonos del apartado**, uno a uno y por orden de fecha:
    - `Leer apartado con abonos` hace `GET /api/apartados/{id}`, y se compara **`fecha` + `importe`** con su lista `abonos`. El abono inicial también aparece en esa lista, con la fecha del apartado.
    - Si coincide, el abono ya existía. Si no, `Registrar abono` hace `POST /api/apartados/{id}/abonos` con `importe`, `forma_pago` (la del paso 6) y la `fecha` original.
11. Si `Crear apartado` da `422`, el apartado va al informe con el `detail` de la app y **sus abonos van como dudosos** (paso 5).
12. **Comprobación:** al terminar los abonos del apartado, `GET /api/apartados/{id}` y se compara el `pendiente` de la app con la `resta` de la última fila del grupo. Si no coincide, va al informe como **diferencia**, con los dos valores. Nunca se corrige a mano: `abonado` y `pendiente` son siempre los de la app.

**Carga de ventas**

13. **¿Ya existe la venta?**
    - `Buscar ventas del día` hace `GET /api/ventas?desde=<fecha>&hasta=<fecha>`, y se compara **`concepto` + `importe`**.
    - Si coincide, ya existía. Si no, `Registrar venta` hace `POST /api/ventas` con `concepto`, `importe`, `forma_pago` del CSV y la `fecha` original.

**Respuestas de la API**

14. Los nodos `GET` llevan **Always Output Data** activado. Si la búsqueda no devuelve nada, el flujo sigue y se trata como «no existe».
15. Todos los HTTP Request llevan **Settings → On Error → Continue (using error output)**. En la salida de error, un IF mira el código:
    - **`422`**: la fila va al informe con el `detail` de la app y el flujo sigue con la siguiente.
    - **Otro código** (`401`, `404`, `5xx`, app caída): `Error de la API` (Stop and Error) hace fallar la ejecución y lo avisa el `08`.

**Informe**

16. `Preparar informe` (Code) reúne los resultados de todas las ramas, y `Enviar informe de migración` (Send Email, credencial `Mailpit`) lo manda **en un solo correo**, From y To `tienda@pasofirme.example`. Ver la sección 5.

**Procedimiento** (lo hace la pareja, no el flujo)

- **Antes de migrar, despublicar `01 · Eventos de la tienda`, y volver a publicarlo después.** Cada apartado creado dispara `apartado.creado` (HU-01). Como el Excel no tiene email, llegarían 7 avisos «sin email» a la tienda. Con el `01` despublicado, la app recibe un `404` del webhook, el aviso se pierde y la carga sigue.
- **Ejecutar por la Test URL del formulario** (editor escuchando). Así no hay que publicar el `09`. En ese modo el `08` no salta, porque n8n no ejecuta el Error Workflow en ejecuciones manuales: un error que no sea `422` se ve en el propio editor.

## 5. Salidas

| Destinatario | Canal | Cuándo | Datos que incluye |
|---|---|---|---|
| Tienda (`tienda@pasofirme.example`) | Correo (`Mailpit`), From `tienda@pasofirme.example` | Al terminar cada ejecución | **Creados:** apartados (`id`, `cliente`, `producto`, `fecha`, `forma_pago` y su origen: «CSV de ventas, fila N» o «`efectivo` por defecto»), abonos (apartado, `fecha`, `importe`, `forma_pago` y su origen) y ventas (`fecha`, `concepto`, `importe`) · **Ya existían:** lo mismo · **Dudosos:** fila, datos, motivo y `notas` · **Filas omitidas:** fila y motivo · **Diferencias con `resta`:** apartado, `pendiente` de la app y `resta` del Excel · **Errores de la API:** fila y `detail` |

En la app quedan los apartados, abonos y ventas creados. Los avisos del webhook se pierden porque el `01` está despublicado.

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| Abono inicial menor de 5 € | No se carga: dudoso en el informe (ni se llama a la API) |
| Abono cuyo apartado no se cargó | No se carga: dudoso en el informe |
| Fecha o importe que no se pueden limpiar | No se carga: dudoso en el informe |
| Fila de ventas que es un pago de apartado (`abono`, `(apartado)`) | No se carga: omitida («duplicado del CSV de apartados») |
| Fila `TOTAL` | No se carga: omitida («total calculado a mano») |
| La API responde `422` (por ejemplo, un abono que supera lo pendiente o una forma de pago no válida) | La fila va al informe con el `detail` de la app; el flujo sigue con las demás |
| La API responde `401` (credencial `API Tienda` mal) u otro error que no es `422`, o la app no responde | `Error de la API` hace fallar la ejecución; lo avisa el `08` (solo en ejecuciones de producción) |
| Se ejecuta dos veces | No duplica: lo que ya está sale como «ya existía» (pasos 9, 10 y 13) |
| `pendiente` de la app ≠ `resta` del Excel | Diferencia en el informe; no se corrige |
| Una búsqueda `GET` no devuelve nada | Sigue (Always Output Data) y se crea |
| El `01` está publicado durante la migración | La migración funciona, pero llegan a la tienda 7 avisos «sin email» de HU-01 |
| Falla el envío del informe (Mailpit caído) | El nodo da error; lo avisa el `08` (solo en producción). Lo cargado ya está en la app; al repetir, sale como «ya existía» |
| Una fila de ventas omitida como duplicado no coincide (por `fecha` + importe) con ningún pago del CSV de apartados, o coincide con más de uno | Ese pago va con `efectivo` por defecto, y el informe lo indica |
| Riesgo: los datos de ejemplo tienen un apartado del mismo cliente, producto, talla y fecha que una fila del Excel | Se tomaría como «ya existía» y sus abonos irían a ese apartado. Al comparar los cuatro datos es muy poco probable (la talla y la fecha del seed son al azar) |

## 7. Prueba

**Condición previa:** la app sin datos de la migración y el `01` despublicado.

> **Ojo con los datos de ejemplo** (`SEED=1`): tienen los mismos clientes y los mismos conceptos e importes de venta (`Calcetines pack 3` 6.50, `Crema calzado` 4.50, `Bota montaña T41` 79.90...) en los últimos 75 días. Si un día del Excel coincide con una venta de ejemplo con el mismo concepto e importe, esa venta saldría como «ya existía» y no se cargaría. Para que la prueba dé exactamente estos números, lo mejor es una app sin datos de ejemplo (`SEED=0` con el volumen `tienda_data` vacío). **No** usar `docker compose down -v`, que borra también el volumen de n8n (flujos y credenciales).

Entrada: los dos ficheros de `data/`, subidos en el formulario `Subir el Excel`.

**CSV de apartados** (fila = número de fila de datos, sin la cabecera)

| Fila | Datos (ya limpios) | Resultado esperado en la 1.ª ejecución |
|---|---|---|
| 1 | 2026-09-02 · Carmen Ruiz · 612 345 001 · Botín piel marrón 38 · precio 89.90 · abono 10 · resta 79.90 | **Apartado creado** (`abono_inicial` 10, `efectivo` por defecto) |
| 2 | 2026-09-02 · Jorge Martín · `612345002` → 612 345 002 · Zapatilla running azul 43 · 64.50 · 5 · 59.50 | **Apartado creado** (`efectivo` por defecto) |
| 3 | 2026-09-03 · Lucía Gómez · 612 345 003 · Sandalia tacón negra 37 · 45 · 4 · 41 · «dijo que paga el resto el viernes» | **Dudoso:** abono inicial de 4 € (mínimo 5 €) |
| 4 | 2026-09-05 · `carmen ruiz` → Carmen Ruiz · Botín piel marrón · abono 20 · resta 59.90 · «abono» | **Abono** de 20 € al apartado de la fila 1 (`efectivo` por defecto) |
| 5 | `7/9/26` → 2026-09-07 · Ana Torres · sin teléfono · Mocasín ante 39 · 72 · `15€` → 15 · 57 | **Apartado creado** sin teléfono (`efectivo` por defecto) |
| 6 | 2026-09-10 · Pedro Sanz · 612 345 005 · Bota agua niño 31 · 29.95 · 5 · 24.95 | **Apartado creado** (`efectivo` por defecto) |
| 7 | 2026-09-12 · Jorge Martín · Zapatilla running azul · abono 30 · resta 29.50 · «abono» | **Abono** de 30 € al apartado de la fila 2 (`efectivo` por defecto) |
| 8 | 2026-09-15 · Rosa Díaz · 612 345 006 · Zapato vestir hombre 42 · 95 · 50 · 45 | **Apartado creado** (`efectivo` por defecto) |
| 9 | 2026-09-20 · Lucía Gómez · Sandalia tacón negra · abono 41 · resta 0 · «LIQUIDADO - recogió» | **Dudoso:** su apartado (fila 3) no se cargó. La nota dice que ya recogió los zapatos: lo decide Marisa |
| 10 | 2026-10-01 · Miguel Ángel López · 612 345 007 · Deportiva blanca 44 · 55 · 5 · 50 | **Apartado creado** (`efectivo`, del CSV de ventas, fila 1) |
| 11 | 2026-10-03 · Ana Torres · Mocasín ante · abono 20 · resta 37 · «abono» | **Abono** de 20 € al apartado de la fila 5 (`efectivo`, del CSV de ventas, fila 6) |
| 12 | 2026-10-06 · Sofía Navarro · 612 345 008 · Bailarina roja 36 · 39.90 · 10 · 29.90 | **Apartado creado** (**`bizum`**, del CSV de ventas, fila 8) |

Comprobación del paso 12 (`pendiente` de la app frente a `resta`):

| Apartado | `pendiente` de la app | `resta` de la última fila |
|---|---|---|
| Carmen Ruiz | 59.90 | 59.90 (fila 4) |
| Jorge Martín | 29.50 | 29.50 (fila 7) |
| Ana Torres | 37.00 | 37 (fila 11) |
| Pedro Sanz | 24.95 | 24.95 (fila 6) |
| Rosa Díaz | 45.00 | 45 (fila 8) |
| Miguel Ángel López | 50.00 | 50 (fila 10) |
| Sofía Navarro | 29.90 | 29.90 (fila 12) |

Coinciden todos: 0 diferencias.

**CSV de ventas**

| Fila | Datos (ya limpios) | Resultado esperado en la 1.ª ejecución |
|---|---|---|
| 1 | 2026-10-01 · Deportiva blanca T44 (abono inicial apartado) · 5 · efectivo | **Omitida:** duplicado del CSV de apartados (abono inicial de la fila 10, que toma de aquí `efectivo`) |
| 2 | 2026-10-01 · Calcetines pack 3 · 6.50 · efectivo | **Venta creada** |
| 3 | 2026-10-01 · Bota montaña T41 · 79.90 · tarjeta | **Venta creada** |
| 4 | 2026-10-02 · Plantillas gel · 12 · tarjeta | **Venta creada** |
| 5 | 2026-10-02 · Zapatilla casa T38 · 18.95 · efectivo | **Venta creada** |
| 6 | 2026-10-03 · Abono Ana Torres mocasin · 20 · efectivo | **Omitida:** duplicado del CSV de apartados (abono de la fila 11, que toma de aquí `efectivo`) |
| 7 | 2026-10-03 · Botín piel negro T40 · 92 · tarjeta | **Venta creada** |
| 8 | 2026-10-06 · Bailarina roja T36 (apartado) · 10 · bizum | **Omitida:** duplicado del CSV de apartados (abono inicial de la fila 12, que toma de aquí `bizum`) |
| 9 | 2026-10-06 · Crema calzado · 4.5 · efectivo | **Venta creada** |
| 10 | TOTAL SEPTIEMBRE (a mano) · `1.842,30` | **Omitida:** total calculado a mano |

**Resumen esperado del informe**

| | 1.ª ejecución | 2.ª ejecución (mismos ficheros) |
|---|---|---|
| Apartados creados | 7 | 0 (los 7 «ya existían») |
| Abonos creados (sin contar los iniciales) | 3 | 0 (los 3 «ya existían») |
| Ventas creadas | 6 | 0 (las 6 «ya existían») |
| Dudosos | 2 (Lucía Gómez, filas 3 y 9) | 2 (los mismos) |
| Filas omitidas | 4 (3 filas de abono y el TOTAL) | 4 (las mismas) |
| Diferencias con `resta` | 0 | 0 |
| Errores de la API | 0 | 0 |

Después de la 2.ª ejecución, la app tiene los mismos apartados, abonos y ventas que después de la 1.ª.

**Evidencias previstas** (todavía no existen):

- Informe de la 1.ª ejecución en Mailpit: `docs/evidencias/09-hu10-informe-primera.png`
- Informe de la 2.ª ejecución, todo «ya existía»: `docs/evidencias/09-hu10-informe-segunda.png`
- Un apartado migrado en la app, con su fecha original y sus abonos: `docs/evidencias/09-hu10-apartado-migrado.png`

## 8. Criterios de aceptación

**HU-10 · Migración del Excel antiguo**

- [ ] Los CSV de `data/` se leen y se limpian (fechas, nombres, importes con €).
- [ ] Los apartados y abonos se crean en la app por API conservando su fecha original.
- [ ] Ejecutarlo dos veces no duplica los datos.
- [ ] Los casos dudosos (por ejemplo, un abono inicial menor de 5 €) no se cargan y salen en un informe para que Marisa decida.
