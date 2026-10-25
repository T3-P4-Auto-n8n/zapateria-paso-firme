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

### Spec de la migración del Excel · HU-10 (`specs/09-migracion-excel.md`)

- **Autora:** Esra
- **Tarea:** issues #84 y #85: primera subtarea de HU-10. Spec de `09 · Migración del Excel` con la plantilla y el análisis fila a fila de `data/excel_actual_apartados.csv` y `data/excel_actual_ventas.csv`. Solo documentación; el flujo no se construye todavía.
- **Resultado:**
  - `specs/09-migracion-excel.md`:
    - Disparador: Form Trigger `Subir el Excel` con dos campos de fichero, más Extract from File (CSV).
    - Limpieza en un Code: fechas, importes, nombres y teléfonos, sin recalcular importes.
    - Agrupación de apartados por cliente normalizado + modelo; dudosos (abono inicial < 5 € y abonos sin apartado cargado); ventas sin las filas de abono ni el TOTAL.
    - Carga por API con la `fecha` original, con idempotencia (apartado: cliente + producto + fecha; abono: fecha + importe; venta: concepto + importe del día).
    - Comprobación de `pendiente` frente a `resta`.
    - `422` al informe y el resto de errores al `08`.
    - Informe en un solo correo y procedimiento (despublicar el `01` durante la migración).
    - Tablas de prueba fila a fila: 7 apartados, 3 abonos, 6 ventas, 2 dudosos de Lucía Gómez, 4 filas omitidas y 0 diferencias en la 1.ª ejecución; todo «ya existía» en la 2.ª.
  - `AGENTS.md`: `09 · Migración del Excel` en la sección 5 y tres decisiones en la sección 8.
  - El agente consultó con n8n-mcp Form Trigger (campo File: Multiple Files, Accepted File Types), Extract from File (Extract From CSV, Input Binary Field, Header Row), HTTP Request (Authentication → Generic Credential Type) y Code.
- **Problemas encontrados:**
  - **Prompt cortado.** El prompt llegó con texto cortado en varios puntos (5 a 14 y Límites); el agente reconstruyó por contexto los motivos, los endpoints, las comparaciones y la decisión de las ventas. Hay que revisarlo.
  - **Forma de pago.** La decisión «el Excel no indica la forma de pago» no es exacta del todo: el CSV de ventas trae la de los 3 pagos de apartados que se omiten, y el abono inicial de Sofía Navarro fue `bizum`. Queda como pregunta abierta en la spec.
  - **Datos de ejemplo.** `backend/seed.py` tiene los mismos 8 clientes del Excel y los mismos conceptos e importes de venta. Una venta de ejemplo del mismo día, concepto e importe haría que la del Excel saliera como «ya existía». La spec recomienda probar con una app sin datos de ejemplo, sin `docker compose down -v`, que borra también n8n. Además, el riesgo de coincidencia de apartados queda como pregunta (comparar también `talla` y `telefono`).
  - **Gotchas de n8n.**
    - Un `GET` sin resultados no devuelve items, así que la spec pide Always Output Data.
    - Con On Error → Continue (using error output), un `401` también sale por la salida de error: la spec separa el `422` (al informe) del resto (al `08`).
    - Por la Test URL del formulario, el `08` no salta.
  - **Detectado por el agente al cruzar los CSV y el seed:**
    - el abono inicial de Sofía Navarro (06/10, 10 €) fue `bizum` según el CSV de ventas, y con la regla inicial se habría registrado como `efectivo`;
    - las ventas del seed pueden coincidir con las del Excel (mismo día, concepto e importe) y dar un falso «ya existía»;
    - un apartado del seed podría coincidir con uno del Excel.
  - **Decisiones de la pareja:**
    - **Forma de pago:** si una fila de ventas omitida como duplicado coincide por `fecha` + importe con exactamente un pago del CSV de apartados, se usa su `forma_pago`; si no, `efectivo`. El informe indica el origen de cada una. Así, Sofía Navarro va como `bizum` y Miguel Ángel López y Ana Torres (03/10) como `efectivo` del CSV de ventas.
    - **Coincidencia del apartado:** cliente normalizado + `producto` + `talla` + `fecha`.
    - Las dos preguntas abiertas se quitaron de la spec, y la decisión de la forma de pago se reescribió en la sección 8 de `AGENTS.md`.
- **Decisión:** aceptado con cambios.

<details><summary>Prompt</summary>

```text
## Tarea

Primera subtarea de HU-10 (issues #84 y #85): escribe la spec de la migración del Excel en specs/09-migracion-excel.md a partir de specs/_plantilla.md, con el análisis fila a fila de los dos CSV. Solo documentación: todavía no construimos el flujo.

## Fuentes

- README.md: HU-10, sección de datos (data/) y nivel Medio ("Migración del Excel actual").
- data/excel_actual_apartados.csv y data/excel_actual_ventas.csv.
- docs/guia-de-la-app.md (POST /api/apartados, /abonos, /ventas, parámetro `fecha`, filtros `q`, `desde`, `hasta`), docs/ontologia.md, AGENTS.md, specs/01-eventos-tienda.md (estilo), specs/08-error-workflow.md.
- backend/models/apartado.py (`listar`: `q` usa LIKE sobre cliente, producto y teléfono) y backend/seed.py (clientes que ya existen en la app).
- n8n-mcp: consulta Form Trigger (campo de tipo fichero), Extract from File (CSV), Code y HTTP Request para usar nombres y parámetros reales.

## Contenido

1. Cabecera: flujo `09 · Migración del Excel` (workflows/09-migracion-excel.json), HU-10, nivel Medio, responsable Esra. Credenciales: `API Tienda` (Header Auth) y `Mailpit`. Error Workflow: 08.
2. Disparador: Form Trigger "Subir el Excel" con dos campos de fichero (apartados y ventas). Motivo: el contenedor de n8n no ve la carpeta data/ del repo, y así no tocamos docker-compose.yml. Después, Extract from File (CSV) para cada fichero.
3. Limpieza (nodo Code), sin recalcular importes:
   - Fechas: dd/MM/yyyy y d/M/yy → yyyy-MM-dd.
   - Importes: quitar €, coma decimal → punto, a número.
   - Nombres: espacios y mayúsculas normalizados ("carmen ruiz" → "Carmen Ruiz").
   - Teléfonos: formato "612 345 001"; vacío → sin teléfono.
4. Apartados CSV: agrupar por cliente normalizado + modelo, ordenado por fecha. La primera fila es el apartado (precio, abono → abono_inicial); las siguientes son abonos.
   - Dudoso (no se carga, va al informe): abono inicial < 5 €, y cualquier abono cuyo apartado no se cargó.
5. Ventas CSV: cargar las ventas normales. No cargar como venta:
   - filas cuyo concepto contiene "abono" o "(apartado)" (ya están en el CSV de apartados; cargarlas contarí
   - la fila TOTAL.                                                                 Las tres filas de abono somitida: duplicado del CSV de apartados".                                                                      6. Carga por API con la `fecpartados, POST/api/apartados/{id}/abonos, POST /api/ventas), credencial `API Tienda`.          7. Idempotencia (ejecutarlo
   - Apartado: GET /api/apartados?q=<cliente> y comparar cliente normalizado +   producto + fecha. Ojo: la apeed con el mismo nombre(Carmen Ruiz, Jorge Martín, Lucía Gómez) y otros productos: comparar solo por    nombre asignaría abonos al a
   - Abono: GET /api/apartados/{id} y comparar fecha + importe en `abonos`.         - Venta: GET /api/ventas?a> y comparar concepto +importe.                                                                            - Si ya existe, no se cremo "ya existía".
8. Comprobación: tras cargar cada apartado y sus abonos, comparar el `pendiente` de la app con la columna `re a mano). Si no coincide, vaal informe; nunca se corrige a mano.
9. Informe: un correo a tienlpit) con los creados, losque ya existían, los dudosos con su motivo, las filas omitidas y las diferencias
con `resta`.
10. Errores: 422 de la API → la fila va al informe con el mensaje de la app (On
Error → Continue en los HTTP → Error Workflow 08.
11. Procedimiento: despublicar `01 · Eventos de la tienda` antes de migrar y
volver a publicarlo después.ado dispara HU-01 y, como elExcel no tiene email, llegarían 7 avisos "sin email" a la tienda.
12. Tabla de prueba fila a frado de la primera ejecución(7 apartados, 3 abonos, 6 ventas, 2 dudosos de Lucía Gómez, 3 filas de abono
omitidas, la fila TOTAL omitreados, todo "ya existía").Criterios de HU-10 copiados literal y sin marcar.
13. AGENTS.md:
    - Sección 5, convención de nombres: añadir `09 · Migración del Excel`.
    - Sección 8, decisiones
      - Los apartados y abonos del Excel sin forma de pago se registran como `efectivo` (el valor por deforme lo indica.
      - Se migran también las ventas, salvo las filas de abono y el TOTAL (README: los dos CSV son para la migr
      - Un abono cuyo apartado no se pudo cargar también va al informe como
dudoso.
14. docs/ai-log.md: entrada "### Spec de la migración del Excel · HU-10
(`specs/09-migracion-excel.mual y este prompt literal enun bloque <details>.

## Límites

- No toques n8n, workflows/, backend/, frontend/ ni docker-compose.yml.
- No llames a la API ni carg
- No hagas commit, push ni PR. Cuando termines, dime qué archivos has cambiado.
```

</details>

<details><summary>Prompt (revisión)</summary>

```text
Revisado, muy buen análisis. Cerramos las dos preguntas abiertas:

1. Forma de pago (paso 6): si una fila del CSV de ventas omitida como duplicado coincide por fecha + importe con exactamente un apartado (abono inicial) o abono del CSV de apartados, se usa su forma_pago; si no, `efectivo`. Resultado: Sofía Navarro `bizum`, Miguel Ángel López y Ana Torres (03/10) `efectivo`, el resto `efectivo` por defecto. El informe indica para cada uno si la forma de pago viene del CSV de ventas o es `efectivo` por defecto. Actualiza los pasos, las tablas de prueba (fila 12 → bizum) y quita la "Pregunta abierta".
2. Coincidencia del apartado (paso 9 y fila de riesgo de la sección 6): cliente normalizado + producto + talla + fecha. Quita la "Pregunta abierta" de esa fila.
3. AGENTS.md, sección 8: cambia la fila de `efectivo` por "Los apartados y abonos del Excel se registran con la forma de pago del CSV de ventas cuando el mismo pago aparece allí (misma fecha e importe); si no, `efectivo`" | "El CSV de apartados no la indica; `efectivo` es el valor por defecto de la app. El informe indica de dónde sale cada una" | Tomada.
4. docs/ai-log.md, entrada de HU-10: añade en "Problemas encontrados" que el agente detectó el caso de Sofía (bizum) y el riesgo de coincidencia con las ventas del seed, y las dos decisiones de la pareja. "Decisión: aceptado con cambios." Añade este prompt al bloque <details> después del primero.

No hagas commit. Dime qué has cambiado.
```

</details>

### Código de los nodos Code · HU-10 (`specs/09-migracion-excel.md`)

- **Autora:** Esra
- **Tarea:** issues #86 a #90: código JavaScript de los 5 nodos Code del workflow `09 · Migración del Excel`.
- **Reparto:** la pareja construye a mano en n8n los nodos y las conexiones, con los nombres ya decididos; el agente escribe solo el código de los Code y la configuración que hay que poner en los otros 15 nodos. El código y el `LEEME.md` quedan fuera del repo y entran con el JSON del workflow al exportarlo.
- **Resultado:**
  - 5 ficheros `.js`: `Limpiar y clasificar`, `Decidir qué crear`, `Preparar abonos`, `Preparar ventas` y `Preparar informe`. Llevan comentarios cortos en español, no usan librerías y no recalculan `abonado` ni `pendiente`.
  - Un `LEEME.md` con lo que recibe y devuelve cada Code (con ejemplo) y la configuración exacta de los otros 15 nodos.
  - La sección 4 de `specs/09-migracion-excel.md` está adaptada al flujo real: tres `GET` de listas, un IF antes de cada `POST`, `Never Error` + respuesta completa y un único `GET` final para comprobar los pendientes. Se quitan el Loop Over Items, el Switch y la búsqueda por `q`.
  - El agente consultó con n8n-mcp el nodo Code (modo Run Once for All Items) y HTTP Request (Include Response Headers and Status, Response Format, Authentication).
- **Prueba en local (agente):** con `node` se simularon `$()` y una app falsa con las reglas de `backend/models`, y se usaron los dos CSV de `data/`:
  - **1.ª ejecución:**
    - 7 apartados, 3 abonos y 6 ventas creados;
    - 2 dudosos (Lucía Gómez) y 4 omitidas;
    - 0 diferencias y 0 errores;
    - Sofía `bizum` (CSV de ventas, fila 8); Miguel y Ana del 03/10 `efectivo` del CSV de ventas.
  - **2.ª ejecución:** 0 creados y todo «ya existía». Coincide con la sección 7 de la spec.
  - **Casos extra:**
    - una venta de ejemplo que coincide sale como «ya existía»;
    - un apartado de ejemplo de Carmen Ruiz con otra talla no se confunde;
    - un abono que supera lo pendiente → `422` en el informe y diferencia con la resta;
    - un `401` → error con el código y el mensaje de la app.
- **Problemas encontrados:**
  - **Los 0 items.** Un nodo que no devuelve items corta el flujo. Por eso:
    - los `GET` llevan Always Output Data, y el Code ignora el item vacío;
    - los Code nunca devuelven 0 items: si no hay nada que crear, devuelven `{ cuerpo: null }`;
    - un IF antes de cada `POST` evita enviar ese item vacío (sería un `422`) y deja seguir al siguiente Code.
  - **Leer los resultados de una rama que no se ejecutó.** Si se lee la salida de un `POST` que no se ejecutó (rama false del IF), n8n da error. El código usa `isExecuted` y, por si en n8n 2.4.5 se comporta distinto, un `try/catch`. Las respuestas se emparejan por orden con los items enviados, y si no cuadra el número, el flujo para.
  - **Peticiones a la vez.** El HTTP Request puede enviar las peticiones en paralelo. Con dos abonos del mismo apartado, los dos se comprobarían contra el mismo `pendiente`. El agente lo detectó al revisar el diseño y el `LEEME.md` pide Batching de 1 en los `POST`.
  - **Fallos de la primera versión,** encontrados en la prueba local y corregidos: a las líneas de diferencias del informe les faltaba el guion, y la fila TOTAL salía con un separador vacío.
  - **Pendiente de comprobar al construir:** el nombre del campo binario que crea el Form Trigger (Input Binary Field de los Extract from File) y que `isExecuted` funciona en n8n 2.4.5.
  - **Prompt cortado.** El prompt llegó cortado en los puntos 7 a 11 y Contenido 1, 2, 3 y 5; el agente reconstruyó por contexto la carpeta (`~/hu10-codigo/`), el nombre del 5.º fichero (`5-preparar-informe.js`) y el título de esta entrada.
  - El prompt se corrompió al pegarlo en la terminal; el agente completó los pasos con la spec. Se sustituyó por el texto original.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

HU-10 (issues #86–#90): vamos a construir el workflow `09 · Migración del Excel` a mano en n8n. Tú escribes solo el JavaScript de los 5 nodos Code; la pareja crea los demás nodos y pega tu código. Los nombres de los nodos y las conexiones ya están decididos (abajo): úsalos exactamente.

## Fuentes

- specs/09-migracion-excel.md (reglas de limpieza, clasificación, idempotencia, forma de pago, informe), AGENTS.md, docs/guia-de-la-app.md.
- backend/routes/ y backend/models/: forma exacta de las respuestas de GET /api/apartados, /api/abonos y /api/ventas y de los POST.
- n8n-mcp: nodo Code (modo Run Once for All Items, `$('Nodo').all()`, `.first()`, `.isExecuted`) y HTTP Request (opciones Never Error e Include Response Headers and Status).

## Flujo (nombres exactos)

1. `Subir el Excel` (Form Trigger): campos File `apartados` y `ventas`.
2. `Leer CSV de apartados` y `Leer CSV de ventas` (Extract from File, CSV, Header Row), en paralelo desde el formulario → `Juntar los dos CSV` (Merge, Append).
3. Code `Limpiar y clasificar`: lee `$('Leer CSV de apartados').all()` y `$('Leer CSV de ventas').all()`. Devuelve UN solo item: `{ apartados: [...con sus abonos], ventas: [...], dudosos: [...], omitidas: [...], rango: { desde, hasta } }`.
4. `Leer apartados de la app` (GET /api/apartados), `Leer abonos de la app` (GET /api/abonos?desde=&hasta= con `rango`), `Leer ventas de la app` (GET /api/ventas?desde=&hasta=), en cadena, con Execute Once y Always Output Data (si la lista está vacía llega un item vacío: ignóralo).
5. Code `Decidir qué crear`: compara (apartado: cliente normalizado + producto + talla + fecha; abono: apartado_id + fecha + importe; venta: fecha + concepto + importe) y guarda el plan completo. Devuelve un item por apartado a crear `{ cuerpo: {...body del POST}, ref: {...}, plan }`, o, si no hay ninguno, un único item `{ cuerpo: null, plan }`.
6. IF `¿Hay apartados que crear?` (`$json.cuerpo` existe). true → `Crear apartados` (POST /api/apartados, body `$json.cuerpo`, Never Error + respuesta completa) → `Preparar abonos`. false → `Preparar abonos`.
7. Code `Preparar abonos`: plan de `$('Decidir qué crear').first().json.plan`; resultados de `Crear apartados` solo si `.isExecuted` (emparejados por orden con los items a crear). Une id nuevos y existentes con sus abonos; si un apartado dio 422, sus abonos pasan a dudosos. Si un POST dio un código que no es 2xx ni 422, lanza un Error (lo recoge el 08). Devuelve un item por abono a crear `{ apartado_id, cuerpo, ref }`, en orden de fecha, o un único `{ cuerpo: null }`.
8. IF `¿Hay abonos que crear?` → `Registrar abonos` (POST /api/apartados/{{ $json.apartado_id }}/abonos) → `Preparar ventas`; false → `Preparar ventas`.
9. Code `Preparar ventas`: igual (comprueba los resultados de `Registrar abonos`), devuelve las ventas a crear o `{ cuerpo: null }`.
10. IF `¿Hay ventas que crear?` → `Registrar ventas` (POST /api/ventas) → `Comprobar pendientes`; false → `Comprobar pendientes` (GET /api/apartados, Execute Once, Always Output Data).
11. Code `Preparar informe`: lee todos los nodos con `.isExecuted`, comprueba los resultados de `Registrar ventas`, compara pendiente con resta y devuelve `{ asunto, texto }` en texto plano con las secciones de la spec (creados, ya existían, dudosos, omitidas, diferencias, errores de la API y de dónde sale cada forma de pago) → `Enviar informe de migración` (Send Email).

## Contenido

1. Escribe los 5 códigos en ~/hu10-codigo/ (fuera del repo, no se suben): `1-limpiar-y-clasificar.js`, `2-decidir-que-crear.js`, `3-preparar-abonos.js`, `4-preparar-ventas.js`, `5-preparar-informe.js`. Comentarios cortos en español, sin librerías externas, sin recalcular abonado ni pendiente.
2. En ~/hu10-codigo/LEEME.md: para cada Code, qué recibe y qué devuelve (con un ejemplo corto), y la configuración exacta de los otros 15 nodos que debe saber la pareja (URL, query, body, opciones de HTTP, condiciones de los IF).
3. Comprueba la lógica de 1, 2 y 5 con node en local usando los dos CSV de data/ (simulando `$()` con datos falsos de la app vacía y de la app con todo ya creado). Dime los resultados: deben coincidir con la tabla de la sección 7 de la spec.
4. specs/09-migracion-excel.md: actualiza la sección 4 a este flujo (nombres reales, IF antes de cada POST y por qué).
5. docs/ai-log.md: entrada "### Código de los nodos Code · HU-10" con el formato habitual (reparto: la pareja construye los nodos, el agente escribe el código; problema de los 0 items y la solución con IF) y este prompt literal en un bloque <details>.

## Límites

- No toques n8n, workflows/, backend/, frontend/ ni docker-compose.yml.
- No llames a la API.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

## 4. Decisiones abiertas

Ninguna por ahora.
