# Revisión de secretos en los workflows (#140)

Revisión de solo lectura de todos los `workflows/*.json` de `dev` y de las ramas de los PR abiertos, el 27/10/2026. Busca claves, tokens, contraseñas, cabeceras con valor, URLs con credenciales, emails y teléfonos reales, datos del propietario e identificadores que delaten algo.

**Resultado:** **no hay ningún secreto**. Hay **un punto a revisar** en el PR #173: el id de un documento real de Google Sheets (ver [Lo que hay que revisar](#lo-que-hay-que-revisar)). No se ha cambiado ningún JSON.

## Qué se ha revisado

| Rama | Commit | PR | Workflows |
|---|---|---|---|
| `dev` | `2e5309d` | — (incluye #170 y #171) | `01`, `07`, `08`, `09`, `10-buscar-apartado`, `10-enviar-notificacion`, `11` |
| `feature/hu-07-vencidos` | `0f1d657` | #172 (fusionado después, ver nota) | `06-recordatorios-y-vencimientos` (nuevo) y `01` (rama `apartado.vencido`) |
| `feature/hu04-cierre-diario` | `f36d0da` | #173 | `05-cierre-diario` (nuevo) |
| `feature/39-hu03-prueba-correos` | `9c086d3` | sin PR todavía | `03-abonos-distancia` (el workflow integrado de HU-03) |
| `feature/32-hu03-entrada` … `feature/38-hu03-aviso-registro` | `ac83e92` … `d4aa0ae` | #158, #163–#166, #168, #169 | los exports parciales `03-abonos-distancia-entrada`, `-filtro`, `-extraccion`, `-busqueda`, `-decision`, `-registro` y `-aviso` |

> **Nota:** #172 se fusionó en `dev` después de esta revisión (`5cd8591`), sin cambios en los JSON: `workflows/01-eventos-tienda.json` y `workflows/06-recordatorios-y-vencimientos.json` de `dev` son idénticos a los de `0f1d657` (`git diff 0f1d657 origin/dev -- workflows/` no da diferencias en los dos). Los resultados valen para `dev`.

Cada rama tiene además su propia copia de los workflows de `dev` de cuando salió (las de HU-03 y HU-04, un `01` anterior a #170). Se han revisado también: el comando recorre todos los `workflows/*.json` de cada rama.

## Comandos

Desde la raíz del repo, después de `git fetch origin`. `git grep` busca en el contenido de cada rama sin cambiarse a ella, y da `rama:archivo:línea`.

```bash
R="origin/dev origin/feature/hu-07-vencidos origin/feature/hu04-cierre-diario origin/feature/39-hu03-prueba-correos origin/feature/32-hu03-entrada origin/feature/33-hu03-filtro origin/feature/34-hu03-extraccion origin/feature/35-hu03-busqueda origin/feature/36-hu03-decision origin/feature/37-hu03-registro origin/feature/38-hu03-aviso-registro"
W='workflows/*.json'

# 1. Claves con valor y menciones de palabras clave
git grep -n -i -E '"(api_?key|apikey|token|access_?token|refresh_?token|password|passwd|secret|client_?secret|bearer|authorization|x-api-key)"[[:space:]]*:' $R -- "$W"
git grep -n -i -E 'api_?key|apikey|token|password|secret|bearer|authorization|x-api-key' $R -- "$W"
# 2. URLs con usuario:contraseña, y todas las URLs
git grep -n -E '[a-z]+://[^/"[:space:]]+:[^/"@[:space:]]+@' $R -- "$W"
git grep -h -o -E 'https?://[^" \\}]+' $R -- "$W" | sort | uniq -c
# 3. Emails
git grep -h -o -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' $R -- "$W" | sort | uniq -c
# 4. Datos del propietario y de ejecuciones
git grep -n -E '"(shared|pinData|owner|ownedBy|createdBy|homeProject|email|firstName|lastName|staticData)"' $R -- "$W"
# 5. Formatos de clave conocidos (OpenAI, Groq, GitHub, Google, JWT)
git grep -n -E 'sk-[A-Za-z0-9]{10,}|gsk_[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}|ya29\.|eyJ[A-Za-z0-9_-]{10,}\.' $R -- "$W"
# 6. El valor de ejemplo de API_KEY de .env.example
git grep -n -i 'cambia-esta-clave' $R -- "$W"
# 7. Cabeceras escritas a mano en un HTTP Request
git grep -n -E '"(sendHeaders|headerParameters)"' $R -- "$W"
# 8. Credenciales: id y nombre
git grep -n -A2 -E '"(smtp|httpHeaderAuth|groqApi|googleSheetsOAuth2Api|imap)"[[:space:]]*:[[:space:]]*\{' $R -- "$W" | grep -E '"(id|name)"'
# 9. Teléfonos
git grep -n -E '\b[6-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}\b' $R -- "$W"
# 10. Identificadores de la instancia y de servicios externos
git grep -n -E '"(instanceId|webhookId|documentId|cachedResultUrl|projectId)"' $R -- "$W"
# 11 y 12. Direcciones IP y localhost
git grep -n -E '\b[0-9]{1,3}(\.[0-9]{1,3}){3}\b' $R -- "$W"
git grep -n 'localhost' $R -- "$W"
```

## Qué se encontró

| # | Búsqueda | Resultado |
|---|---|---|
| 1 | Claves, tokens y contraseñas con valor | **Nada.** Las únicas menciones son falsos positivos en el `03` (y sus exports parciales): `max_completion_tokens` en el cuerpo de la petición a Groq (línea 334) y la función `nameTokens` de `Decidir apartado` (línea 526) |
| 2 | URLs con credenciales | **Nada.** Solo hay dos destinos: `http://tienda:8000/api/...` y `https://api.groq.com/openai/v1/chat/completions`, sin usuario ni clave |
| 3 | Emails | Solo `tienda@pasofirme.example`. Los emails de los clientes no están escritos: salen de expresiones (`{{ $json.body.datos.email }}`, `{{ $json.para }}`) |
| 4 | `shared`, `pinData`, propietario | **Nada.** Ningún JSON tiene `shared`, `pinData` ni datos del propietario. El `meta` es `{"templateCredsSetupCompleted": true}` o no existe |
| 5 | Formatos de clave conocidos | **Nada** |
| 6 | `cambia-esta-clave` | **Nada** |
| 7 | Cabeceras a mano | **Nada.** Todos los HTTP Request a la app usan **Generic Credential Type → Header Auth** (`API Tienda`), y el de Groq la credencial `Groq`: la `X-API-Key` no está en ningún nodo |
| 8 | Credenciales | Solo nombres e ids internos: `Mailpit` (`fJ41sXzJzc6Ciubq`), `API Tienda` (`4VXOVN2q1Qb0tPy6`), y `Groq`, `API Tienda`, `Mailpit` y `Google Sheets` con `id` `null` en el `03` y el `05`. Ver abajo |
| 9 | Teléfonos | **Nada** |
| 10 | Identificadores | `webhookId` de los Webhook, Form Trigger y Send Email; `cachedResultUrl` con los ids de los sub-workflows y de la Data table `Configuración` (`/projects/…/datatables/…`, `01`, línea 307 en `dev` y en #172); y el `documentId` del `05` (ver abajo) |
| 11, 12 | IP y `localhost` | **Nada.** Ningún nodo llama a `localhost` (dentro de n8n se usa `http://tienda:8000`, AGENTS.md, sección 3) |

### Por qué los ids no son un secreto

- **Ids de credencial** (`fJ41sXzJzc6Ciubq`, `4VXOVN2q1Qb0tPy6`): son la referencia interna de la credencial en el n8n local de Esra. El valor está cifrado dentro de n8n, con una clave que está en el volumen `n8n_data` y no en el repo. En otra instancia esos ids no existen y hay que volver a elegir la credencial ([docs/instalacion.md](instalacion.md), paso 6). No dicen nada de la clave. El `id` `null` del `03` y el `05` es lo mismo, sin la referencia.
- **Ids de workflow, de Data table, de proyecto y `webhookId`:** identifican objetos de la instancia local, que solo se ve desde `localhost`. Los ids de workflow hacen falta: los Execute Workflow y el Error workflow apuntan por id.
- **El `03` tiene el nodo `Correo bancario IMAP`** deshabilitado y sin credencial: no hay datos de ningún buzón.

## Lo que hay que revisar

No se ha arreglado nada; queda para que lo decida la pareja.

| Archivo | Línea | Qué es | Riesgo |
|---|---|---|---|
| `workflows/05-cierre-diario.json` (rama `feature/hu04-cierre-diario`, PR #173) | 175 | `documentId` de `Guardar cierre en Sheets`: el id de un documento **real** de Google Sheets, el histórico de cierres | No es una credencial: escribir en él exige la credencial OAuth `Google Sheets`, que no está en el JSON. Pero identifica un documento de una cuenta de Google personal: si se comparte con «cualquier persona con el enlace», cualquiera que lea el repo puede abrirlo |

El mismo id está también, fuera de `workflows/`, en `docs/hu04-cierre-diario.md` (en el enlace al histórico y en el comando de `generar_hu04.py`) y en `docs/evidencias/05-hu04-resultados.md`, de la misma rama. La spec del `05` ya dice que «sus identificadores son referencias, no secretos», y en otra instancia se elige otro documento. Propuesta: comprobar que el documento **no** está compartido por enlace. Si no se quiere publicar el id, dejar el `documentId` vacío en el export y elegirlo al importar.

## Cómo repetirla

Antes de cada PR con un JSON exportado, con los comandos de arriba cambiando `R` por la rama del PR (o `HEAD`). AGENTS.md, sección 7: «Antes de subir un JSON, revisar el diff: sin claves ni datos personales reales». `scripts/flujos.py exportar` ya quita `shared` y `pinData`.
