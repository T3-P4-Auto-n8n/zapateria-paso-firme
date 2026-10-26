# Bitácora de IA · Zapatería Paso Firme

Registro de cómo usamos agentes de IA en el proyecto: herramientas, prompts clave, errores del agente (y nuestros) y qué decidimos en cada caso.

## 1. Herramientas y modelos

| Uso | Herramienta | Modelo | Estado |
|---|---|---|---|
| Agente de desarrollo | Claude Code | Claude Opus 5.5 (`claude-opus-5-5`) | En uso |
| Nodos de IA dentro de n8n | Groq (capa gratuita) | Por decidir | Pendiente de configurar |
| Documentación y validación de nodos | n8n-mcp (modo solo documentación) | — | En uso |

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

### Mailpit para probar correos en local (`docker-compose.yml`)

- **Autora:** Esra
- **Tarea:** añadir Mailpit al `docker-compose.yml` para probar los correos en local, como en el ejemplo de clase de la pastelería
- **Resultado:** servicio `mailpit` (imagen `axllent/mailpit`, puertos 8025 web y 1025 SMTP, `TZ=Europe/Madrid`) en `docker-compose.yml`, sin tocar `tienda` ni `n8n`. Mailpit añadido a la tabla de servicios de `AGENTS.md` (sección 3) con los datos de conexión SMTP desde n8n.
- **Problemas encontrados:** ninguno por ahora. `docker compose config` valida el archivo, pero el servicio aún no se ha levantado ni se ha enviado un correo de prueba desde n8n.
- **Decisión:** probado: la web abre en 8025.

<details><summary>Prompt</summary>

```text
## Tarea
Añade Mailpit al docker-compose.yml para probar los correos en local, igual
que en el ejemplo de clase de la pastelería.

## Contenido
1. Servicio "mailpit" con la imagen axllent/mailpit: puerto 8025 (web) y
   1025 (SMTP), con TZ=Europe/Madrid como los otros servicios.
2. En AGENTS.md, sección 3, añade Mailpit a la tabla de servicios
   (navegador: http://localhost:8025 · desde n8n: SMTP host mailpit, puerto 1025,
   sin usuario ni contraseña, SSL/TLS desactivado).
3. Entrada nueva en docs/ai-log.md con este prompt.

## Límites
- No toques los servicios tienda ni n8n.
- No modifiques ningún otro archivo.
```

</details>

### Script para exportar e importar flujos (`scripts/flujos.py`)

- **Autora:** Esra
- **Tarea:** script para exportar e importar los flujos de n8n, con sección en el README y sección 7 de `AGENTS.md` actualizada
- **Resultado:** `scripts/flujos.py` (solo librería estándar) con `exportar` (CLI `export:workflow --all --separate`, copia con `docker compose cp`, renombra a `NN-nombre.json` y quita `pinData`) e `importar` (copia el JSON al contenedor y lanza `import:workflow`). Sección "Exportar e importar flujos" en el README y sección 7 de `AGENTS.md` con el script en vez de los comandos sueltos.
- **Problemas encontrados:** el prompt pedía no ejecutar el script y el agente lo ejecutó igualmente (`exportar`, a una carpeta temporal, sin tocar `workflows/`). Además, en la prueba real de Esra el JSON exportado incluía en `shared` el nombre y el email del propietario; se corrigió guardando solo las claves de la descarga desde la interfaz (`name`, `nodes`, `connections`, `settings`, `meta`, `tags`, `active`, `id`, `versionId`). Como añadido propio, el agente hizo que `exportar` omita los flujos cuyo nombre no empieza por `NN · ` y los archivados.
- **Decisión:** aceptado con cambios. Se mantiene el filtro de nombres y archivados. La próxima vez el agente debe preguntar antes de ejecutar nada.

<details><summary>Prompt</summary>

```text
Tarea: crea scripts/flujos.py para exportar e importar los flujos de n8n.

Fuentes: AGENTS.md (sección 7 y convenciones de nombres), docker-compose.yml.

Contenido:
- `python3 scripts/flujos.py exportar`: exporta todos los flujos con la CLI de n8n
  (docker compose exec ... export:workflow --all --separate), los copia a workflows/
  y renombra cada archivo según su nombre en n8n: "01 · Eventos de la tienda"
  -> 01-eventos-tienda.json (minúsculas, sin tildes, sin "de/la/del", guiones).
  Al exportar, quita pinData si existe.
- `python3 scripts/flujos.py importar workflows/NN-nombre.json`: lo importa en n8n.
- Solo librería estándar de Python. Comentarios en español, breves.
- Añade una sección corta "Exportar e importar flujos" al README y actualiza la
  sección 7 de AGENTS.md para que mencione el script.
- Entrada en docs/ai-log.md.

Límites: no toques backend/, frontend/ ni los JSON de workflows/. No ejecutes el script.
```

</details>

### Script de datos de demo (`scripts/datos_demo.py`)

- **Autora:** Esra
- **Tarea:** script que genera actividad en la tienda por API para que la app envíe eventos reales al webhook de n8n, con instrucciones en el README
- **Resultado:** `scripts/datos_demo.py` (solo librería estándar, `urllib`) contra `http://localhost:8000`. Lee `API_KEY` de la variable de entorno o del `.env`. Crea un apartado con email (`bizum`) y otro sin email (`efectivo`), un abono parcial de 20 € (`tarjeta`) al primero, un abono por el `pendiente` exacto que devuelve la app al segundo (lo liquida) y una venta. Muestra `id`, `estado` y `pendiente` de cada paso y el `detail` de los errores de la API; si falla la creación de un apartado, se salta su abono. Instrucciones en el README, debajo de "Exportar e importar flujos".
- **Problemas encontrados:** ninguno. Esra lo ejecutó: los 5 eventos llegaron al webhook en modo production y el Switch mandó cada uno a su salida (`apartado.creado` ×2, `abono.registrado` ×2, `venta.registrada` ×1).
- **Decisión:** aceptado sin cambios.

<details><summary>Prompt</summary>

```text
Tarea: crea scripts/datos_demo.py que genera actividad en la tienda llamando a la API,
para que la app envíe eventos reales al webhook de n8n.

Fuentes: docs/guia-de-la-app.md, docs/ontologia.md, backend/schemas/, .env.example.

Contenido:
- Lee API_KEY de la variable de entorno o del archivo .env (nunca la escribe en el código).
- URL base http://localhost:8000 (se ejecuta desde el Mac, no desde n8n).
- Crea: 1 apartado con email, 1 apartado sin email, 1 abono parcial, 1 abono que
  liquida un apartado (pendiente exacto que devuelve la app) y 1 venta.
  Así se disparan apartado.creado, abono.registrado (activo y liquidado) y venta.registrada.
- Clientes ficticios con emails @example.com. forma_pago solo efectivo/tarjeta/bizum.
- Muestra por pantalla qué ha creado (id, estado, pendiente) y los errores de la API si los hay.
- Solo librería estándar (urllib). Comentarios en español, breves.
- Instrucciones de uso en el README, junto a la sección de flujos.
- Entrada en docs/ai-log.md.

Límites: no toques backend/ ni frontend/. No ejecutes el script.
```

</details>

### Lista de credenciales y variables (`docs/credenciales.md`)

- **Autora:** Esra
- **Tarea:** documentar las credenciales de n8n y las variables del `.env` que necesita cada workflow, sin valores (entregable 3 del README)
- **Resultado:** `docs/credenciales.md` con las credenciales actuales (`Mailpit`, `API Tienda`, `Groq`), la tabla workflow → credenciales (`01 · Eventos de la tienda`: `Mailpit`; el resto por completar), las variables `API_KEY`, `N8N_WEBHOOK_URL` y `SEED`, y los pasos para crear cada credencial en n8n.
- **Problemas encontrados:** el agente señaló que el servicio `mailpit` no está en el `docker-compose.yml` del repo, así que el host `mailpit` solo resuelve si Mailpit se levanta aparte. Tampoco hay todavía ningún nodo de correo en `workflows/01-eventos-tienda.json`.
- **Decisión:** pendiente de revisión.

<details><summary>Prompt</summary>

```text
Crea docs/credenciales.md: lista de credenciales y variables que necesita cada
workflow, SIN valores. Credenciales actuales en n8n: "Mailpit" (SMTP, host mailpit,
puerto 1025), "API Tienda" (Header Auth, Name X-API-Key, valor = API_KEY del .env),
"Groq" (Groq API). Variables del .env: API_KEY, N8N_WEBHOOK_URL, SEED.
Incluye una tabla workflow → credenciales (01 · Eventos de la tienda: Mailpit;
el resto se irá completando) y cómo crear cada credencial en n8n.
Añade una entrada en docs/ai-log.md. No modifiques ningún otro archivo.
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

### Spec de la rama HU-02 · Recibo de abono (`specs/01-eventos-tienda.md`)

- **Autora:** Esra
- **Tarea:** añadir a la spec del workflow 01 la rama de HU-02 (salida `abono.registrado`), con sus pruebas
- **Resultado:** spec actualizada (alcance, cabecera, objetivo, entradas, pasos, salidas, errores, pruebas y criterios de HU-02): IF `¿Tiene email? (abono)` (sin email → termina sin enviar nada), IF `¿Liquidado?` sobre `datos.estado`, `Enviar recibo del abono` (`producto`, `talla`, `importe`, `abonado`, `pendiente` con 2 decimales y `fecha_limite` en `dd/MM/yyyy`) y `Avisar de que puede recoger` (`producto`, `talla`, `importe` del último abono y `abonado` como total pagado; sin `pendiente` ni `fecha_limite`). Payloads nuevos `abono.registrado-liquidado.json` (apartado 25, `importe` 59.9, `abonado` = `precio` = 89.9, `pendiente` 0) y `abono.registrado-sin-email.json` (apartado 26, `email` `null`), coherentes con los existentes.
- **Problemas encontrados:** en el primer intento el agente usó `precio` como total pagado en el aviso de «puede recoger»; se corrigió a `abonado` (valor de la app) en el paso 9, la tabla de salidas y la de pruebas. La fila de la decisión en `AGENTS.md` (sección 8) se reescribió con la redacción de la pareja y estado «Tomada». **Decisión de la pareja:** si el abono llega sin email no se avisa a la tienda, porque en un abono el cliente ya está en contacto con ella y se llenaría de correos; registrada en la sección 8 de `AGENTS.md`. Con esta decisión, el criterio «cada abono registrado genera un recibo» solo se cumple para clientes con email. El agente actualizó también la prueba de extremo a extremo con `scripts/datos_demo.py`: el abono que liquida el apartado sin email no envía nada. **Construcción y pruebas en n8n (Esra):** las pruebas con email (recibo y liquidado) salieron bien a la primera. En la prueba sin email, el IF `¿Tiene email? (abono)` dejó pasar un `email` `null` y el nodo de correo falló con «No recipients defined». Causa: un espacio al final de la expresión (`{{ ... }} `) convertía el resultado en texto no vacío. Lo encontró Esra con el mensaje de error de n8n (`'false '` con espacio) y se quitó el espacio; la prueba sin email pasó. La rama HU-01 no se tocó. Prueba final desde la app (Production URL) con un abono parcial y otro que liquida.
- **Decisión:** aceptado.

<details><summary>Prompt</summary>

```text
Añade a specs/01-eventos-tienda.md la rama de HU-02 (salida abono.registrado),
siguiendo la plantilla y los criterios de aceptación de HU-02 del README:
- IF "¿Tiene email? (abono)": si datos.email está vacío o es null, termina sin enviar
  nada. Decisión nuestra: en un abono el cliente está en contacto con la tienda; no se
  avisa a la tienda para no llenarla de correos. Regístrala en la sección 8 de AGENTS.md
  (Decisiones tomadas) y en docs/ai-log.md.
- IF "¿Liquidado?": datos.estado es igual a "liquidado".
- No liquidado: "Enviar recibo del abono" al cliente (Mailpit, From
  tienda@pasofirme.example) con producto, talla, importe (lo que acaba de pagar),
  abonado, pendiente (2 decimales, valores de la app) y fecha_limite (dd/MM/yyyy).
- Liquidado: "Avisar de que puede recoger" al cliente con producto, talla, importe del
  último abono y precio total pagado; sin pendiente ni fecha límite.
- Pruebas: tests/payloads/abono.registrado.json (activo) y dos payloads nuevos:
  abono.registrado-liquidado.json (estado liquidado, pendiente 0, abonado = precio)
  y abono.registrado-sin-email.json. Datos ficticios coherentes con los existentes.
- Actualiza la cabecera, alcance, salidas, errores y criterios de la spec.
- Entrada en docs/ai-log.md.
- No modifiques el JSON del workflow. No ejecutes nada.
```

</details>

<details><summary>Prompt (corrección)</summary>

```text
Faltan cosas de la rama HU-02:
1. AGENTS.md, sección 8 (Decisiones tomadas): añade una fila:
   "Un abono de un cliente sin email no envía nada (ni al cliente ni a la tienda)" |
   "En un abono el cliente está en contacto con la tienda; avisar a la tienda en cada
   abono la llenaría de correos" | "Tomada".
2. specs/01-eventos-tienda.md: en "Avisar de que puede recoger", el total pagado es
   `abonado` (valor de la app), no `precio`. Corrígelo en el paso 9, la tabla de
   salidas y la tabla de pruebas.
3. docs/ai-log.md: entrada de la spec de HU-02 con el prompt original completo y este,
   y en "Problemas encontrados": no se actualizaron AGENTS.md ni ai-log en el primer
   intento, y se usó precio en vez de abonado como total pagado.
No modifiques el JSON del workflow. No ejecutes nada.
```

</details>

### Confirmación: transferencias como bizum

- **Autora:** Esra
- **Pregunta al profesor** (resumen): la app solo admite `forma_pago` `efectivo`, `tarjeta` o `bizum` y rechaza `"transferencia"` con un `422`. ¿Registramos los abonos que llegan por transferencia bancaria (flujo 3) con `forma_pago` `"bizum"`?
- **Respuesta:** sí.
- **Decisión:** confirmada. Actualizado el estado en la sección 8 de `AGENTS.md` y quitada de las decisiones abiertas.

### Spec del Error Workflow · HU-05 (`specs/08-error-workflow.md`)

- **Autora:** Esra
- **Tarea:** crear la spec del `08 · Error Workflow` para HU-05 con la plantilla. Fuente: guía de la sesión 2 del profesor, paso 6.
- **Resultado:** `specs/08-error-workflow.md` con Error Trigger `Si falla un flujo` y Send Email `Avisar a la tienda del error` (`Mailpit`, From y To `tienda@pasofirme.example`) con flujo, paso, error y enlace a la ejecución. Indica que se asigna en **Settings → Error workflow** de cada flujo (ahora el `01`; luego `03`, `05`, `06`, `07`) y que el `08` tiene que estar publicado. Prueba con un payload enviado a la Production URL (ver «Problemas encontrados»). En `specs/01-eventos-tienda.md`, el caso de error del envío de correo enlaza ahora a esta spec.
- **Problemas encontrados:** la prueba propuesta (por el mentor y la spec), `error-abono-sin-datos.json` (`abono.registrado` sin `importe`), no provocaba un error: las expresiones de n8n con campos que faltan dan texto vacío («Invalid DateTime» en la fecha), así que el `01` envió un recibo vacío a `rota@example.com` y el `08` no se activó. Se cambió por `tests/payloads/error-email-espacio.json` (`apartado.creado` con `email` `" "`): el IF `¿Tiene email?` deja pasar el espacio y el envío falla con «No recipients defined», lo que reproduce el error del ejemplo del profesor. Los dos comportamientos quedan como casos «pendiente de mejorar» en `specs/01-eventos-tienda.md`. Prueba final por la Production URL: el correo «Ha fallado el flujo «01 · Eventos de la tienda»» llegó a Mailpit con flujo, paso, error y enlace, sin claves.
- **Decisión:** aceptado con cambios.

<details><summary>Prompt</summary>

```text
Crea specs/08-error-workflow.md con la plantilla, para HU-05 (criterios del README):
- Disparador: Error Trigger "Si falla un flujo".
- Send Email "Avisar a la tienda del error" (credencial Mailpit), From y To
  tienda@pasofirme.example.
  Subject: Ha fallado el flujo «{{ $json.workflow.name }}»
  Texto con: flujo ($json.workflow.name), paso ($json.execution.lastNodeExecuted),
  error ($json.execution.error.message) y enlace ($json.execution.url).
- Se asigna en Settings → Error workflow de cada flujo (ahora el 01; luego 03, 05, 06, 07).
  El 08 tiene que estar publicado o no avisa.
- Prueba: con el 01 publicado, enviar a la Production URL un evento roto, por ejemplo
  {"evento":"abono.registrado","datos":{"email":"rota@example.com"}} (sin importe:
  el recibo falla). Resultado esperado: correo a la tienda con flujo, paso y error.
  Guarda ese payload en tests/payloads/error-abono-sin-datos.json.
- Seguridad: el aviso no incluye claves ni contraseñas (criterio 2 de HU-05).
- En specs/01-eventos-tienda.md, sustituye "lo recogerá el Error Workflow (08, pendiente)"
  por la referencia a specs/08-error-workflow.md.
- Entrada en docs/ai-log.md (fuente: guía de la sesión 2 del profesor, paso 6).
No crees ni modifiques JSON de workflows. No ejecutes nada.
```

</details>

### n8n-mcp (#8)

- **Autora:** Esra
- **Tarea:** configurar n8n-mcp para el agente y documentarlo (`.mcp.json`, `AGENTS.md`, `README.md`, `docs/ai-log.md`)
- **Resultado:** servidor n8n-mcp en **modo solo documentación** (sin API key): el agente puede consultar nodos y parámetros y validar los JSON de `workflows/`, pero no se conecta a n8n. Elegimos este modo porque la pareja construye y publica los flujos en n8n, y el agente no debe tocar la instancia. Instalación a nivel de proyecto, que crea `.mcp.json`: `claude mcp add --scope project ... npx -y n8n-mcp`. **Prueba:** `validate_workflow` sobre `workflows/01-eventos-tienda.json` → válido, 0 errores y 0 avisos (9 nodos, 8 conexiones, 41 expresiones). Como sugerencia, el validador pidió gestión de errores (`onError` o Error Trigger), que ya cubre HU-05 (flujo 8). El agente también probó `validate_node` con el perfil `strict` en el Webhook: dio un aviso de buena práctica («los webhooks deberían responder siempre, también si fallan»).
- **Problemas encontrados:** las ramas sin conectar y `toFixed(2)` con `null` no salieron del validador: las añadió el agente al leer el JSON. Las ramas sin conectar ya están documentadas como pendientes en `specs/01-eventos-tienda.md` (`venta.registrada` y `apartado.vencido`). La rama sin email del abono termina a propósito (decisión de la sección 8 de `AGENTS.md`). `toFixed(2)` sobre un importe `null` no está documentado todavía en la spec. El agente también señaló que el JSON exportado lleva `"active": true`.
- **Decisión:** aceptado.

<details><summary>Prompt (prueba)</summary>

```text
Usa n8n-mcp para validar workflows/01-eventos-tienda.json. Dime qué herramientas de n8n-mcp has usado y qué errores o avisos encuentra. No modifiques nada.
```

</details>

<details><summary>Prompt (documentación)</summary>

```text
Documenta n8n-mcp (issue #8):
1. AGENTS.md: añade una sección corta "Herramientas del agente" (o dentro de una existente):
   n8n-mcp en modo solo documentación (.mcp.json, sin API key: no se conecta a n8n ni
   puede crear ni publicar flujos). Para qué se usa: consultar nodos y parámetros antes
   de escribir una spec, y validar los JSON de workflows/ (validate_workflow) antes de
   abrir una PR. Al abrir el proyecto, Claude Code pide aprobar el servidor.
2. docs/ai-log.md:
   - Tabla de herramientas: fila "Documentación y validación de nodos | n8n-mcp (modo
     solo documentación) | — | En uso".
   - Entrada "n8n-mcp (#8)": por qué solo documentación (la pareja construye y publica
     en n8n; el agente no debe tocar la instancia), cómo se instaló
     (claude mcp add --scope project ... npx -y n8n-mcp) y la prueba: validate_workflow
     sobre workflows/01-eventos-tienda.json → válido, 0 errores, 0 avisos; las
     sugerencias (gestión de errores, ramas sin conectar, toFixed con null) ya estaban
     cubiertas por HU-05 o documentadas como pendientes. Incluye este prompt y el de la prueba.
3. README.md, sección de cómo empezar: una línea para que la pareja apruebe n8n-mcp
   al abrir Claude Code en el proyecto (requiere Node/npx).
No ejecutes nada más.
```

</details>

### Spec y tabla de decisión HU-03 (#31)

- **Autora:** Beste.
- **Tarea:** primera subtarea de HU-03 (#30): especificación y resultado esperado de los nueve correos de `data/correos/`.
- **Resultado:** revisión de `specs/03-abonos-distancia.md` con cabecera, entradas, llamadas a API, decisiones, salidas, errores, nueve casos y criterios del README. Expectativa: cuatro abonos, cuatro consultas/avisos y un descarte.
- **Problemas encontrados:** el borrador trataba las transferencias como una decisión pendiente, aunque AGENTS.md ya confirma que se registran como `bizum`. Se corrigieron el caso de Lucía y el contrato de registro. Se aclararon concepto vacío, discrepancias con el ID, ausencia de email y separación entre expectativas y pruebas reales.
- **Decisión:** aplicar las reglas existentes sin modificar backend/frontend ni workflows. Documento para revisión de la pareja; ejecuciones n8n, capturas, exportación y PR pendientes de sus subtareas. Comprobación local del seed registrada aparte de las pruebas reales del flujo.

**Instrucción de trabajo:** especificar HU-03 con el disparador de desarrollo y final, extracción de ordenante/importe/concepto, búsqueda y decisiones mediante API, registro y errores 422, avisos a Marisa y resultados esperados para los nueve correos. Aplicar la plantilla y las decisiones de AGENTS.md. La IA solo extrae los tres datos; las reglas del flujo deciden.

### Spec del informe mensual · HU-08 (`specs/07-informe-mensual.md`)

- **Autora:** Esra (la HU era de Beste)
- **Tarea:** issue #70 y sub-issues #71–#76: spec del flujo `07 · Informe mensual`. Solo documentación; el flujo todavía no se construye.
- **Resultado:**
  - Spec nueva con la plantilla. Tiene dos disparadores:
    - Schedule Trigger el día 1 a las 8:00, con la zona `Europe/Madrid` en Settings;
    - Form Trigger `Elegir mes` (campo Date `mes`) para probar y repetir informes.
  - **Flujo:** `Calcular periodo` (Code, Luxon), cuatro `GET` en cadena con Execute Once y Always Output Data (ventas del mes, abonos desde el día 1, apartados y vales), `Preparar informe` (Code) y `Enviar informe mensual` (HTML, sin atribución).
  - Cada cifra tiene su endpoint y su regla. El pendiente de cobro es la suma del `pendiente` de la app de los apartados `activo`, en el momento de ejecutar el flujo.
  - **Pruebas:**
    - valores esperados de septiembre de 2026 calculados con una consulta de solo lectura a la base de datos de la app (sin `POST`): ventas 3772.75, abonos 289.00, total 4061.75, pendiente 787.05, 6 nuevos, 2 liquidados y 0 vencidos;
    - un mes vacío (enero de 2026), el periodo calculado desde el Schedule Trigger y un `401`.
  - Cuatro decisiones nuevas en la sección 8 de `AGENTS.md`: liquidados, vencidos, disparador de prueba y HTML en vez de PDF. `07 · Informe mensual` ya estaba en la sección 5.
  - El agente consultó con n8n-mcp:
    - Schedule Trigger (versión 1.4, intervalo Months, opción If Execution Is Missed);
    - Form Trigger (campo Date);
    - Send Email (Email Format HTML, campo `html`).
- **Problemas encontrados:**
  - **Sin fecha de liquidación ni de vencimiento.** La app no las guarda. Se usa la `fecha` del último abono para los liquidados y la `fecha` del vale para los vencidos.
  - **Abonos del mes y regla de liquidados.** Si se leyeran solo los abonos del mes, un apartado con abonos en septiembre y liquidado en octubre contaría como liquidado en septiembre. Por eso se leen los abonos **desde** el día 1, sin `hasta`.
  - **Vencido con retraso en los datos de ejemplo.** El apartado 22 tiene la `fecha_limite` del 11/09, pero su vale es del 21/10 (el día que se cargó el seed). Con la regla elegida sale en octubre, no en septiembre. Queda como caso de prueba.
  - **El pendiente es el de hoy.** La app no guarda el histórico. Al pedir un mes antiguo por el formulario, el pendiente es el del momento de ejecutar; la spec y el informe lo indican.
  - **Valores ligados al seed.** Los valores esperados dependen del día en que se cargó el seed (21/10/2026). Si se recarga, hay que recalcularlos.
  - **Opción que puede no estar.** If Execution Is Missed aparece en la versión 1.4 del Schedule Trigger de n8n-mcp; está por confirmar que exista en n8n 2.4.5. Si no, el informe se repite a mano con el formulario.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

HU-08 · Informe mensual (flujo 7), issue #70 y sub-issues #71–#76, nivel Medio. Escribe la spec. Después la pareja construirá el flujo en n8n; ahora solo la spec. Rama `feature/hu-08-informe-mensual` (sale de `dev`). La HU era de Beste y ahora es de Esra.

## Fuentes

- README: HU-08, fila del flujo 7 en «Automatizaciones a construir» y nivel Medio («Informe mensual en PDF o con tabla en el correo»).
- `AGENTS.md`, `docs/ontologia.md`, `docs/guia-de-la-app.md`, `specs/_plantilla.md`, y como ejemplo de estilo `specs/01-eventos-tienda.md` y `specs/09-migracion-excel.md`.
- `backend/routes/` y `backend/models/`: qué devuelven y qué filtros admiten `GET /api/ventas`, `GET /api/abonos`, `GET /api/apartados`, `GET /api/apartados/resumen` y el endpoint de vales. Comprueba qué fechas existen (el apartado no tiene fecha de liquidación ni de vencimiento).
- n8n-mcp: Schedule Trigger (día 1 de cada mes, zona horaria), Send Email con HTML, y cómo probar el flujo sin esperar al día 1.

## Contenido

1. `specs/07-informe-mensual.md` con la plantilla:
   - **Disparador:** Schedule Trigger el día 1 a una hora razonable, zona `Europe/Madrid`. Más una forma de probarlo con un mes concreto (por ejemplo, un Manual Trigger o Form Trigger con el mes); decide cuál y por qué.
   - **Periodo:** el mes anterior completo (del día 1 al último día), calculado en el flujo.
   - **Contenido del informe**, cada cifra con su endpoint y su regla:
     - recaudado en ventas directas y en abonos, por separado, y el total; si es útil, desglose por `forma_pago`;
     - total pendiente de cobro: suma de `pendiente` de los apartados activos, tal como lo da la app (no se recalcula);
     - apartados nuevos del mes (por `fecha` del apartado);
     - apartados liquidados del mes: la app no guarda la fecha de liquidación; propón la regla (por ejemplo, la fecha del último abono de un apartado `liquidado`) y anótala como decisión;
     - apartados vencidos del mes (por la `fecha` del vale, o lo que permita la API);
     - qué hacer si un mes no tiene movimientos (el informe lo dice, no falla).
   - **Salida:** un correo a Marisa con tabla HTML (credencial `Mailpit`, From y To según la convención de las otras specs, sin atribución de n8n). Asunto con el mes y el total recaudado.
   - **Casos de error:** `401`, la app no responde, listas vacías. Error workflow `08`.
   - **Prueba:** con los datos de ejemplo de la app (`SEED=1`, cubre los últimos 75 días): mes de prueba septiembre de 2026. Calcula con la API o la base de datos de solo lectura los valores esperados (no hagas `POST`) y ponlos en una tabla para comparar con el correo («los importes coinciden con los de la app»). Evidencias previstas en `docs/evidencias/07-hu08-*.png`.
   - **Criterios de aceptación:** los 3 de la HU-08 del README, tal cual.
2. `AGENTS.md`:
   - Sección 5: `07 · Informe mensual`, si no está.
   - Sección 8: las decisiones que tomes (regla de liquidados, de vencidos, disparador de prueba, HTML en vez de PDF), con su porqué.
3. `docs/ai-log.md`: entrada «### Spec del informe mensual · HU-08 (`specs/07-informe-mensual.md`)» con el formato habitual y este prompt literal en un bloque `<details>`.

## Límites

- Solo la spec: no toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`. Puedes hacer `GET` a la API para calcular los valores esperados, nunca `POST`.
- Usa solo campos de `docs/ontologia.md`; si falta algo, déjalo como pregunta.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado y qué decisiones has tomado.
```

</details>

### Código de los nodos Code · HU-08 (`specs/07-informe-mensual.md`)

- **Autora:** Esra
- **Tarea:** issue #70: código JavaScript de los 2 nodos Code del workflow `07 · Informe mensual`.
- **Reparto:** la pareja construye a mano en n8n los nodos y las conexiones, con los nombres de la spec; el agente escribe solo el código de los Code y la configuración de los otros 7 nodos. El código y el `LEEME.md` quedan fuera del repo (`~/hu08/`) y entran con el JSON del workflow al exportarlo.
- **Resultado:**
  - `1-calcular-periodo.js` (`Calcular periodo`): el mes de la fecha del formulario o, sin ella, el mes anterior a hoy en `Europe/Madrid`, con Luxon. El nombre del mes va en español con una lista propia, sin depender del idioma de Node.
  - `2-preparar-informe.js` (`Preparar informe`): las cifras del paso 7 de la spec, el mes sin movimientos y `{ asunto, html }`.
    - Suma en céntimos e ignora el item vacío de Always Output Data.
    - Escapa `&`, `<` y `>`, y no recalcula `pendiente`.
    - HTML con estilos en línea y tablas con borde.
  - `LEEME.md`: qué recibe y devuelve cada Code, la configuración de los dos disparadores, los 4 `GET`, el Send Email y las Settings, y el dibujo de las conexiones.
  - `informe-septiembre.html`: el correo de septiembre, para verlo en el navegador.
  - El agente consultó con n8n-mcp:
    - el nodo Code (modo Run Once for All Items);
    - Form Trigger (campo Date, Label, Custom Field Name y Placeholder);
    - Schedule Trigger y Send Email (Email Format HTML).
  - En el backend comprobó que `GET /api/abonos` admite `desde` sin `hasta`, porque `hasta` vale `9999-12-31` por defecto, y que `GET /api/vales` no admite filtros.
- **Prueba en local (agente):** con `node` se simuló `$()` con los datos reales de la API (solo `GET`, la clave leída del `.env` sin imprimirla).
  - **Septiembre de 2026:**
    - ventas 3772.75 (109), abonos 289.00 (21) y total 4061.75;
    - pendiente 787.05 en 20 activos;
    - 6 nuevos, 2 liquidados (nº 9 y 20) y 0 vencidos.
    - Coincide con la sección 7 de la spec.
  - **Enero de 2026:** todo a 0.00 y «No hubo movimientos en enero de 2026». Coincide.
  - **Casos extra:**
    - sin `mes` (programado) el 26/10 → septiembre;
    - el 01/01/2027 → diciembre de 2026, y el 01/03/2026 → febrero (28 días);
    - una fecha no válida → error;
    - octubre de 2026 → sale el vencido nº 22 (`VALE-00022`);
    - un nombre con `<b>` y `&` sale escapado;
    - 0.10 + 0.20 → 0.30.
- **Problemas encontrados:**
  - **Descripción del campo del formulario.** La spec ponía una descripción en el campo `mes`, pero el Form Trigger no tiene descripción por campo. Se corrigió en la spec: el texto va en **Form Description**. Además, en el Form Trigger 2.5 o posterior, si se rellena **Custom Field Name**, la clave de salida cambia; el `LEEME.md` pide dejarlo vacío.
  - **Fallo del arnés de prueba.** El primer intento de fijar la fecha con `Settings.now` de Luxon entró en recursión. Era un fallo del arnés, no del código; se corrigió.
  - **Pendiente de comprobar al construir:**
    - el formato exacto en que llega el campo Date del formulario en n8n 2.4.5 (el código toma los 10 primeros caracteres como `yyyy-MM-dd` y, si no es una fecha, para con error);
    - si existe **If Execution Is Missed** en el Schedule Trigger.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

HU-08 (issue #70): vamos a construir `07 · Informe mensual` a mano en n8n, siguiendo `specs/07-informe-mensual.md`. Tú escribes solo el JavaScript de los 2 nodos Code; la pareja crea los demás nodos y pega tu código. Usa exactamente los nombres de nodo de la spec.

## Fuentes

- `specs/07-informe-mensual.md` (sobre todo las secciones 3, 4, 5 y 7), `AGENTS.md`, `docs/ontologia.md`.
- `backend/routes/` y `backend/models/`: forma exacta de lo que devuelven `GET /api/ventas`, `/api/abonos`, `/api/apartados` y `/api/vales`, y si `/api/abonos` admite `desde` sin `hasta`.
- n8n-mcp: nodo Code (Run Once for All Items, `$('Nodo').all()`, `.first()`, Luxon `DateTime`), salida del Form Trigger con un campo Date, salida del Schedule Trigger.
- Como ejemplo de estilo: `~/hu10-codigo/` (los Code y el `LEEME.md` de HU-10).

## Contenido

1. En `~/hu08/` (fuera del repo, no se sube):
   - `1-calcular-periodo.js`: si llega `mes` del formulario, el mes de esa fecha; si no (Schedule Trigger), el mes anterior a hoy en `Europe/Madrid`. Devuelve un item `{ desde, hasta, nombre_mes }` con `nombre_mes` en español («septiembre de 2026»).
   - `2-preparar-informe.js`: las cifras de la tabla de la sección 4 (paso 7), el mes sin movimientos (paso 8) y `{ asunto, html }` (paso 9 y sección 5). Suma en céntimos, ignora los items vacíos de Always Output Data, escapa `&`, `<`, `>` en los textos, no recalcula `pendiente`. HTML sencillo con estilos en línea (tablas con borde), que se lea bien en Mailpit y en el móvil.
   - `LEEME.md`: qué recibe y qué devuelve cada Code (con un ejemplo corto) y la configuración exacta de los otros nodos para la pareja: los dos disparadores (campos y opciones), los 4 `GET` (URL, query, Settings), el Send Email (campos y opciones) y las Settings del workflow (Error workflow `08`, zona `Europe/Madrid`). Con un dibujo de las conexiones.
2. Prueba en local con node: haz `GET` a la API (con la clave del `.env`, sin imprimirla) para traer los datos reales, simula `$()` con ellos y ejecuta los dos Code para septiembre de 2026 y para enero de 2026. Dime los resultados y si coinciden con la sección 7 de la spec. Guarda el HTML de septiembre en `~/hu08/informe-septiembre.html` para que la pareja lo vea en el navegador.
3. `specs/07-informe-mensual.md`: solo si algo de la sección 4 no coincide con lo que has visto en el backend o en n8n-mcp, corrígelo y dime qué.
4. `docs/ai-log.md`: entrada «### Código de los nodos Code · HU-08 (`specs/07-informe-mensual.md`)» con el formato habitual (reparto: la pareja construye los nodos, el agente escribe el código) y este prompt literal en un bloque `<details>`.

## Límites

- No toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`.
- Solo `GET` a la API, nunca `POST`. No escribas la clave en ningún fichero ni en la salida.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

### Construcción del flujo · HU-08 (`workflows/07-informe-mensual.json`)

- **Autora:** Esra
- **Tarea:** construir y probar en n8n el workflow `07 · Informe mensual` según `specs/07-informe-mensual.md` y exportarlo.
- **Resultado:**
  - La pareja construyó a mano en n8n los 7 nodos que no son Code y pegó el código de los 2 Code. En total son 9 nodos, con los nombres de la spec, el `08` como Error workflow y la zona `Europe/Madrid`. Los 2 Code del JSON exportado son idénticos a `~/hu08/1-calcular-periodo.js` y `~/hu08/2-preparar-informe.js`.
  - **Pruebas** (Test URL del formulario, datos de ejemplo):
    - **Septiembre de 2026** (`mes` = 15/09/2026): «Informe de septiembre de 2026: 4061.75 € recaudados». Todas las cifras coinciden con la sección 7: ventas 3772.75 (109), abonos 289.00 (21), pendiente 787.05 en 20 activos, 6 nuevos, 2 liquidados y 0 vencidos.
    - **Enero de 2026:** «Informe de enero de 2026: 0.00 € recaudados», con «No hubo movimientos en enero de 2026», todo a 0 y pendiente 787.05.
    - **Octubre de 2026** (prueba añadida para ver la tabla de vencidos con datos): «Informe de octubre de 2026: 2552.75 € recaudados».
      - Ventas 1854.45 (63) y abonos 698.30 (48), los de la base de datos.
      - 13 nuevos y 7 liquidados, entre ellos el 19 y el 18, que en septiembre salían como nuevos.
      - 1 vencido: apartado 22, `VALE-00022`, 25.00 €, con fecha límite 11/09/2026.
    - **Disparador programado:** Execute step en `Día 1 a las 8:00` y en `Calcular periodo` el 26/10/2026 a las 14:25 (Europe/Madrid) da `2026-09-01` a `2026-09-30`.
    - **`401` y aviso del `08`:** no se hizo. El `08` ya se probó con un `401` en HU-05 y este flujo lo tiene como Error workflow. Hacerla obligaba a publicar el `07` y a crear una credencial falsa.
  - Se resolvió lo que quedaba por comprobar: el campo Date del formulario llega en un formato que el código lee bien (septiembre salió correcto). **If Execution Is Missed** no se cambió; la spec lo recoge así.
- **Problemas encontrados:**
  - **El export vuelve a reescribir `01`** con la rama de HU-09, que es del PR #159. Ese cambio se descartó con `git restore`.
  - **Zona horaria.** La del workflow se quedó en *Default* y se puso `Europe/Madrid` en Settings, como pide la spec.
- **Decisión:** aceptado.
- No hay prompt: el flujo lo construyó la pareja a mano.

## 4. Decisiones abiertas

Ninguna por ahora.
