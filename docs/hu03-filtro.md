# HU-03 · Filtro de pagos (#33)

## Alcance

`workflows/03-abonos-distancia-filtro.json` amplía la entrada de #32, sin sustituir sus pruebas manuales pendientes. Es parcial e inactivo; IMAP permanece deshabilitado. El formulario usa el slug `hu03-filtro`, distinto de `hu03-entrada`, para no compartir URL de prueba.

El nodo **Filtrar aviso bancario** comprueba `entrada_valida` y busca expresiones de pago recibido en asunto/cuerpo: «has recibido un Bizum», «transferencia recibida» o «se ha abonado una transferencia». Normaliza mayúsculas y tildes solo para comparar; conserva el asunto, cuerpo y referencia originales. No extrae importes ni decide apartados.

## Salidas

| Ruta | Significado | Destino de esta entrega |
|---|---|---|
| `extraer` | Aviso reconocido de pago recibido | **Continuar con extracción (#34)**; nodo sin acciones hasta #34 |
| `ignorar` | No es un aviso reconocido de pago recibido | **Ignorar publicidad**; termina sin avisos ni escrituras |
| `revisar` | Entrada inválida | **Revisar entrada inválida**; nodo sin acciones hasta añadir el aviso en #38 |

La salida añade `es_pago` (booleano), `ruta` y `motivo`. Una ruta no prevista del Switch va a revisión, no a extracción. `es_pago: true` no autoriza un abono: búsqueda y validaciones de negocio siguen pendientes de #35–#37.

Las reglas reconocen los formatos de ejemplo, no todos los avisos posibles de cualquier banco. Antes de usar otra plantilla bancaria, añadir muestras y revisar el filtro. El filtro no autentica al banco ni garantiza que un correo no sea una copia; no sustituye conciliación e idempotencia.

## Desarrollo y prueba

Importar el JSON en n8n, guardar sin publicar y seguir `docs/hu03-entrada.md` para Form Trigger o IMAP. Ejecutar cada ejemplo por Test URL y verificar la salida del Switch. Esta etapa no llama a IA ni a la API de pagos y no envía mensajes.

El código del filtro está incluido en el nodo Code del JSON; los tests ejecutan ese código exportado.
Pruebas: `node --test tests/test_hu03_filtro.cjs tests/test_hu03_entrada.cjs`.

## Evidencia local (24/10/2026)

- Ocho avisos de Bizum/transferencia → `extraer`.
- `08_publicidad_banco.eml` → `ignorar`; los 150 € de publicidad no se extraen como pago.
- Entradas inválidas → `revisar`, aunque contengan palabras de pago.
- Avisos de Bizum enviado, transferencia emitida, tarifas y promociones → `ignorar`.
- Aviso reconocido sin campos bancarios → `extraer`: validar la extracción corresponde a #34.
- Cinco pruebas del filtro y seis de entrada superadas; trece de backend superadas.

Estos resultados ejecutan el código de los nodos exportados en un entorno Node local. La importación, ejecución real en n8n y validación `n8n-mcp` siguen pendientes por falta de entorno accesible. No hay evidencia real de Groq, SMTP ni API de pagos en esta entrega. #33 sigue abierto.

## Dependencia y revisión

Depende de #32 / PR #158; la especificación está en #31 / PR #157. No mezclar ni publicar las etapas pendientes de revisión. Fuente del Switch: [documentación oficial](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.switch/).

## Revalidación y entrega (26/10/2026)

Los 20 tests Node de entrada, filtro y borrador completo pasan. El JSON coincide con el generador; se comprobó que no incluye credenciales, que IMAP sigue deshabilitado y que todos los destinos de las conexiones existen.

La regresión backend no ha podido arrancar: falta `openpyxl` en el entorno actual. El socket Docker no existe y la aplicación Docker no se encuentra; no se han realizado pruebas reales en n8n. GitHub CLI no conecta con `api.github.com`, por lo que la PR y la actualización de #33 siguen pendientes. Descripción preparada en `docs/hu03-filtro-pr.md`.
