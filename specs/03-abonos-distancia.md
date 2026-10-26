# HU-03 · Abonos a distancia — especificación y tabla de decisión

Estado: especificación de #31 preparada para revisión de la pareja. Primera subtarea: [#31](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/issues/31), historia [#30](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/issues/30).

## 1. Cabecera

- **Flujo:** `03 · Abonos a distancia`; futuro JSON `workflows/03-abonos-distancia.json`.
- **HU:** HU-03, historia #30; esta entrega cubre la especificación #31.
- **Nivel:** Esencial.
- **Responsable:** Beste.
- **Credenciales y variables:** Header Auth de la API (`X-API-Key`), `Mailpit` (SMTP), credencial del proveedor de IA y Gmail o IMAP para la entrada final. Solo referencias a credenciales; nunca valores.
- **Dependencias:** HU-02 en workflow 01 para el recibo y workflow 08 para errores técnicos. La pareja importa, prueba y publica los flujos.
- **Alcance:** #32 entrada, #33 filtro, #34 extracción, #35 búsqueda, #36 decisión, #37 registro, #38 aviso, #39 pruebas y #40 exportación/PR. Este documento define el comportamiento; no acredita que esos pasos estén implementados.

## 2. Objetivo y vocabulario

Marisa recibe avisos bancarios. El flujo registra un abono únicamente si identifica un apartado sin dudas y la API permite el pago. Un **apartado** reserva un producto para un cliente; un **abono** reduce su pendiente. La API calcula abonado, pendiente y estado. El apartado admite pagos durante 90 días y queda liquidado al alcanzar pendiente cero. El mínimo de 5 € corresponde al abono inicial, no a cada pago posterior.

## 3. Disparador y entradas

- Desarrollo: Form Trigger de n8n con asunto y cuerpo copiados desde `data/correos/`.
- Versión final: Gmail/IMAP, con identificador del mensaje para trazabilidad.
- Salida JSON de la IA: `ordenante` (texto), `importe` (número positivo en EUR) y `concepto` (texto, puede estar vacío). Solo esos tres datos explícitos; no decide a qué cliente asignarlos.
- Datos de control calculados por reglas del flujo, ajenos a las entidades de la API: `es_pago` (booleano del filtro), `apartado_id` (entero leído del concepto o null) y `medio` (`bizum` o `transferencia`, identificado en el aviso original). La IA no inventa identificadores ni autoriza pagos.
- Salidas: ignorar publicidad; registrar y dejar que HU-02 envíe el recibo; o pedir revisión a Marisa con motivo, importe y candidatos, sin registrar nada.
- No inferir fechas históricas de «la de este aviso»: los ejemplos se prueban con la fecha del día. La API aplica su fecha actual si se omite `fecha`.

## 4. Pasos y reglas

1. Filtrar publicidad. Si falta concepto, preguntar a Marisa sin registrar, aunque exista un candidato. Validar la extracción: importe numérico, positivo, EUR y datos suficientes; si faltan, revisión manual.
2. Si el concepto contiene un número explícito de apartado, consultar `GET /api/apartados/{id}`. Un 404 requiere revisión; no buscar otro apartado para sustituirlo silenciosamente.
3. Sin número, consultar `GET /api/apartados?estado=activo&q=...`. Recuperar todos los resultados sin paginación. El buscador usa SQL LIKE: no elimina tildes, no interpreta iniciales ni nombres completos con apellidos adicionales. Usar un término de búsqueda conservador y contrastar los candidatos normalizando mayúsculas/tildes en el flujo; no enviar el nombre bancario completo y asumir que un resultado vacío significa cliente desconocido. La coincidencia debe ser inequívoca y compatible con concepto/producto.
4. Cero candidatos: preguntar a Marisa. Varios o identidad abreviada sin concepto suficiente: preguntar. El número explícito también exige comprobar que la identidad y el concepto sean compatibles; si hay contradicción, revisión manual. Un candidato aún exige comprobar estado y plazo; `activo` por sí solo no garantiza que esté en plazo.
5. No admitir estados liquidado/vencido, fecha actual posterior a `fecha_limite` o importe superior a `pendiente`. No repartir pagos ni crear apartados automáticamente.
6. Consultar saldo actualizado antes de escribir. Para un Bizum o transferencia válidos (ambos se registran como `bizum`, decisión confirmada en AGENTS.md, sección 8): `POST /api/apartados/{id}/abonos` con `{"importe": 10, "forma_pago": "bizum"}`. Todas las llamadas requieren `X-API-Key` guardada en credenciales de n8n.
7. Un 201 devuelve el apartado actualizado y provoca `abono.registrado`; HU-02 gestiona el recibo, con mensaje de recogida si queda liquidado. No duplicar el envío desde este flujo.
8. Un 422 es una rama de negocio: configurar HTTP Request con **On Error → Continue** y avisar a Marisa con el motivo devuelto. Un 401, fallo de red o 5xx es un error técnico; no comunicar éxito ni reintentar un POST a ciegas.

Propuesta pendiente de implementar: registrar identificadores de mensajes procesados para evitar duplicar abonos al releer un correo. Un POST con resultado incierto requiere conciliación antes de repetirse; la API actual no ofrece una clave de idempotencia.

## 5. Salidas

- **Pago registrado:** la API emite `abono.registrado`. HU-02 envía al cliente su recibo con importe, abonado, pendiente y fecha límite, o el aviso de recogida si queda liquidado. Si el cliente no tiene email, HU-02 termina sin enviar nada, según AGENTS.md; no se duplica el recibo en HU-03.
- **Consulta o rechazo:** correo de `tienda@pasofirme.example` a `tienda@pasofirme.example` mediante Mailpit. Incluir motivo, ordenante, importe, concepto y, si existen, ID, cliente, producto, pendiente y fecha límite de los candidatos obtenidos por API. Pedir a Marisa que identifique el apartado o revise el pago. No registrar automáticamente tras enviar la pregunta; su resolución queda fuera de este flujo.
- **Publicidad:** terminar sin registro, recibo ni aviso.
- **Error técnico:** workflow 08, con flujo, paso, error y enlace a ejecución; sin secretos ni cuerpo completo del correo bancario.

## 6. Casos de error

| Caso | Qué hace el flujo |
|---|---|
| Extracción inválida, importe no positivo o moneda distinta de EUR | No registrar; pedir revisión a Marisa. |
| Sin concepto, identidad dudosa, cero o varios candidatos | No registrar; preguntar a Marisa con el motivo y candidatos disponibles. |
| 404 al consultar un ID explícito | No sustituirlo por otro apartado; avisar a Marisa. |
| Fuera de plazo, estado no activo o importe superior a pendiente | No registrar; avisar con el motivo y datos actuales de API. |
| 422 al registrar | **On Error → Continue**; distinguir la respuesta de error de un 201 y avisar a Marisa con el motivo de la API. Nunca enviar confirmación de éxito. |
| 401, red o 5xx | Error técnico al workflow 08; no reintentar un POST con resultado incierto. |
| Falla el envío del aviso | Error técnico al workflow 08; no convertirlo en pago aceptado. |
| Cliente sin email | Aplicar la decisión de HU-02: el abono válido se registra, pero no se envía recibo. |

## 7. Prueba: tabla de decisión de los nueve correos

Saldos comprobados localmente el 24/10/2026 con `seed.cargar()` en una SQLite temporal vacía; comprobarlos de nuevo al ejecutar las pruebas. Son expectativas para una carga inicial, no saldos de una tienda en ejecución. Repetir pruebas con datos aislados y restaurados.

| Archivo .eml | Datos extraídos | Apartado y pendiente inicial | Resultado esperado |
|---|---|---|---|
| `01_bizum_carmen.eml` | CARMEN RUIZ GARCIA; 10 €; zuecos | #1 Carmen Ruiz; 19,50 € | Coincidencia inequívoca con nombre y producto. Registrar Bizum: pendiente 9,50 €, activo; recibo HU-02. |
| `02_bizum_jorge.eml` | JORGE M.; 20 €; apartado 2 bota | #2 Jorge Martín; 79 € | Usar el ID explícito 2. Registrar Bizum: pendiente 59 €, activo; recibo HU-02. |
| `03_transferencia_lucia.eml` | LUCIA GOMEZ PEREZ; 12 €; Liquidar mocasines | #3 Lucía Gómez; 12 € | Registrar con `forma_pago: "bizum"` según la decisión confirmada para transferencias. Pendiente 0 €, liquidado y aviso de recogida por HU-02. |
| `04_bizum_laura.eml` | LAURA O.; 15 €; deportivas | #12 Laura Ortega; 10 € | Inicial y producto compatibles con el ejemplo. No registrar: supera pendiente en 5 €. Avisar a Marisa; saldo sigue 10 €. Si la API recibe el intento, debe responder 422. |
| `05_bizum_romero.eml` | ROMERO D; 10 €; concepto vacío | Posible #11 David Romero; 15 € | Aunque el buscador devuelva un candidato, la identidad abreviada y el concepto vacío no autorizan asignarlo. Preguntar a Marisa; saldo sin cambios. |
| `06_bizum_paula.eml` | PAULA RAMOS LEON; 20 €; zapatillas running perdón por el retraso | #16 Paula Ramos; 59,50 €; activo pero fuera de plazo | No registrar. Avisar de plazo vencido; saldo y estado sin cambios. No generar vale desde HU-03. |
| `07_transferencia_desconocido.eml` | ANTONIO FERNANDEZ SOTO; 25 €; botas | Ninguno | Preguntar a Marisa por cliente desconocido. No crear apartado ni abono. |
| `08_publicidad_banco.eml` | Oferta de hasta 150 € por domiciliar cobros | No aplica | No es pago. Ignorar; ningún POST ni recibo. No extraer 150 € como abono. |
| `09_bizum_silvia.eml` | SILVIA CORTES; 5 €; abono sandalias | #24 Silvia Cortés; 35 € | Coincidencia inequívoca tras normalizar tilde. Registrar Bizum: pendiente 30 €, activo; recibo HU-02. |

### Preparación y evidencias

Usar una base aislada con datos de ejemplo recién cargados. Las fechas del seed son relativas al día de ejecución; no usar una tienda con saldos ya modificados. Comprobar por API el estado inicial antes de cada caso. Los importes de la tabla son expectativas de prueba, no cálculos a realizar por n8n.

Para #39, guardar en `docs/evidencias/` una tabla con correo, ID de ejecución, respuesta HTTP, saldo/estado antes y después, abonos añadidos, mensaje en Mailpit y resultado real frente al esperado. No marcar casos como superados sin ejecución real. Verificar cuatro registros (#1, #2, #3 y #24), cuatro consultas/avisos y un descarte. Probar además varios candidatos, 404, 401, 422, datos inválidos y relectura; la colección de nueve correos no cubre por sí sola todas esas ramas.

### Representación de transferencias

La app admite `efectivo`, `tarjeta` y `bizum`. Las transferencias se registran como `bizum`, decisión confirmada por el profesor y recogida en AGENTS.md, sección 8. Conservar el medio original en el contexto del aviso para trazabilidad, sin inventar un campo nuevo en la API ni modificar el backend. Nunca omitir `forma_pago`, porque su valor por defecto es `efectivo`.

## 8. Criterios de aceptación

- [ ] Los correos que no son un pago (como la publicidad del banco) se ignoran.
- [ ] De cada pago se extraen ordenante, importe y concepto, y se busca el apartado por API.
- [ ] Si hay un único apartado claro, se registra el abono y el cliente recibe su recibo (HU-02).
- [ ] Si el pago es dudoso (varios apartados posibles, sin concepto o cliente desconocido), no se registra nada y se pregunta a Marisa.
- [ ] Si el importe supera lo pendiente o el apartado está fuera de plazo, no se registra nada y se avisa a Marisa con el motivo.
- [ ] El flujo resuelve bien los correos de `data/correos/`.

Los criterios quedan sin marcar hasta las pruebas reales del flujo (#39).

Fuentes locales: `README.md` (HU-03 y tabla de correos), `data/correos/`, `backend/seed.py`, `backend/tests/test_datos_de_ejemplo.py`, rutas/controladores/modelos de apartados y abonos, `backend/config.py`.
