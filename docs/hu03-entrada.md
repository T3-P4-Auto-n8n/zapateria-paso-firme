# HU-03 · Entrada de avisos bancarios (#32)

## Workflow integrado

La entrada de correo forma parte de `workflows/03-abonos-distancia.json`, junto con el filtro, extracción, búsqueda, decisión, registro y aviso manual de HU-03 (#33–#38). No importar exports parciales. El workflow está inactivo; `Correo bancario IMAP` sigue deshabilitado.

Para pruebas manuales, importar el JSON único en una instancia local, mantenerlo inactivo y ejecutar **Formulario de desarrollo → Test URL**. Introducir `referencia`, `asunto` y `cuerpo` usando solo los `.eml` ficticios de `data/correos/`. La Test URL funciona mientras el editor escucha. No activar IMAP ni publicar para probar.

En Settings hay que volver a seleccionar las credenciales locales `Groq`, `API Tienda`, `Mailpit` y `08 · Error Workflow`, porque los IDs de credencial cambian entre instancias. Verificar que la API de escritura apunta a una base desechable aislada y que el SMTP apunta a Mailpit antes de enviar cualquier pago ficticio.

## Contrato de entrada

| Campo | Tipo | Significado |
|---|---|---|
| `origen` | texto | `formulario` o `imap` |
| `referencia` | texto | Referencia de prueba o Message-ID; no autoriza pagos |
| `asunto` | texto | Asunto original |
| `cuerpo` | texto | Texto plano con saltos normalizados a LF |
| `entrada_valida` | booleano | Asunto, cuerpo y referencia presentes y dentro de límites |
| `motivo` | texto | Vacío si es válida; causa de revisión si no |

La normalización no extrae importes ni elimina publicidad. No incluye adjuntos ni cabeceras adicionales. Límites: 20.000 caracteres de cuerpo, 998 de asunto y 300 de referencia. El trigger IMAP acepta solo correos nuevos no leídos y permanece deshabilitado en el export.

## Verificación

`node --test tests/test_hu03_entrada.cjs` ejecuta el Code node incluido en el JSON integrado. Cubre las nueve muestras para entrada de formulario e IMAP, Message-ID, entradas inválidas, HTML sin texto plano, límites exactos y exclusión de otros datos. La ejecución completa de los nueve casos en n8n y sus capturas siguen pendientes; estas pruebas locales no equivalen a evidencia E2E.

Referencias: [Form Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.formtrigger/) y [Email Trigger IMAP](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailimap/).
