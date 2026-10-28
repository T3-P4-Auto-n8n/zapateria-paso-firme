# Comparativa de dos modelos gratuitos · #96

## Tarea y elección (#97)

Se compara la extracción de HU-03: devolver exactamente `ordenante` (string literal), `importe` (número EUR) y `concepto` (string literal, incluso vacío). La IA no identifica clientes ni decide o registra abonos. Es una tarea acotada con resultados verificables en los nueve correos ficticios de `data/correos/`.

Modelos: **`openai/gpt-oss-20b`** y **`openai/gpt-oss-120b`**, disponibles a través de Groq. Se eligieron el modelo ya utilizado en HU-03 y otro de mayor tamaño, manteniendo proveedor, instrucciones y parámetros. Groq publica una [capa gratuita y límites](https://console.groq.com/docs/rate-limits) y documenta ambos en [modelos soportados](https://console.groq.com/docs/models), consultados el 28/10/2026. Los límites y la disponibilidad pueden cambiar. No se cambió el plan ni se consultó la facturación de la cuenta: esta prueba no certifica un cargo de 0 €.

## Método reproducible (#98)

Ejecución real: **28/10/2026, 16:23:31–16:26:24 UTC**. [Evidencia completa](evidencias/96-comparativa-modelos.json): prompt, parámetros, hashes SHA-256 de fixtures, entrada/salida ficticia, resultado esperado, HTTP, duración, finish reason, uso de tokens y agregados.

- Tres rondas por cada uno de los ocho correos de pago: **24 peticiones por modelo, 48 en total**, sin reintentos.
- Publicidad se descarta antes de llamar al modelo: 0 peticiones para ese caso. Los resultados de extracción son sobre **8 correos**, no 9 llamadas ni pruebas de registro bancario.
- Solo salen los tres campos etiquetados de los fixtures ficticios: nunca cabeceras, email, teléfono, cuenta bancaria ni el cuerpo completo.
- Mismo prompt que el nodo HU-03; `temperature=0`, `max_completion_tokens=2048`, `reasoning_effort=low`, `response_format=json_object`. El prompt completo queda en la evidencia y el script.
- Se alterna el orden de modelos en cada ronda y se esperan 3 segundos tras cada petición. Las rondas tienen orden 20B/120B, 120B/20B y 20B/120B.
- Calidad estricta: exactamente tres claves, tipos correctos y todos los valores iguales a la referencia. Un concepto vacío debe conservar `""`; `null` es un fallo del contrato. Un importe booleano o string no es un número válido.
- Latencia observada de extremo a extremo: petición HTTP y lectura/validación completa, con red incluida, sin streaming. Mediana y p95 por rango más cercano (`ceil(0.95*n)`) sobre respuestas HTTP 200. No es la velocidad de tokens del proveedor.
- Los errores HTTP/transporte cuentan como intentos fallidos, no se excluyen de la calidad. Ningún fallo en esta ejecución.

Para repetir, disponer de la credencial en la variable de entorno `GROQ_API_KEY`, sin pegarla en comandos versionados, ficheros ni argumentos. El script no carga `.env` ni consulta credenciales n8n:

```bash
python3 -m unittest discover -s tests -p test_comparar_modelos.py
python3 scripts/comparar_modelos.py --output /tmp/comparativa-modelos.json
```

En esta ejecución, la credencial existente de Groq se reutilizó únicamente en memoria; ni la clave ni la salida de exportación de credenciales se escribieron en disco o en mensajes. El runner solo llama a `api.groq.com`: no accede a la API de tienda ni envía correos. El script verifica 9 archivos/8 pagos y los campos etiquetados, pero no acredita por sí solo que los datos sean ficticios: usar exclusivamente los fixtures revisados del repositorio. Los hashes de la evidencia identifican los archivos de esta ejecución.

## Resultados

| Modelo | Extracción exacta | Esquema válido | HTTP/transporte fallidos | Mediana | p95 |
|---|---|---|---|---|---|
| `openai/gpt-oss-20b` | **24/24 (100 %)** | 24/24 | 0/24 | **517,65 ms** | 1429,31 ms |
| `openai/gpt-oss-120b` | **21/24 (87,5 %)** | 21/24 | 0/24 | 574,11 ms | **904,69 ms** |

| Correo | 20B, aciertos en 3 rondas | 120B, aciertos en 3 rondas |
|---|---|---|
| 01 Carmen | 3/3 | 3/3 |
| 02 Jorge | 3/3 | 3/3 |
| 03 Lucía | 3/3 | 3/3 |
| 04 Laura | 3/3 | 3/3 |
| 05 Romero | 3/3 | **0/3** |
| 06 Paula | 3/3 | 3/3 |
| 07 Desconocido | 3/3 | 3/3 |
| 08 Publicidad | Descarte local; sin modelo | Descarte local; sin modelo |
| 09 Silvia | 3/3 | 3/3 |

El 120B devolvió en las tres rondas de Romero:

```json
{"ordenante":"ROMERO D","importe":10.00,"concepto":null}
```

La referencia exige `concepto:""`, tal como aparece en el campo bancario. No hubo importes ni nombres incorrectos en los demás casos. El prompt combina «conserva … sin corregir ni completar» y «si falta un dato usa null»: el 120B interpretó el concepto vacío como dato ausente. Es una ambigüedad real del prompt frente al contrato estricto de HU-03; no demuestra incapacidad general del modelo. La validación determinista de HU-03 rechaza `null` y remite el caso a revisión; nunca debe corregirse aceptando un abono dudoso.

## Decisión y límites (#99)

**Mantener 20B para esta extracción**, porque cumple 24/24 contratos con menor mediana en esta muestra. El 120B tuvo mejor p95, por lo que no se afirma que 20B sea siempre más rápido. Ambos resultados dependen de red, carga, caché y proveedor; tres rondas de ocho plantillas son pocas y no constituyen un benchmark general, independiente ni de concurrencia. Temperatura 0 no garantiza determinismo.

Una mejora posterior sería aclarar expresamente el caso de concepto vacío y repetir ambos modelos con un segundo prompt, sin mezclar esos resultados con esta comparación. No se cambió el workflow HU-03 ni su comportamiento durante esta tarea. No se compararon decisiones de negocio, datos reales, recuperación frente a cuotas ni otros idiomas o formatos bancarios.

Verificación del runner: 4/4 tests (esquema/tipos/concepto vacío, minimización de datos, contabilización de errores y respuesta HTTP 200 malformada); regresión backend en contenedor aislado: 13/13. La prueba backend local no pudo iniciar por falta de `openpyxl`; se ejecutó con las dependencias de la imagen del proyecto y una base temporal, sin cambios en la tienda.
