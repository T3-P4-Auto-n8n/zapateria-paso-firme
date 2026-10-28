# Flujo 05 · Cierre diario

> HU-04 (#41, subtareas #42–#48). Implementación y resultados verificables abajo; una prueba local no acredita una ejecución en n8n ni una entrega nocturna.

## 1. Cabecera

- **Flujo:** `05 · Cierre diario`, `workflows/05-cierre-diario.json`.
- **HU / nivel / responsable:** HU-04, Esencial, Beste.
- **Credenciales:** `API Tienda` (Header Auth), `Mailpit` (SMTP), `Google Sheets` (OAuth2).
- **Error workflow:** seleccionar el `08 · Error Workflow` local en Settings.
- **Timezone:** `Europe/Madrid`. Export inactivo: la pareja revisa y publica.

## 2. Objetivo

Enviar cada noche a la tienda el cierre completo del día anterior, con ventas directas, abonos y total por efectivo, tarjeta y Bizum, y guardar una fila por fecha en Google Sheets.

## 3. Disparador y entradas

- `Cada noche a las 00:05` (Schedule Trigger): cada día, cron `5 0 * * *`, Europe/Madrid. Cierra **ayer**, después de terminar el día: no pierde cobros de los últimos minutos. El horario es una decisión de implementación.
- `Elegir día` (Form Trigger): campo Date obligatorio `fecha`; permite prueba o recuperación sin editar el flujo. Formato ISO `AAAA-MM-DD`. Cada prueba requiere Execute workflow y una pestaña nueva.
- `Calcular día`: un item `{fecha, desde, hasta}`, con desde=hasta=fecha. Sin campo fecha usa la fecha de ayer en Madrid, incluyendo cambios de mes/año y horario de verano. Un campo vacío o inválido es error; no cae silenciosamente a ayer.
- API: Venta (`id`, `fecha`, `importe`, `forma_pago`) y Abono (mismos campos más `apartado_id`). No se leen clientes ni se recalcula pendiente/abonado.

## 4. Pasos y reglas

1. Ambos triggers → `Calcular día` (Code, Run Once for All Items).
2. `Leer ventas del día`: GET `http://tienda:8000/api/ventas`, query desde/hasta de `$('Calcular día').first().json`. Sin pagina: todas las ventas.
3. `Leer abonos del día`: GET `http://tienda:8000/api/abonos`, mismas fechas. **Incluye los abonos iniciales**, que son cobros y no ventas directas.
4. Ambos HTTP: Header Auth `API Tienda`, Execute Once, Always Output Data y timeout 30 s. No Never Error ni Continue On Error: un HTTP fallido impide emitir cifras incompletas.
5. `Preparar cierre` (Code, Run Once for All Items) lee ambos nodos por nombre. Descarta únicamente el item vacío de Always Output Data. Valida fecha, ID único por colección, importe positivo con hasta dos decimales y forma_pago en efectivo/tarjeta/bizum. Respuesta errónea o de otro día: error, no cierre ficticio. Suma en céntimos enteros y comprueba desbordamiento. No usa IA.
6. Devuelve un item con `fecha`, desglose numérico de ventas, abonos y total por método, totales, números de operaciones, `sin_movimientos`, `asunto`, `html` y `fila` (registro del histórico). Los euros se muestran con dos decimales.
7. `Guardar cierre en Sheets`: Google Sheets **Append or Update Row**, pestaña `Cierres`, matching column **fecha**, mapeo explícito de `fila`. Repetir secuencialmente un día actualiza la fila; no suma otra vez. No ejecutar cierres simultáneos para el mismo día: Sheets no ofrece restricción única transaccional. Sin retries automáticos.
8. `Enviar cierre diario`: From/To `tienda@pasofirme.example`, Mailpit, HTML; asunto y html se leen de `$('Preparar cierre').first().json`, no del resultado de Sheets. Append n8n Attribution desactivado. Solo envía después de guardar correctamente el histórico.

La programación publicada depende de n8n en marcha. Si se pierde una ejecución, recuperar el día con el formulario. Una repetición puede reenviar el correo; el upsert evita duplicar la fila, no garantiza envío exactamente una vez. Las modificaciones retroactivas de la app se reflejan al repetir el cierre.

## 5. Salidas

- Correo: `Cierre de <fecha>: <total> € recaudados`; tabla filas Ventas directas, Abonos, Total; columnas Efectivo, Tarjeta, Bizum, Total y Nº. Sin datos personales.
- Día vacío: «No hubo movimientos el <fecha>», tabla a cero y fila del histórico con ceros; se envía igual.
- Google Sheets, pestaña **Cierres**, fila 1 con estos encabezados exactos (sin fórmulas ni filas de ejemplo en producción):

```text
fecha,ventas_efectivo,ventas_tarjeta,ventas_bizum,ventas_total,ventas_operaciones,abonos_efectivo,abonos_tarjeta,abonos_bizum,abonos_total,abonos_operaciones,total_efectivo,total_tarjeta,total_bizum,total,operaciones,sin_movimientos
```

Una fila por fecha ISO, importes numéricos en euros y sin_movimientos booleano. El documento y credencial se seleccionan al importar; sus identificadores son referencias, no secretos. Ver [guía de configuración](../docs/hu04-cierre-diario.md).

## 6. Casos de error

| Caso | Comportamiento |
|---|---|
| 401, 404, 422, 5xx o red en GET | Parar sin guardar ni enviar un cierre incompleto; 08 en producción. |
| Respuesta malformada, importe inválido, ID duplicado, método desconocido, fecha incorrecta | Parar en Preparar cierre; no descartar silenciosamente dinero. |
| Ninguna venta/abono | Siempre se produce un cierre con ceros y mensaje explícito. |
| Google OAuth/documento/pestaña/encabezados incorrectos | Parar sin correo de cierre; revisar configuración y repetir por formulario. |
| SMTP falla después de guardar | Error; la fila existe. Revisar Mailpit antes de repetir para no duplicar un envío incierto. |
| n8n parado de noche | Recuperar fecha manualmente; no inventar que se ejecutó el horario. |

## 7. Prueba

Suite `node --test tests/test_hu04.cjs`: datos mixtos, céntimos, abonos iniciales, días vacíos, entrada inválida, fechas de Madrid y contrato de integración del export. Los fixtures están en `tests/payloads/hu04/`.

| Caso | Esperado |
|---|---|
| Fixture mixto 2026-10-26 | Ventas: 10.10 efectivo, 20.20 tarjeta, 30.30 Bizum = 60.60 (3). Abonos: 5 efectivo, 2.25 tarjeta, 1.15 Bizum = 8.40 (3). Total: 15.10 / 22.45 / 31.45 = **69.00**, 6 operaciones. |
| Día vacío | 0.00 en todas las cifras; 0 operaciones; mensaje sin movimientos y fila con ceros. |
| 0.10 + 0.20 | 0.30 exactos, sin error de coma flotante. |
| Método desconocido, negativo, null, 3 decimales, otra fecha o ID duplicado | Error; no guardar ni enviar. |
| 2026-01-01 a las 00:05 Madrid | Cierra 2025-12-31. |
| Cambio de horario marzo/octubre | Ayer según calendario Madrid; sin restar 24 horas al instante. |
| Repetir una fecha en Sheets | Una fila actualizada; correo puede repetirse. Verificado con ejecuciones 32 y 38 y readback de Sheets: una fila para 2026-10-26. |

Los resultados ejecutados y sus límites se recogen en [evidencias](../docs/evidencias/05-hu04-resultados.md). Las pruebas automáticas no demuestran entrega programada ni OAuth de Google.

## 8. Criterios de aceptación

- [ ] Cada noche llega un resumen con ventas directas, abonos y el total, separados por forma de pago (efectivo, tarjeta y Bizum).
- [x] Los importes coinciden con los de la app.
- [x] Si ese día no hubo movimientos, el resumen lo dice en vez de fallar.

No marcar la entrega nocturna ni Sheets sin ejecución real. El estado final de cada requisito se documenta con evidencia en la sección 7 y su enlace.
