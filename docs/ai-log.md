# Bitácora de IA · Zapatería Paso Firme

Registro de cómo usamos agentes de IA en el proyecto: herramientas, prompts clave, errores del agente (y nuestros) y qué decidimos en cada caso.

## 1. Herramientas y modelos

| Uso | Herramienta | Modelo | Estado |
|---|---|---|---|
| Agente de desarrollo | Claude Code | Claude Opus 5.5 (`claude-opus-5-5`) | En uso |
| Nodos de IA dentro de n8n | Groq (capa gratuita) | Por decidir | Pendiente de configurar |

**Por qué Claude Code y no OpenCode.** El README recomienda OpenCode, pero permite otras herramientas si se justifica la elección. Usamos Claude Code porque ya lo tenemos las dos.

- **Alcance:** specs, documentación, JSON de los flujos y revisión.
- **Para no pisarnos:** cada una lo usa en su propia rama y en su propia tarea.

## 2. Cómo registramos

Una entrada por tarea, con este formato:

```markdown
### <Tarea> (<issue>)

- **Autora:**
- **Tarea:** <issue o tarjeta del Kanban, archivo afectado>
- **Resultado:** qué generó el agente
- **Problemas encontrados:** errores, alucinaciones u omisiones (del agente o nuestras) y cómo se detectaron
- **Decisión:** aceptado / corregido / rechazado, y por qué

<details><summary>Prompt</summary>

(prompt literal)

</details>
```

## 3. Entradas

### Ontología del dominio (`docs/ontologia.md`)

- **Autora:** Esra
- **Tarea:** crear `docs/ontologia.md` con las entidades Cliente, Producto, Apartado, Abono, Venta, Vale y CierreDiario
- **Resultado:** ontología con atributos, relaciones, reglas, estados del Apartado, tabla de quién calcula cada dato (app / n8n) y diagrama Mermaid.
- **Problemas encontrados:** el agente solo leyó el README y la guía de la app (las fuentes que pedía el prompt) y no recogió que `forma_pago` vale `"efectivo"` por defecto ni que cualquier otro valor devuelve `422`. Tampoco indicó que la app no tiene ningún campo de consentimiento (HU-14). Se detectó comparando con `backend/schemas/`.
- **Decisión:** corregido con un segundo prompt, que obligaba a comprobar cada dato en `backend/schemas/` y `backend/models/` antes de escribirlo.

<details><summary>Prompt</summary>

```text
## Tarea
Crea el archivo docs/ontologia.md con la ontología del dominio de la Zapatería Paso Firme.

## Fuentes
Lee primero README.md y docs/guia-de-la-app.md .
Usa solo la información que aparece en esos archivos.

## Contenido
Para cada entidad (Cliente, Producto, Apartado, Abono, Venta, Vale, CierreDiario) incluye:
1. Atributos: nombre, tipo y descripción
2. Relaciones con otras entidades
3. Reglas del negocio que le afectan
4. Estados (solo para Apartado)

Al final, un diagrama de relaciones en Mermaid.

## Límites
- No inventes atributos que no existan en la API de la app.
- Indica qué datos calcula la app y qué datos calcula n8n.
- No modifiques ningún otro archivo.
```

</details>

<details><summary>Prompt (corrección)</summary>

```text
## Tarea
Corrige docs/ontologia.md con tres datos que faltan.

## Fuentes
Comprueba cada dato en backend/schemas/ y backend/models/ antes de escribirlo.

## Cambios
1. forma_pago: si no se envía, la app usa "efectivo" por defecto. Añádelo en
   Apartado (campos de creación), Abono y Venta. Añade una nota de aviso: en el
   flujo 3 (abonos a distancia) hay que enviar siempre forma_pago "bizum" o
   "tarjeta", si no el pago se guarda como efectivo y el cierre diario sale mal.
2. forma_pago: solo admite efectivo, tarjeta o bizum; cualquier otro valor
   devuelve 422. Añádelo a las reglas de Abono, Venta y Apartado.
3. Consentimiento (HU-14): la app no tiene ningún campo de consentimiento.
   Indícalo en Cliente y aclara que n8n tendrá que guardarlo fuera de la app.

## Límites
- No cambies nada más del documento.
- No modifiques ningún otro archivo.
- Al terminar, enséñame solo las líneas que has cambiado.
```

</details>

### Error humano en un prompt: forma de pago del flujo 3 (`docs/ontologia.md`)

- **Autora:** Esra
- **Tarea:** nota de aviso del flujo 3 en `docs/ontologia.md`
- **Resultado:** el prompt de corrección de la ontología (entrada anterior) pedía que el flujo 3 enviara `forma_pago` `"bizum"` o `"tarjeta"`, y el agente lo escribió tal cual, sin cuestionarlo.
- **Problemas encontrados:** el error estaba en nuestro prompt: una transferencia bancaria nunca es `tarjeta`. Como la app no acepta `"transferencia"`, decidimos registrar las transferencias como `"bizum"` (ver decisiones abiertas).
- **Decisión:** corregido con un prompt que cambia solo esa nota y enlaza a la sección 8 de `AGENTS.md`. **Lección:** revisar también nuestros propios prompts; el agente no siempre detecta un error del negocio si se lo pedimos explícitamente.

<details><summary>Prompt</summary>

```text
En docs/ontologia.md, línea 179, cambia la nota del flujo 3 para que diga:
hay que enviar siempre forma_pago "bizum" (también para las transferencias,
porque la app no acepta "transferencia"; ver AGENTS.md sección 8).
No cambies nada más.
```

</details>

### Plantilla de spec (`specs/_plantilla.md`)

- **Autora:** Esra
- **Tarea:** crear la plantilla para escribir la spec de cada automatización (SDD)
- **Resultado:** una primera versión de 13 secciones con ejemplos en comentarios, y después una versión de 8 secciones que la sustituyó.
- **Problemas encontrados:** la primera versión era demasiado larga para rellenarla con agilidad.
- **Decisión:** la versión de 13 secciones se rechazó antes de subirla (no llegó a commit) y se pidió una de 8 secciones que se pueda rellenar en 15 minutos. Aceptada la versión de 8 secciones.

<details><summary>Prompt (versión de 13 secciones, rechazada)</summary>

```text
## Tarea
Crea el archivo specs/_plantilla.md: la plantilla que usaremos para escribir
la spec de cada automatización (Spec-Driven Development).

## Fuentes
Lee README.md (secciones "Automatizaciones a construir", "Historias de usuario"
y "Forma de trabajo"), docs/guia-de-la-app.md y docs/ontologia.md.

## Contenido
La plantilla debe tener estas secciones, cada una con una línea que explique
qué se escribe en ella y un ejemplo corto entre comentarios <!-- -->:
1. Cabecera: nº y nombre del flujo, historia(s) de usuario (HU-xx), nivel,
   responsable, estado (borrador / revisada / implementada)
2. Objetivo: qué problema resuelve, en una o dos frases
3. Disparador: webhook (qué evento), programado (cuándo) o correo/formulario
4. Entradas: datos que recibe, usando los nombres de campos de la ontología
5. Pasos del flujo: lista numerada de lo que hace, sin detalles de nodos
6. Llamadas a la API: endpoint, método y para qué
7. Reglas de negocio y decisiones: qué valida el flujo (IF / Switch)
8. Salidas: qué mensajes envía, a quién y con qué datos
9. Casos de error: qué puede fallar y qué hace el flujo en cada caso
10. Credenciales y variables: nombres (nunca valores)
11. Datos de prueba: payload o pinned data, y resultado esperado
12. Criterios de aceptación: lista de comprobación (copiada de la HU)
13. Decisiones y preguntas abiertas

## Límites
- Usa solo el vocabulario de docs/ontologia.md; no inventes entidades ni campos.
- No rellenes la plantilla para ningún flujo concreto.
- No modifiques ningún otro archivo.
```

</details>

<details><summary>Prompt (versión de 8 secciones, aceptada)</summary>

```text
## Tarea
Crea el archivo specs/_plantilla.md: la plantilla para la spec de cada
automatización. Tiene que ser corta: una spec se debe poder escribir en 15 minutos.

## Fuentes
Lee README.md, docs/guia-de-la-app.md y docs/ontologia.md.

## Contenido
Estas 8 secciones, cada una con una línea que explique qué va en ella:
1. Cabecera: flujo, HU, nivel, responsable, credenciales que usa (solo nombres)
2. Objetivo: una frase
3. Disparador y entradas: qué lo activa y qué datos recibe
4. Pasos y reglas: lista numerada, incluidas las llamadas a la API y las decisiones (IF / Switch)
5. Salidas: qué mensajes envía, a quién y con qué datos
6. Casos de error: qué puede fallar y qué hace el flujo
7. Prueba: datos de entrada y resultado esperado
8. Criterios de aceptación: checklist copiada de la HU

## Límites
- Usa solo el vocabulario de docs/ontologia.md.
- No rellenes la plantilla para ningún flujo concreto.
- No modifiques ningún otro archivo.
```

</details>

### Contexto para agentes (`AGENTS.md` y `CLAUDE.md`)

- **Autora:** Esra
- **Tarea:** crear `AGENTS.md` en la raíz con el contexto del proyecto para cualquier agente, y `CLAUDE.md`
- **Resultado:** `AGENTS.md` (96 líneas, por debajo del máximo de 150) con proyecto y rol del agente, negocio, servicios y URLs, estructura del repo, convenciones, forma de trabajo, importar y exportar flujos, decisiones tomadas y lo que el agente no debe hacer. `CLAUDE.md` contiene solo `@AGENTS.md`, porque Claude Code lee `CLAUDE.md` automáticamente; así hay una única fuente de contexto para cualquier agente.
- **Problemas encontrados:** los comandos de la CLI de n8n para importar y exportar (sección 7) no se han probado todavía. `workflows/` y `tests/payloads/` aún no existen en el repo.
- **Decisión:** aceptado. Pendiente: probar los comandos de la CLI la primera vez que se exporte un flujo.

<details><summary>Prompt</summary>

```text
## Tarea
Crea AGENTS.md en la raíz del repo: el contexto que cualquier agente de IA debe
leer antes de trabajar en este proyecto. Crea también CLAUDE.md con una sola
línea: @AGENTS.md (para que Claude Code lo cargue automáticamente).

## Fuentes
README.md, docs/guia-de-la-app.md, docs/ontologia.md, specs/_plantilla.md
y docker-compose.yml.

## Contenido
1. Proyecto y rol del agente: el agente propone; la pareja revisa, prueba y decide.
2. Negocio: resumen de las reglas del apartado en 5-6 líneas y enlace a
   docs/ontologia.md como fuente de verdad del vocabulario.
3. Servicios y URLs: tabla con la URL desde el navegador y desde dentro de n8n
   (http://tienda:8000), autenticación X-API-Key con credencial Header Auth de
   n8n, webhook POST /webhook/tienda (los datos llegan en $json.body),
   diferencia entre Test URL y Production URL.
4. Estructura del repo: workflows/, specs/, docs/, tests/payloads/.
5. Convenciones de nombres:
   - Ramas: feature/, docs/, fix/, chore/ desde dev; PR siempre a dev;
     a main solo se llega desde dev al cerrar un nivel.
   - Flujos en n8n: "F01 · Confirmación de apartado" (F00 es el router,
     F08 el Error Workflow).
   - Nodos: nombres descriptivos en español (p. ej. "Buscar apartado por id").
   - Specs: specs/NN-nombre.md · Workflows: workflows/NN-nombre.json
   - Commits en español y en imperativo.
6. Forma de trabajo: primero la spec, luego el flujo; una tarea = una rama =
   una PR con el JSON exportado; registrar prompts y decisiones en docs/ai-log.md.
7. Importar y exportar flujos: desde la interfaz de n8n (Import from File /
   Download) o con la CLI de n8n dentro del contenedor y docker compose cp.
   Los JSON exportados van a workflows/.
8. Decisiones tomadas: las transferencias se registran como forma_pago
   "bizum" porque la app no acepta "transferencia" (pendiente de confirmar
   con el profesor).
9. Lo que el agente NO debe hacer:
   - Escribir claves, tokens o contraseñas en los flujos, en el repo o en
     los mensajes; tampoco copiar el contenido de .env.
   - Activar o publicar flujos.
   - Recalcular abonado o pendiente: se usan los de la app.
   - Dejar que la IA decida en el flujo 3: la IA solo extrae datos; las
     decisiones las toma el flujo con la API.
   - Hacer push a main o dev, ni mergear PRs.
   - Modificar backend/ o frontend/ sin que la pareja lo pida.
   - Inventar entidades o campos que no estén en la ontología.
   - Enviar a modelos externos más datos personales de los imprescindibles.

## Límites
- Máximo 150 líneas; enlaza a otros documentos en vez de copiarlos.
- No modifiques ningún otro archivo aparte de AGENTS.md y CLAUDE.md.
```

</details>

### Documentación del workflow 01 · Eventos de la tienda (`specs/01-eventos-tienda.md`)

- **Autora:** Esra
- **Tarea:** documentar `workflows/01-eventos-tienda.json` (creado y probado en n8n): convención de nombres, spec del router, payloads de prueba
- **Resultado:** `AGENTS.md` sección 5 con la nueva numeración de workflows (sin `F00`). `specs/01-eventos-tienda.md` describe el router tal como está en el JSON: webhook `Evento de la tienda` y Switch `Según el evento` con 4 salidas y la de respaldo `Evento desconocido`; deja indicadas las ramas pendientes de HU-01, HU-02, HU-09 y HU-07. `tests/payloads/` con un JSON por evento (ejemplos de la guía, correos `@example.com`) y `evento-desconocido.json`.
- **Problemas encontrados:** al leer el JSON, el agente señaló que la salida de respaldo se llama `"Evento desconocido "` (con un espacio al final), que el webhook no tiene autenticación y que el JSON exportado lleva `"active": true`. En `apartado.vencido.json`, la guía abrevia el apartado con `"..."`; el agente completó `fecha`, `telefono`, `talla` y `fecha_limite` con valores de ejemplo coherentes.
- **Decisión:** Aceptado. Corregido en n8n el espacio final de la salida Evento desconocido y e-exportado. Se aceptan los valores de ejemplo de apartado.vencido.json porque son coherentes. La autenticación del webhook queda para HU-14.

<details><summary>Prompt</summary>

```text
## Tarea
Completa la documentación del workflow workflows/01-eventos-tienda.json (ya
creado y probado en n8n).

## Cambios
1. AGENTS.md, sección 5 (nombres de flujos): ya no hay "F00 router". Los
   workflows se numeran por el flujo más bajo que contienen:
   01 · Eventos de la tienda (webhook + Switch; flujos 1, 2, 4 y aviso de vencido),
   03 · Abonos a distancia, 05 · Cierre diario, 06 · Recordatorios y vencimientos,
   07 · Informe mensual, 08 · Error Workflow.
2. specs/01-eventos-tienda.md con specs/_plantilla.md. Por ahora solo la parte
   del router: webhook POST /webhook/tienda y Switch por body.evento con 4 salidas
   (apartado.creado, abono.registrado, venta.registrada, apartado.vencido) y una
   salida "Evento desconocido". Lee el JSON del workflow para describirlo tal como
   está. Deja indicado que las ramas de HU-01, HU-02, HU-09 y HU-07 se añadirán después.
3. tests/payloads/: un JSON por evento con los ejemplos de docs/guia-de-la-app.md
   (apartado.creado.json, abono.registrado.json, venta.registrada.json,
   apartado.vencido.json) y evento-desconocido.json. Usa datos de ejemplo
   (@example.com), nunca datos reales.
4. Entrada nueva en docs/ai-log.md con este prompt.

## Límites
- No modifiques el JSON del workflow.
- No modifiques ningún otro archivo.
```

</details>

### Spec de la rama HU-01 · Confirmación de apartado (`specs/01-eventos-tienda.md`)

- **Autora:** Esra
- **Tarea:** añadir a la spec del workflow 01 la rama de HU-01 (salida `apartado.creado`), con su prueba
- **Resultado:** spec actualizada siguiendo la plantilla: IF `¿Tiene email?` sobre `datos.email` (vacío o `null` → No); rama **Sí** con correo al cliente por `Mailpit` desde `tienda@pasofirme.example` (`producto`, `talla`, `precio`, `abonado`, `pendiente` con 2 decimales y `fecha_limite`); rama **No** con aviso a `tienda@pasofirme.example` con `id` y `cliente`. Criterios de aceptación de HU-01 copiados del README. Nuevo payload `tests/payloads/apartado.creado-sin-email.json` (`"email": null`) y prueba de extremo a extremo con `scripts/datos_demo.py` cuando esté en `dev`.
- **Problemas encontrados:** ninguno por ahora. El agente propuso los nombres de los nodos de correo (`Enviar confirmación al cliente`, `Avisar a la tienda: sin email`); se ajustarán a los del JSON cuando se construya la rama. No se ejecutó nada. La construcción y las pruebas las hizo Esra en n8n: los dos payloads por la Test URL y un apartado creado desde la app (Production URL), cuyo correo llegó a Mailpit al momento.
- **Decisión:** aceptado.

<details><summary>Prompt</summary>

```text
Añade a specs/01-eventos-tienda.md la rama de HU-01 (salida apartado.creado),
siguiendo la plantilla y los criterios de aceptación de HU-01 del README:
- IF "¿Tiene email?": si datos.email está vacío o es null.
- Sí: correo al cliente con credencial Mailpit, From tienda@pasofirme.example,
  con producto, talla, precio, abonado, pendiente y fecha_limite (importes de la app,
  con 2 decimales).
- No: correo a la tienda (tienda@pasofirme.example) avisando de que no se pudo
  enviar la confirmación, con id y cliente del apartado.
- Prueba: tests/payloads/apartado.creado.json y un payload nuevo
  tests/payloads/apartado.creado-sin-email.json. Prueba de extremo a extremo con
  scripts/datos_demo.py (cuando esté en dev).
- Entrada en docs/ai-log.md.
No modifiques el JSON del workflow. No ejecutes nada.
```

</details>

## 4. Decisiones abiertas

| Decisión | Motivo | Estado |
|---|---|---|
| Las transferencias bancarias se registran con `forma_pago` `"bizum"` | La app no acepta `"transferencia"` (devuelve `422`) | Pendiente de confirmar con el profesor |
