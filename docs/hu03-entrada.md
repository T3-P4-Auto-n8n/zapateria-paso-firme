# HU-03 · Entrada de avisos bancarios (#32)

## Entrega y alcance

Importar `workflows/03-abonos-distancia-entrada.json` como **03 · Abonos a distancia (entrada)**. Exportación parcial, inactiva y sin credenciales: termina después de normalizar la entrada. #33 conectará el filtro. No registra abonos, no llama a modelos externos ni envía correos. El borrador completo local no forma parte de esta entrega.

Se elige IMAP porque la tarea permite Gmail o IMAP. El nodo IMAP requiere seleccionar una credencial en n8n y se entrega deshabilitado. La spec #31 está en revisión en PR #157.

## Form Trigger: desarrollo

1. Con Docker y n8n disponibles, abrir `http://localhost:5678`, importar el JSON desde **Import from File** y guardar sin publicar.
2. Mantener **Correo bancario IMAP** deshabilitado. Abrir **Formulario de desarrollo**, seleccionar **Test URL** y ejecutar el workflow.
3. Completar `referencia` (por ejemplo `01_bizum_carmen-prueba-1`), `asunto` (contenido de Subject) y `cuerpo` (texto posterior a la línea vacía entre cabeceras y mensaje). Los tres campos son obligatorios.
4. Copiar los datos de un `.eml` de `data/correos/`, enviar y comprobar **Normalizar entrada de correo**. El envío solo confirma recepción; no confirma un abono.
5. El slug `hu03-entrada` está en `parameters.options.path`, conforme a Form Trigger 2.2. Usar la URL exacta mostrada por la instancia. La Test URL solo escucha durante la prueba; no publicar para probar.

## IMAP: entrada final

1. Crear o seleccionar en n8n una credencial IMAP de una **cuenta de pruebas**. Usar servidor, usuario, puerto y TLS indicados por el proveedor. Introducir la contraseña solo en el gestor de credenciales.
2. Seleccionarla en **Correo bancario IMAP**. El JSON no contiene IDs de credencial de una instancia.
3. Confirmar `INBOX`, formato `Simple`, sin adjuntos, reglas `["UNSEEN"]` y **Fetch Only New Emails** activado. El nodo entrega `subject`, `textPlain` y `metadata["message-id"]`.
4. Deshabilitar Form Trigger y habilitar IMAP para una prueba manual. Ejecutar el nodo y enviar un correo ficticio a la cuenta; comprobar Message-ID, asunto y cuerpo. Esto no publica el workflow.
5. **Mark as Read** marca el correo leído al recibirlo; no demuestra que se haya registrado un pago. El seguimiento de UID no ofrece idempotencia de abonos. Las escrituras y su conciliación pertenecen a #37.
6. Completar HU-03, sus pruebas y la revisión de la pareja antes de decidir la publicación.

## Contrato común para #33

| Campo | Tipo | Significado |
|---|---|---|
| `origen` | texto | `formulario` o `imap` |
| `referencia` | texto | Referencia de prueba o Message-ID, sin autorizar pagos |
| `asunto` | texto | Asunto original |
| `cuerpo` | texto | Texto plano original; saltos normalizados a LF |
| `entrada_valida` | booleano | Asunto, cuerpo y referencia presentes y dentro de los límites |
| `motivo` | texto | Vacío si es válida; motivo de revisión si no |

La salida no incluye adjuntos, destinatarios, cabeceras ni campos adicionales. No convierte HTML a texto: sin cuerpo plano, `entrada_valida` es falso. Límites: 20.000 caracteres de cuerpo, 998 de asunto y 300 de referencia. No se inventa Message-ID usando un UID aislado. La publicidad se conserva: descartarla corresponde a #33.

## Verificación y pendientes

- `node --test tests/test_hu03_entrada.cjs`: **6 pruebas superadas**. Ejecutan el código real exportado para las nueve muestras en ambos formatos, saltos de línea, datos inválidos, Message-ID ausente, HTML sin texto plano, límites exactos y exclusión de datos adicionales.
- Regresión backend: **13 pruebas superadas** con `python3 -m pytest backend/tests -q`, usando openpyxl ya disponible en el directorio temporal de dependencias. En otra instalación, preparar antes `backend/requirements.txt`.
- Revisión del código: sin problemas críticos ni importantes.
- Importación y Test URL en n8n: **pendientes**, la instancia no era accesible.
- Recepción IMAP real: **pendiente** de credencial de pruebas e instancia accesible. No se ha conectado una cuenta ni leído correo real.
- `n8n-mcp validate_workflow`: **pendiente**, servidor no disponible en esta sesión. La revisión contra fuentes oficiales no sustituye esta validación ni una ejecución real.

Para la evidencia manual, anotar versión de n8n, origen, referencia, ID de ejecución y comparación de asunto/cuerpo. Guardar capturas con datos ficticios en `docs/evidencias/`. La tarea sigue abierta hasta verificar las entradas reales.

## Referencias oficiales

- [Form Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.formtrigger/).
- [Email Trigger IMAP](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailimap/).
- [Parámetros IMAP](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/EmailReadImap/v2/EmailReadImapV2.node.ts) y [salida IMAP](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/EmailReadImap/v2/utils.ts).
