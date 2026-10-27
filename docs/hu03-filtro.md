# HU-03 · Filtro de pagos (#33)

## Workflow integrado

El filtro forma parte de `workflows/03-abonos-distancia.json`; ya no hay un export independiente para importarlo. El workflow completo está inactivo y el trigger IMAP permanece deshabilitado. La entrada normalizada llega a **Filtrar aviso bancario**, que distingue pagos recibidos, publicidad y entradas inválidas.

| Ruta | Resultado en el workflow integrado |
|---|---|
| `extraer` | Prepara los campos mínimos para Groq; el modelo solo extrae ordenante, importe y concepto. |
| `ignorar` | Termina sin llamar a Groq, consultar la tienda, registrar un abono ni enviar aviso. |
| `revisar` | Prepara un aviso manual para la tienda; nunca registra automáticamente. |

El filtro reconoce las plantillas de ejemplo («has recibido un Bizum», «transferencia recibida» y «se ha abonado una transferencia»). Normaliza solo para comparar y conserva asunto, cuerpo y referencia originales. `es_pago: true` no autoriza el pago; #35–#37 aplican las comprobaciones de negocio.

## Pruebas y seguridad

Importar solo el JSON integrado. Mantenerlo inactivo, con IMAP deshabilitado, credenciales locales elegidas y API de prueba aislada antes de enviar muestras. No usar correos reales. Las reglas no autentican al banco y no cubren automáticamente plantillas bancarias nuevas.

`node --test tests/test_hu03_filtro.cjs tests/test_hu03_entrada.cjs` ejecuta los nodos exportados con los nueve `.eml`: ocho pagos llegan a extracción, el anuncio va a `ignorar` e inválidos a revisión. También cubre pagos salientes, promociones y entradas incompletas. La suite local no sustituye la ejecución completa en n8n.
