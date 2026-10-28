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

### Construcción del flujo · HU-10 (`workflows/09-migracion-excel.json`)

- **Autora:** Esra
- **Tarea:** construir y probar en n8n el workflow `09 · Migración del Excel` según `specs/09-migracion-excel.md` y exportarlo.
- **Resultado:**
  - La pareja construyó a mano en n8n los 15 nodos que no son Code y pegó el código de los 5 Code. En total son 20 nodos, con los nombres de la spec, y el `08` está configurado como Error Workflow.
  - **Preparación de la prueba:**
    - copia de la base de datos de la app;
    - app vacía con `SEED=0`;
    - `01 · Eventos de la tienda` despublicado, porque si no la app dispara un evento por apartado creado;
    - al terminar, se restauró la copia (con el seed) y se volvió a publicar el `01`.
  - **1.ª ejecución:**
    - `Crear apartados` 7, `Registrar abonos` 3 y `Registrar ventas` 6;
    - asunto «Migración del Excel: 7 apartados, 3 abonos y 6 ventas creados · 2 dudosos · 0 errores»;
    - 2 dudosos (Lucía Gómez, filas 3 y 9), 4 omitidas (filas 1, 6, 8 y 10 del CSV de ventas), 0 diferencias y 0 errores de la API;
    - en la app, 7 apartados, 10 abonos (7 iniciales + 3) y 6 ventas, cada abono en su apartado (Ana Torres, id 7, con su abono de 20 €).
  - **2.ª ejecución** (mismos CSV):
    - los tres IF van por false y no se ejecuta ningún `POST`;
    - asunto «0 apartados, 0 abonos y 0 ventas creados · 2 dudosos · 0 errores» y «Ya existían» 7 / 3 / 6;
    - la app sigue con 7 / 10 / 6.
  - Coincide con la sección 7 de la spec. Los 5 Code del JSON exportado son idénticos a los ficheros de `~/hu10-codigo/`.
  - Se resolvió lo que quedaba por comprobar: el Form Trigger crea los campos binarios `apartados` y `ventas`, y los Code leen sin error los `POST` que no se ejecutaron (2.ª ejecución), con `isExecuted` o con el `try/catch`.
- **Problemas encontrados:**
  - **Conexión duplicada:** una conexión repetida hacía que `Leer ventas de la app` se ejecutara dos veces. Se borró la que sobraba.
  - **URL de `Registrar abonos`** en modo Fixed en vez de Expression: el `{{ $json.apartado_id }}` no se sustituía. Se cambió a Expression.
  - **El export también reescribe `01`** con la rama de HU-09, que pertenece a otro PR (#159). Ese cambio se descartó con `git restore`.
- **Decisión:** aceptado.
- No hay prompt: el flujo lo construyó la pareja a mano.

### Spec de la rama HU-09 · Venta grande (`specs/01-eventos-tienda.md`)

- **Autora:** Esra
- **Tarea:** issues #77, #78 y #83: añadir a la spec del workflow 01 la rama de HU-09 (salida `venta.registrada`, flujo 4), con sus pruebas. Solo documentación; el flujo todavía no se construye.
- **Resultado:**
  - Spec actualizada en todas las secciones (alcance, cabecera, objetivo, entradas, pasos, salidas, errores, pruebas, evidencias previstas y criterios de HU-09 sin marcar). La rama tiene cinco nodos:
    - `Leer umbral de venta grande` (Data table, Row → Get, `clave` Equals `umbral_venta_grande`, Limit 1, **Always Output Data**);
    - IF `¿Hay umbral?`;
    - Stop and Error `Falta el umbral`, que recoge el `08`;
    - IF `¿Venta grande?` (Number, is greater than, con el importe leído de `$('Evento de la tienda')`);
    - `Avisar a la tienda: venta grande`.
  - Payloads nuevos: `venta.registrada-grande.json` (129.9), `venta.registrada-umbral.json` (100) y `venta.registrada-60.json` (60, para la prueba con el umbral a 50).
  - Nueva sección «Data tables de n8n» en `docs/credenciales.md`.
  - Nueva fila en la sección 8 de `AGENTS.md`.
  - El agente consultó con n8n-mcp los nodos Data table (`nodes-base.dataTable`, versión 1.1 en la base de n8n-mcp) y Stop and Error (`nodes-base.stopAndError`, versión 1) para usar sus nombres y parámetros reales.
- **Problemas encontrados:**
  - **Always Output Data.** La Data table, con la operación Get, no devuelve ningún item si no hay fila: la ejecución terminaría en ese nodo sin error, y el IF `¿Hay umbral?` y el aviso del `08` no llegarían a ejecutarse. El agente lo detectó al leer el nodo y la spec pide activar **Always Output Data** en `Leer umbral de venta grande`. Hay que comprobarlo al construir.
  - **Versión del nodo.** n8n-mcp no confirma que su versión de la Data table coincida con la de nuestra n8n 2.4.5: los nombres de los parámetros se revisan en el editor al construir.
  - **Payload extra.** El prompt no pedía un payload para la prueba de 60 €; el agente añadió `venta.registrada-60.json` para que la prueba sea repetible.
  - **Prueba sin fila.** Se hace por la Production URL, porque el `08` no salta con ejecuciones de prueba.
  - **Discrepancias con «variable».** `docs/ontologia.md` (reglas de la Venta, flujo 4) y el criterio 2 de HU-09 del README siguen diciendo que el umbral se guarda en una variable de n8n. La pareja decidió actualizar docs/ontologia.md para que coincida con la decisión; el criterio del README se copia literal con una nota.
- **Decisión:** aceptado con cambios (ontología actualizada).

<details><summary>Prompt</summary>

```text
## Tarea

Escribe la spec de la rama HU-09 (flujo 4, aviso de ventas grandes, issues #77, #78 y #83) dentro de specs/01-eventos-tienda.md, igual que hicimos con HU-01 y HU-02. Solo documentación: todavía no construimos el flujo.

## Fuentes

- README.md: HU-09 y tabla de flujos (flujo 4).
- docs/ontologia.md: "Venta grande (flujo 4)" y la tabla de quién decide qué.
- docs/guia-de-la-app.md: evento venta.registrada y campos de la Venta.
- specs/01-eventos-tienda.md (estructura y estilo actuales), specs/08-error-workflow.md, AGENTS.md, docs/credenciales.md.
- tests/payloads/venta.registrada.json.
- n8n-mcp: consulta el nodo Data table (operación para leer filas con una condición) y el nodo Stop and Error para que la spec use sus nombres y parámetros reales de n8n 2.4.5.

## Contenido

1. Decisión: las Variables de n8n ($vars) están bloqueadas en nuestra versión (community, "Upgrade to unlock variables"). El umbral se guarda en una Data table de n8n:
   - Tabla "Configuración", columnas `clave` (string) y `valor` (number).
   - Fila: clave `umbral_venta_grande`, valor `100`.
   - Marisa cambia el valor en la tabla sin editar el flujo.
2. Rama venta.registrada en specs/01-eventos-tienda.md (actualizar el aviso de alcance, la cabecera y cada sección):
   - Data table "Leer umbral de venta grande": lee la fila de `umbral_venta_grande`.
   - IF "¿Hay umbral?": si no hay fila o el valor está vacío → Stop and Error "Falta el umbral de venta grande en la Data table Configuración" (lo recoge el Error Workflow 08).
   - IF "¿Venta grande?": importe > umbral, estrictamente mayor (una venta igual al umbral no avisa). Comparación Number. Tras el nodo Data table, $json es la fila de la tabla: el importe se lee con $('Evento de la tienda').item.json.body.datos.importe.
   - true → Send Email "Avisar a la tienda: venta grande" (Mailpit, From/To tienda@pasofirme.example). Asunto con el importe; texto con id, concepto, importe (.toFixed(2)), forma_pago, fecha en dd/MM/yyyy y el umbral actual.
   - false → nada.
3. Pruebas (tabla como en HU-01/HU-02), con payloads nuevos en tests/payloads/ (datos ficticios):
   - venta.registrada-grande.json: importe 129.9 → aviso.
   - venta.registrada-umbral.json: importe 100 → no avisa.
   - venta.registrada.json (ya existe, 4.5) → no avisa.
   - Cambiar el valor de la tabla a 50 y repetir con un importe de 60 → aviso, sin tocar el flujo (evidencia del criterio 2).
   - Borrar la fila temporalmente → aviso del Error Workflow 08.
   Evidencias previstas: docs/evidencias/01-hu09-*.png. Los criterios de HU-09 quedan sin marcar.
4. docs/credenciales.md: nueva sección "Data tables de n8n" con la tabla Configuración, sus columnas, la fila inicial y cómo crearla (Overview → Data tables). Avisar de que las Data tables no se exportan con el JSON del workflow: tras importar 01 hay que crear la tabla y volver a elegirla en el nodo.
5. AGENTS.md, sección 8: fila "El umbral de venta grande se guarda en una Data table de n8n (Configuración)" | "Las Variables de n8n requieren licencia de pago" | Tomada.
6. docs/ai-log.md: entrada "### Spec de la rama HU-09 · Venta grande (`specs/01-eventos-tienda.md`)" con el mismo formato que las anteriores y este prompt literal en un bloque <details>.

## Límites

- No modifiques workflows/, backend/ ni frontend/.
- No crees la Data table ni toques n8n: solo documentación y payloads.
- No hagas commit, push ni PR. Cuando termines, dime qué archivos has cambiado.
```

</details>

### Construcción de la rama HU-09 · Venta grande (`workflows/01-eventos-tienda.json`)

- **Autora:** Esra
- **Tarea:** issues #79, #80, #81, #82 y #83: construir y probar en n8n la rama de HU-09 según `specs/01-eventos-tienda.md`, exportar el workflow y abrir la PR.
- **Resultado:**
  - La pareja construyó en n8n los 5 nodos de la spec (`Leer umbral de venta grande`, `¿Hay umbral?`, `Falta el umbral`, `¿Venta grande?` y `Avisar a la tienda: venta grande`) y creó la Data table `Configuración` con la fila `umbral_venta_grande` · `100`.
  - Pruebas superadas:
    - 129.90 → aviso;
    - 100 → sin aviso (estrictamente mayor);
    - 4.50 → sin aviso;
    - umbral cambiado a 50 en la tabla, sin tocar el flujo → aviso de 60.00 con «Umbral actual: 50.00»;
    - fila borrada + Production URL → correo del `08` con el paso «Falta el umbral».
  - `validate_workflow` (n8n-mcp) sobre `workflows/01-eventos-tienda.json`: válido, 0 errores y 0 avisos (14 nodos, 13 conexiones, 51 expresiones). Solo las sugerencias genéricas de gestión de errores, ya cubierta por el `08` (HU-05).
- **Problemas encontrados:**
  - Al crear la fila, `clave` y `valor` se escribieron juntos en la celda `clave` (`valor` quedó `Null`); se corrigió.
  - El correo llevaba la firma «This email was sent automatically with n8n»; se desactivó **Append n8n Attribution**, como en los demás correos.
  - La primera exportación se hizo con *Download* de la interfaz en lugar del script; se repitió con `scripts/flujos.py`.
- **Decisión:** aceptado.

<details><summary>Prompt</summary>

```text
## Tarea

La rama HU-09 ya está construida y probada en n8n, y workflows/01-eventos-tienda.json está exportado. Valida el workflow, actualiza la documentación y abre la PR.

## Contenido

1. Valida workflows/01-eventos-tienda.json con n8n-mcp (validate_workflow). Si hay errores, para y dímelos sin cambiar nada.
2. specs/01-eventos-tienda.md:
   - Quita "especificada, sin construir todavía" / "sin construir" del alcance y la cabecera.
   - En la sección de evidencias, cambia "Previstas para HU-09 (todavía no existen)" por enlaces reales a los cuatro archivos docs/evidencias/01-hu09-*.png (aviso-venta-grande, venta-igual-umbral, umbral-cambiado, sin-umbral-error).
   - Marca los dos criterios de HU-09.
3. docs/ai-log.md: nueva entrada "### Construcción de la rama HU-09 · Venta grande (`workflows/01-eventos-tienda.json`)" después de la de la spec de HU-09, con el formato habitual:
   - Autora: Esra. Tarea: issues #79, #80, #81, #82, #83.
   - Resultado: la pareja construyó los 5 nodos en n8n según la spec y creó la Data table Configuración. Pruebas superadas: 129.90 → aviso; 100 → sin aviso (estrictamente mayor); 4.50 → sin aviso; umbral cambiado a 50 en la tabla sin tocar el flujo → aviso de 60.00 con "Umbral actual: 50.00"; fila borrada + Production URL → correo del 08 con paso "Falta el umbral". Resultado de validate_workflow.
   - Problemas encontrados: al crear la fila, clave y valor se escribieron juntos en la celda clave (valor quedó Null); se corrigió. El correo llevaba la firma "This email was sent automatically with n8n"; se desactivó Append n8n Attribution, como en los demás correos. La primera exportación se hizo con Download de la interfaz en lugar del script; se repitió con scripts/flujos.py.
   - Decisión: aceptado.
   - Este prompt literal en un bloque <details>.
4. Commit en inglés (Conventional Commits) con todos los cambios pendientes de la rama (spec, AGENTS.md, ontología, credenciales, ai-log, payloads, evidencias y workflow), push de feature/hu-09-venta-registrada y PR a dev:
   - Título: "feat: large sale alert with configurable threshold (HU-09)"
   - Descripción breve: qué hace la rama, por qué Data table en lugar de Variables, cómo preparar la tabla tras importar (enlace a docs/credenciales.md), pruebas y evidencias.
   - Closes #77, #78, #79, #80, #81, #82, #83.
   - Reviewer: BesteOzaydin.

## Límites

- No toques n8n, backend/ ni frontend/.
- No hagas merge ni push a dev o main.
- No añadas co-autores ni firmas de IA al commit ni a la PR.
```

</details>

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

### Spec de los sub-workflows · #92 (`specs/10-sub-workflows.md`)

- **Autora:** Esra
- **Tarea:** issue #92 (sub-issues #93, #94 y #95): spec de los sub-workflows `10 · Buscar apartado` y `10 · Enviar notificación`, y del cambio del `08` para usar el segundo. Solo documentación; los construye después la pareja.
- **Resultado:**
  - Spec nueva con la plantilla y una subsección por sub-workflow en cada sección.
  - **`Buscar apartado`:**
    - Execute Workflow Trigger con los campos `id`, `texto` y `estado`;
    - `Comprobar la búsqueda` (Code);
    - IF `¿Por número?`, que va a `GET /api/apartados/{id}` o a `GET /api/apartados?q=&estado=`, con Never Error y respuesta completa;
    - `Preparar resultado` (Code), que devuelve siempre un item `{ total, apartados }` con los campos de la lista.
  - **`Enviar notificación`:**
    - campos `para`, `asunto`, `texto` y `html`;
    - `Comprobar la notificación` (Code);
    - IF `¿Lleva HTML?`, con dos Send Email (Both / Text) con `Mailpit`, From `tienda@pasofirme.example` y sin atribución;
    - `Preparar respuesta`, que devuelve `{ enviado, para, asunto, messageId }`.
  - **Tabla de uso (#95):**
    - el `08` cambia en este PR;
    - el `01` (flujos 1, 2 y 4), el `07` y el `09` cambian cuando se fusionen #159, #161 y #160;
    - el `03` y el `06` son de Beste, con el nodo que usaría cada sub-workflow.
    - #95 queda abierta (`Refs #95`).
  - **Cambio del `08` nodo a nodo:** `Avisar a la tienda del error` pasa de Send Email a Execute Workflow, con el mismo nombre y el mismo correo. Se anota qué pasa si falla el sub-workflow.
  - **Pruebas:** de cada sub-workflow suelto (pin data en el trigger) y del `08` llamándolo, con la misma prueba de HU-05.
  - Siete decisiones nuevas en la sección 8 de `AGENTS.md` y los dos nombres en la sección 5.
  - **Consultas a n8n-mcp:**
    - Execute Workflow Trigger: versión 1.3, Input data mode «Define using fields below»;
    - Execute Workflow: versión 1.4, Source Database, Workflow Inputs, Mode y Wait For Sub-Workflow Completion.
  - **Comprobado en el backend:** `q` busca con `LIKE` en `cliente`, `producto` y `telefono`, o el `id` exacto, y un `estado` vacío no filtra.
- **Problemas encontrados:**
  - **Búsqueda de un número con `q`.** `q=12` encuentra el apartado 12 y también cualquier teléfono que contiene `12`. Por eso el número va en `id`, con `GET /api/apartados/{id}`, y un `404` se trata como 0 resultados.
  - **Riesgo de bucle en el `08`.** Si `Enviar notificación` tuviera el `08` como Error workflow, un fallo suyo llamaría al `08`, que lo volvería a usar. Por eso los sub-workflows no llevan Error workflow, y sus errores los avisa el `08` del flujo que llama.
  - **La prueba de HU-05 no es un `401`.** El prompt habla del «mismo `401` de HU-05», pero la prueba de HU-05 es el correo con `email` `" "` («No recipients defined»). La spec usa esa.
  - **Las issues no tienen checklist.** #92–#95 solo tienen el título; los criterios se escribieron a partir de los títulos y de la línea del README.
  - **Pendiente de comprobar al construir:**
    - si n8n 2.4.5 exige publicar un sub-workflow para llamarlo;
    - que el mensaje de error del sub-workflow llegue al `08` del flujo que llama.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

Issue #92 (sub-issues #93, #94, #95), nivel Medio: «Sub-workflows reutilizables (Execute Workflow), por ejemplo "buscar apartado" o "enviar notificación"». Escribe la spec de los dos sub-workflows. Los construirá la pareja a mano en n8n después; ahora solo la spec. Estamos en la rama `feature/92-sub-workflows` (sale de `dev`).

## Fuentes

- README (nivel Medio, flujos 1, 2, 3 y 6), `AGENTS.md`, `docs/ontologia.md`, `docs/guia-de-la-app.md`, `specs/_plantilla.md`.
- `backend/routes/` y `backend/models/`: qué filtros admite `GET /api/apartados` (búsqueda por texto, teléfono, id, estado) y qué devuelve.
- Specs y workflows ya hechos, para ver dónde se repite hoy la búsqueda y el envío de correos: `specs/01-eventos-tienda.md`, `specs/03-abonos-distancia.md`, `specs/08-error-workflow.md`, `specs/09-migracion-excel.md`, `workflows/`.
- n8n-mcp: nodo Execute Workflow Trigger («When Executed by Another Workflow») en n8n 2.4.5 community, modo de entrada con campos definidos; nodo Execute Workflow (el que llama), qué devuelve al flujo que llama y cómo se prueba un sub-workflow suelto.

## Contenido

1. `specs/10-sub-workflows.md` con la plantilla, una sección por sub-workflow:
   - **Buscar apartado** (#93): entradas (por ejemplo, texto libre de cliente o teléfono, id, estado), qué llamada hace a la API y qué devuelve siempre con la misma forma (lista, número de resultados), también con 0 resultados. Quién lo usará: flujo 3 (Bizum, de Beste), flujo 6 y el asistente de Telegram.
   - **Enviar notificación** (#94): entradas (para, asunto, texto; opcional html), envío con la credencial `Mailpit` desde `tienda@pasofirme.example`, sin atribución de n8n, y qué devuelve. Qué hace si falta `para` o `asunto`.
   - Casos de error de cada uno (`401`, sin resultados, entrada vacía) y cómo llegan al `08 · Error Workflow`.
   - Prueba: cómo se prueba cada sub-workflow suelto en n8n (datos de entrada y resultado esperado) y una prueba llamándolo desde otro flujo.
   - **Uso** (#95): tabla de qué nodos actuales se sustituirán por una llamada al sub-workflow (flujos 1, 2, 4 en `01`, `07`, `08`, `09`, y el 6 que viene).
     - **En este PR:** `08 · Error Workflow` pasa a enviar su aviso con `Enviar notificación` (está en `dev` y ningún PR abierto lo toca). Describe el cambio nodo a nodo y su prueba (el mismo `401` de HU-05 debe seguir llegando igual). Si `08` usa un sub-workflow, piensa qué pasa si el propio sub-workflow falla y anótalo.
     - **Después:** `01` (flujos 1 y 2, PR #159), `07` (PR #161) y `09` (PR #160) se cambiarán cuando se fusionen esos PR, para no chocar con ellos.
     - **Flujos de Beste:** el 3 (`03 · Abonos a distancia`, PR #158) y el 6 (`06 · Recordatorios y vencimientos`, sin empezar) los usará Beste al construirlos o corregirlos. Indica qué nodo de cada uno usaría `Buscar apartado` y cuál `Enviar notificación`.
     - La issue #95 dice «usarlos desde los flujos 1, 2, 3, 6»: este PR la deja abierta (`Refs #95`); se cierra cuando estén los cuatro.
   - Criterios de aceptación: los de la issue #92 y sus sub-issues (léelas con `gh issue view`).
2. `AGENTS.md`:
   - Sección 5: los dos sub-workflows con su nombre de workflow. Decide la numeración siguiendo la convención de la sección 5 (no son flujos del README) y anota la decisión en la sección 8.
   - Sección 8: cualquier otra decisión que tomes (forma de la salida, qué hace con 0 resultados...).
3. `docs/ai-log.md`: entrada «### Spec de los sub-workflows · #92 (`specs/10-sub-workflows.md`)» con el formato habitual y este prompt literal en un bloque `<details>`.

## Límites

- Solo la spec: no toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`. No llames a la API.
- Usa solo campos de `docs/ontologia.md`; si falta algo, déjalo como pregunta.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado y qué decisiones has tomado.
```

</details>

### Código de los nodos Code · #92 (`specs/10-sub-workflows.md`)

- **Autora:** Esra
- **Tarea:** issue #92: código JavaScript de los 4 nodos Code de `10 · Buscar apartado` y `10 · Enviar notificación`, y los pasos del cambio del `08`.
- **Reparto:** la pareja construye a mano en n8n los nodos y las conexiones, con los nombres de la spec; el agente escribe solo el código de los Code y la configuración de los demás nodos. El código y el `LEEME.md` quedan fuera del repo (`~/subflujos/`) y entran con el JSON de los workflows al exportarlos.
- **Resultado:**
  - `1-comprobar-la-busqueda.js` y `2-preparar-resultado.js` (`Buscar apartado`); `3-comprobar-la-notificacion.js` y `4-preparar-respuesta.js` (`Enviar notificación`).
    - Los mensajes de error son los de la spec.
    - Un campo vacío (`null`, `""` o ausente) se trata igual.
    - No recalculan `abonado` ni `pendiente`.
  - `LEEME.md`:
    - qué recibe y devuelve cada Code;
    - la configuración de los triggers (campos y tipos), los IF, los 2 `GET`, los 2 Send Email y las Settings (sin Error workflow);
    - el cambio del `08` paso a paso, con el texto actual copiado de `workflows/08-error-workflow.json`;
    - los JSON de pin data de la sección 7 y los dibujos de las conexiones.
  - El agente consultó con n8n-mcp:
    - Execute Workflow Trigger: Workflow Input Schema, Input data mode;
    - Execute Workflow: Workflow Inputs; un campo quitado llega como `null`; Wait For Sub-Workflow Completion;
    - HTTP Request: Include Response Headers and Status.
  - En el backend comprobó:
    - el `detail` del `401` («Falta la cabecera X-API-Key o no es válida») y del `404` («Apartado no encontrado»);
    - que `q` y `estado` vacíos no filtran.
- **Prueba en local (agente):** con `node`, `GET` reales a la API (la clave leída del `.env` sin imprimirla) y la salida del HTTP Request simulada como un item `{ statusCode, body }`.
  - **`Buscar apartado`:**
    - `id` 22 → 1 (vencido, salida sin `abonos` ni `vale`);
    - `id` 22 + `activo` → 0;
    - `id` 9999 → 0 (`404`);
    - «Carmen Ruiz» → 1;
    - `600000001` → igual que `600 000 001`;
    - «Nadie Inventado» → 0;
    - `estado` `activo` → 20, igual que `/api/apartados/resumen`;
    - `id` `#7` con `texto` → manda el `id`.
  - **Errores (Code 1 y 3):**
    - sin campos, `estado` «pagado», `id` -3 y «doce» → error;
    - clave mal → «Buscar apartado: la app respondió 401: Falta la cabecera X-API-Key o no es válida»;
    - `para` vacío, sin `@` o `null`, `asunto` vacío y sin cuerpo → error con el mensaje de la spec.
  - Coincide con la sección 7.
- **Problemas encontrados:**
  - **Teléfono repetido en la app.** El seed usa el formato `600 000 001`, como dice la spec. Pero `600000001` da 2 resultados: el apartado 1 y el 27, un apartado de prueba creado a mano con el mismo teléfono. La sección 7 no da un número fijo, así que sigue valiendo.
  - **`q=12` en los datos actuales.** Solo da el apartado 12, porque su teléfono `600 000 012` también contiene `12`. El riesgo de la spec sigue siendo real con otros teléfonos (por ejemplo, los `612 345 ...` del Excel).
  - **El ejemplo de salida de la spec** (Laura Ortega, `pendiente` 45) es ilustrativo: en la app el apartado 12 tiene `pendiente` 10. La forma es correcta y no se cambió.
  - **Una sola petición por ejecución** (detectado en la revisión de la pareja, antes de construir).
    - Los 4 Code leen solo `$input.first()` y `$('Comprobar la notificación').first()`.
    - Si un flujo llamara con el Execute Workflow en **Run once with all items** y varios items (por ejemplo, el flujo 6 con un recordatorio por cliente), solo se enviaría el primer correo y los demás se perderían sin error.
    - **Se resolvió con una regla, sin cambiar los Code:** cada llamada es una sola petición y el Execute Workflow que llama usa siempre **Mode: Run once for each item**. Se añadió:
      - en la spec, a las secciones 3, 4.4 (el `08` pasa a Run once for each item), 6 (el caso y qué pasaría) y 7 (una prueba con un flujo de prueba no exportado: 2 items, 2 correos);
      - a `AGENTS.md`, sección 8;
      - al `LEEME.md`.
  - **Pendiente de comprobar al construir:**
    - que con Include Response Headers and Status una lista llegue en un item (el Code también acepta varios);
    - cómo llega un campo sin rellenar del Execute Workflow;
    - si hay que publicar el sub-workflow;
    - que el error del sub-workflow llegue al `08`.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

#92: vamos a construir a mano en n8n `10 · Buscar apartado`, `10 · Enviar notificación` y el cambio del `08 · Error Workflow`, siguiendo `specs/10-sub-workflows.md`. Tú escribes solo el JavaScript de los 4 nodos Code; la pareja crea los demás nodos y pega tu código. Usa exactamente los nombres de nodo de la spec.

## Fuentes

- `specs/10-sub-workflows.md` (secciones 3, 4, 6 y 7), `specs/08-error-workflow.md`, `workflows/08-error-workflow.json` (texto actual del aviso), `AGENTS.md`.
- `backend/routes/apartados.py` y `backend/models/apartado.py`: forma de la respuesta de `GET /api/apartados` y `GET /api/apartados/{id}`, y el `detail` de los errores.
- n8n-mcp (n8n 2.4.5): Execute Workflow Trigger 1.3 con «Define using fields below» (cómo llegan los campos vacíos: `null`, `""` o ausentes), Execute Workflow 1.4 (Workflow Inputs, Wait For Sub-Workflow Completion), HTTP Request con Include Response Headers and Status + Never Error (forma de `body` cuando la API devuelve una lista: ¿un item con la lista o un item por elemento?), salida del Send Email (`messageId`), y Pin data en un trigger.
- Como ejemplo de estilo: `~/hu08/` y `~/hu10-codigo/` (Code y `LEEME.md`).

## Contenido

1. En `~/subflujos/` (fuera del repo, no se sube):
   - `1-comprobar-la-busqueda.js`, `2-preparar-resultado.js` (`10 · Buscar apartado`).
   - `3-comprobar-la-notificacion.js`, `4-preparar-respuesta.js` (`10 · Enviar notificación`).
   - Comentarios cortos en español, sin librerías externas, sin recalcular `abonado` ni `pendiente`. Mensajes de error exactamente como en la spec.
   - `LEEME.md`: qué recibe y qué devuelve cada Code (con un ejemplo corto); la configuración exacta de los demás nodos de los dos sub-workflows (trigger con sus campos y tipos, IF, los 2 `GET`, los 2 Send Email, Settings sin Error workflow); el cambio del `08` paso a paso (qué nodo se borra, el Execute Workflow con sus Workflow Inputs y el texto actual copiado del JSON); y los JSON de pin data de la sección 7 listos para pegar. Con un dibujo de las conexiones de cada uno.
2. Comprueba la lógica en local con node: haz `GET` a la API (con la clave del `.env`, sin imprimirla) para los casos de `Buscar apartado` de la sección 7, simula la salida del HTTP Request con Never Error y ejecuta los Code 1 y 2. Prueba también los casos de error de los Code 1 y 3. Dime los resultados. Si la API no devuelve lo que dice la spec (por ejemplo, el formato del teléfono de los datos de ejemplo), dímelo.
3. `specs/10-sub-workflows.md`: solo si algo de la sección 4 no coincide con lo que has visto en el backend o en n8n-mcp, corrígelo y dime qué.
4. `docs/ai-log.md`: entrada «### Código de los nodos Code · #92 (`specs/10-sub-workflows.md`)» con el formato habitual (reparto: la pareja construye los nodos, el agente escribe el código) y este prompt literal en un bloque `<details>`.

## Límites

- No toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`.
- Solo `GET` a la API, nunca `POST`. No escribas la clave en ningún fichero ni en la salida.
- No añadas `.DS_Store` ni `workflows/09-migracion-excel.json`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

### Construcción de los sub-workflows · #92 (`workflows/10-*.json`, `workflows/08-error-workflow.json`)

- **Autora:** Esra
- **Tarea:** construir y probar en n8n `10 · Buscar apartado`, `10 · Enviar notificación` y el cambio del `08 · Error Workflow` según `specs/10-sub-workflows.md`, y exportarlos.
- **Resultado:**
  - La pareja construyó a mano en n8n los nodos que no son Code y pegó el código de los 4 Code. Cada sub-workflow tiene 6 nodos con los nombres de la spec, sin Error workflow. Los 4 Code del JSON exportado son idénticos a `~/subflujos/*.js`.
  - En el `08`, `Avisar a la tienda del error` pasa a ser un Execute Workflow a `10 · Enviar notificación`, con **Mode** Run once for each item (`"mode": "each"`) y Wait For Sub-Workflow Completion.
  - Los tres JSON pasan `validate_workflow` de n8n-mcp sin errores ni avisos.
  - **Pruebas** (datos de ejemplo, pin data en el trigger):
    - **`Buscar apartado`:**
      - `id` 22 da el apartado de Beatriz Medina (`vencido`, `abonado` 25, `pendiente` 14.9), sin `abonos` ni `vale`. Con `estado` `activo`, `total` 0.
      - `id` 9999 da `total` 0, con el `404` en verde.
      - «Carmen Ruiz» da el apartado 1, igual que `GET /api/apartados?q=Carmen Ruiz`, y también con `estado` `activo`.
      - `600000001` da los apartados 1 y 27. En la API, sin espacios da 0 y con espacios da 2: lo resuelve la normalización del teléfono.
      - «Nadie Inventado» da `{ total: 0, apartados: [] }`.
      - `estado` `activo` da 20, igual que el `resumen`.
      - `{}` y `estado` `pagado` paran con el error de la spec.
    - **`Enviar notificación`:** llegan el correo HTML («Hola» en negrita) y el de texto. Sin `para`, error y no llega nada.
    - **`08`** (`curl` de HU-05 con `error-email-espacio.json` a la Production URL): llega el aviso con el flujo, el paso `Enviar confirmación al cliente`, «No recipients defined» y el enlace a la ejecución 71, sin firma.
    - **Varios items:** con Run once for each item, 2 sub-ejecuciones, 2 correos y dos `messageId` distintos. Con Run once with all items, 1 correo y ningún error, como dice la spec. Se volvió a Run once for each item.
    - **`401`:** no se hizo; obligaba a crear una credencial falsa. El camino de error está en `Preparar resultado`.
  - Lo pendiente de comprobar del código, después de construir:
    - **Publicar:** los dos sub-workflows están publicados (`"active": true`).
    - **Error del sub-workflow en el `08` del que llama:** comprobado en #95 (ver «Construcción del flujo 1 con `Enviar notificación` · #95»).
    - **Respuesta del HTTP Request y campos vacíos:** todas las pruebas dieron lo esperado. El código acepta las dos formas, así que no hizo falta mirar cuál llega.
  - Esta vez no hizo falta `git restore` del `01` tras exportar: la rama ya tiene `dev` con #159, #160 y #161 fusionados.
- **Problemas encontrados:**
  - **Saltos de línea del `08`.** La primera vez el aviso llegó en una sola línea. Los campos de **Workflow Inputs** son de una línea, y al pegar el texto o pulsar Enter se pierden los saltos. Se resolvió escribiendo `texto` como expresión con `\n`. La spec (4.4) y el `LEEME.md` lo recogen.
  - **Firma de n8n en `Enviar correo de texto`.** Faltaba desactivar **Append n8n Attribution** en ese nodo. Se desactivó y se repitió la prueba.
  - **`callerPolicy` oculto.** «This workflow can be called by» no aparece en Settings en n8n 2.4.5 community. Los JSON exportados tienen `callerPolicy: workflowsFromSameOwner`, el valor por defecto que pedía la spec. La sección 1 de la spec lo recoge.
- **Decisión:** aceptado. La fila del `08` en `AGENTS.md` (sección 8) pasa a «Tomada».
- No hay prompt: los flujos los construyó la pareja a mano.

### Spec del flujo 1 con `Enviar notificación` · #95 (`specs/01-eventos-tienda.md`)

- **Autora:** Esra
- **Tarea:** #95 (parte de #92): spec y valores para pegar para que los 2 correos del flujo 1 (`Enviar confirmación al cliente` y `Avisar a la tienda: sin email`) se envíen con `10 · Enviar notificación`. Es el ejemplo de uso. Solo documentación; la pareja cambia los nodos a mano en n8n.
- **Resultado:**
  - **`~/subflujos/LEEME-95.md`** (fuera del repo):
    - pasos para cambiar cada Send Email por un Execute Workflow con el mismo nombre y las mismas conexiones (Mode Run once for each item, Wait For Sub-Workflow Completion);
    - los Workflow Inputs `para`, `asunto` y `texto` de cada nodo, cada uno en su bloque;
    - las 3 pruebas con sus `curl`.
  - **`texto` como una sola expresión de una línea con `\n`**, como el del `08`, con `toFixed(2)`, la fecha `dd/MM/yyyy` y `|| 'sin teléfono'` entre paréntesis.
  - **Comprobado en local con node y Luxon:** con `apartado.creado.json` y `apartado.creado-sin-email.json`, las expresiones nuevas dan **exactamente** el mismo `para`, `asunto` y `texto` que las plantillas actuales de `workflows/01-eventos-tienda.json`.
  - **`specs/01-eventos-tienda.md`:**
    - nota de alcance;
    - pasos 4 y 5 con los Execute Workflow y sus valores;
    - sección 6: los casos de `email` `" "` y de importes que faltan;
    - sección 7: las pruebas de #95.
  - **`specs/08-error-workflow.md`, sección 7:** con el cambio, la prueba de HU-05 ya no falla en el Send Email («No recipients defined»). Falla en `Comprobar la notificación` del sub-workflow («Enviar notificación: falta `para`»). El `08` avisa con el paso `Enviar confirmación al cliente`; el texto exacto del error queda a comprobar.
  - **`specs/10-sub-workflows.md`:**
    - en la sección 4.3, el flujo 1 va «en la PR de #95 (ejemplo)» y los demás Send Email del `01`, el `07` y el `09` «se quedan con Send Email (opcional)», con el porqué;
    - en la sección 8, el flujo 1 queda sin marcar hasta probarlo.
- **Problemas encontrados:**
  - **`error-email-espacio.json` no trae `precio`, `abonado` ni `pendiente`.** En local, la expresión nueva de `texto` lanza `TypeError` en el `.toFixed(2)`.
    - Con el Send Email, n8n dejaba vacío ese trozo de la plantilla y seguía hasta «No recipients defined». Lo dicen la spec del `08` («las expresiones de n8n con campos que faltan dan texto vacío») y el resultado real de HU-05.
    - Lo esperado ahora es que deje vacío todo el `texto` y que el sub-workflow pare por `para`, que comprueba primero.
    - Si n8n hiciera fallar el Execute Workflow por la expresión, el `08` avisaría igual, pero el error no vendría del sub-workflow y lo pendiente de #92 no quedaría comprobado. Queda **a comprobar** en la prueba.
  - **Diferencia con datos incompletos.** Un campo `null` sale como `null` en la expresión nueva y en blanco en la plantilla antigua. Si falta un importe, antes llegaba un correo con campos vacíos; ahora (a comprobar) el sub-workflow para con error y avisa el `08`. Con los payloads de prueba completos no hay diferencia.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

#95 (parte de #92): como ejemplo de uso, el **flujo 1** del `01 · Eventos de la tienda` pasa a enviar sus 2 correos con el sub-workflow `10 · Enviar notificación`, en lugar de sus 2 nodos Send Email: `Enviar confirmación al cliente` y `Avisar a la tienda: sin email`. La pareja cambiará los nodos a mano en n8n; tú preparas la spec y los valores exactos para pegar. Estamos en la rama `feature/95-sub-workflows-en-01` (sale de `dev`, que ya tiene #159, #160, #161 y #162).

**Alcance:** solo esos 2 nodos. Los flujos 2 y 4 del `01`, el `07` y el `09` se quedan con su Send Email; los flujos 3 y 6 son de Beste. #95 sigue abierta (`Refs #95`). Se elige el flujo 1 porque la prueba de HU-05 (`error-email-espacio.json`) pasa por `Enviar confirmación al cliente`: así se comprueba también que un error del sub-workflow lo avisa el `08` del flujo que llama (pendiente en `docs/ai-log.md`, #92).

## Fuentes

- `workflows/01-eventos-tienda.json` (los 2 Send Email del flujo 1).
- `specs/01-eventos-tienda.md`, `specs/08-error-workflow.md`, `specs/10-sub-workflows.md` (secciones 3, 4.3 y 4.4), `workflows/10-enviar-notificacion.json`, `workflows/08-error-workflow.json` (cómo quedó su Execute Workflow), `AGENTS.md`, `docs/ai-log.md`.
- `tests/payloads/` (los de `apartado.creado` con y sin email, y `error-email-espacio.json`).

## Contenido

1. `~/subflujos/LEEME-95.md` (fuera del repo), para la pareja:
   - Pasos para cada uno de los 2 nodos: borrar el Send Email, añadir un **Execute Workflow** con **el mismo nombre** y las mismas conexiones, **Source** Database, **Workflow** `10 · Enviar notificación` (From list), **Mode** Run once for each item, **Options → Wait For Sub-Workflow Completion** activado.
   - Para cada nodo, los **Workflow Inputs** `para`, `asunto` y `texto` listos para pegar (`html` vacío). Los campos de Workflow Inputs son de **una sola línea**: `texto` tiene que ser **una sola expresión en una línea** con `\n` (como el `texto` del `08`). El correo tiene que quedar **igual** que el de ahora (mismas líneas, `toFixed(2)`, fecha `dd/MM/yyyy`, `|| 'sin teléfono'`).
   - Cada valor en su propio bloque de código, para copiarlo de uno en uno.
   - Las pruebas (abajo) con los `curl` exactos.
2. **Comprueba los textos con node**: para cada nodo, evalúa la expresión nueva y la plantilla actual del JSON con el payload de prueba que le toca (simula `$json` y `DateTime` de Luxon si no está instalado, sin instalar nada en el repo) y confirma que dan **exactamente** el mismo texto. Dime el resultado.
3. `specs/01-eventos-tienda.md`: los 2 nodos del flujo 1 pasan a ser Execute Workflow a `10 · Enviar notificación`; el resto igual. Nota de alcance de esta versión.
4. `specs/08-error-workflow.md`, sección 7: con el cambio, el `email` `" "` ya no falla en el Send Email sino en `Comprobar la notificación` del sub-workflow («Enviar notificación: falta `para`»). Escribe qué se espera ahora (el `08` avisa con el paso `Enviar confirmación al cliente` del `01` y el mensaje que llegue del sub-workflow; si no sabes el texto exacto que pone n8n, déjalo como «a comprobar»).
5. `specs/10-sub-workflows.md`: sección 4.3, el flujo 1 «en la PR de #95 (ejemplo)» y los demás nodos del `01`, el `07` y el `09` «se quedan con Send Email (opcional)», con el porqué. Sección 8: el criterio del flujo 1 sin marcar hasta probarlo.
6. `docs/ai-log.md`: entrada «### Spec del flujo 1 con `Enviar notificación` · #95 (`specs/01-eventos-tienda.md`)» con el formato habitual y este prompt literal en un bloque `<details>`.

## Pruebas (ponlas en la spec del `01`, sección 7, y en `LEEME-95.md`)

- Flujo 1 con email: llega la confirmación al cliente, igual que antes.
- Flujo 1 sin email: llega el aviso a la tienda, igual que antes.
- HU-05 con `error-email-espacio.json` a la Production URL: llega el aviso del `08`.
- En cada correo: remitente `tienda@pasofirme.example`, sin firma de n8n, saltos de línea correctos.

## Límites

- No toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`. No llames a la API.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

### Construcción del flujo 1 con `Enviar notificación` · #95 (`workflows/01-eventos-tienda.json`)

- **Autora:** Esra
- **Tarea:** cambiar en n8n los 2 nodos de la rama HU-01 del `01` (`Enviar confirmación al cliente` y `Avisar a la tienda: sin email`) por Execute Workflow a `10 · Enviar notificación`, según `specs/01-eventos-tienda.md`, probarlo y exportarlo.
- **Resultado:**
  - La pareja cambió los 2 Send Email por Execute Workflow con el mismo nombre y las mismas conexiones, y pegó los valores de `~/subflujos/LEEME-95.md`.
  - El JSON exportado solo cambia en esos 2 nodos (conexiones y settings iguales). Lleva Mode `each`, y los dos `texto` son idénticos a las expresiones comprobadas en local.
  - Wait For Sub-Workflow Completion queda en su valor por defecto (activado), por eso no aparece en `options`.
  - `validate_workflow` de n8n-mcp: válido, 14 nodos, sin errores ni avisos.
  - **Pruebas:**
    - **Con email** (`apartado.creado.json`, Test URL): llega a `carmen@example.com` «Tu apartado en Paso Firme: Botín piel marrón», desde `tienda@pasofirme.example`, sin firma y con el texto idéntico al de antes.
    - **Sin email** (`apartado.creado-sin-email.json`, Test URL): llega a la tienda «Apartado 26 sin email: no se envió la confirmación», idéntico al de antes.
    - **HU-05** (`error-email-espacio.json`, Production URL): 3 ejecuciones:
      - el `01` (100) en error en `Enviar confirmación al cliente`;
      - `10 · Enviar notificación` (101) en error en `Comprobar la notificación`, «falta `para`»;
      - el `08` (102) correcto: avisa con el paso `Enviar confirmación al cliente` y el enlace a la 100.
  - Queda comprobado lo pendiente de #92: un error dentro de un sub-workflow hace fallar el nodo que lo llama, y lo avisa el `08` del flujo que llama.
- **Lo observado:**
  - **Mensaje genérico.** n8n no pasa el mensaje del sub-workflow al nodo que lo llama. El Execute Workflow falla con «Error executing workflow with item at index 0», y es lo que dice el aviso del `08`. El motivo real solo se ve en la sub-ejecución. Las specs `01` (sección 7), `08` (sección 7) y `10` (sección 6) explican cómo encontrarla.
  - **Payload incompleto.** Con `error-email-espacio.json` (sin `precio`), el sub-workflow recibió `{ "para": "{{ $json.body.datos.email }}", "asunto": "Tu apartado en Paso Firme: ", "html": null }`.
    - **Sin `texto`:** el `.toFixed(2)` no se pudo calcular y n8n no pasó el campo.
    - **`para` sin resolver:** llegó como el texto literal de la expresión. No sabemos por qué: la configuración es correcta y con el payload completo se resolvió.
    - El error salió del sub-workflow, no de la expresión del `01`. Ya no se envía un correo con campos vacíos, como pasaba con el Send Email.
- **Decisión:** aceptado. #95 sigue abierta (`Refs #95`): faltan los flujos 3 y 6 (Beste); el flujo 2 se queda con Send Email (opcional).
- No hay prompt: los nodos los cambió la pareja a mano.

### Spec del datáfono · HU-13 (`specs/11-datafono.md`)

- **Autora:** Esra
- **Tarea:** HU-13 (#110), variante *Datáfono*: spec de un flujo que importa cada noche el CSV de cobros con tarjeta como ventas sin duplicar, y un CSV de ejemplo. Solo documentación; el flujo lo construye después la pareja.
- **Resultado:**
  - **`data/datafono_ejemplo.csv`:**
    - 10 cobros del 21/10/2026, con separador `;`, decimales con coma y la tarjeta enmascarada, sin nombres;
    - 2 cobros coinciden con ventas `tarjeta` reales del seed (253 y 254);
    - 4 no están en la app: uno coincide en importe con una venta `efectivo`, y otro es un segundo 18,95 del mismo día;
    - 1 es una venta grande;
    - hay una `DENEGADA`, una `ANULADA`, una `DEVOLUCION` y una fila sin importe.
  - **Numeración:** `11 · Datáfono`, porque no es uno de los flujos 1–8 del README y el `09` y el `10` están ocupados. `scripts/flujos.py` lo exportaría como `11-datafono.json`. Añadido a `AGENTS.md` (sección 5).
  - **Origen del CSV:** se compararon cuatro opciones (carpeta de n8n, formulario, correo con adjunto, carpeta del repo montada). Se elige un Schedule Trigger de lunes a sábado a las 22:00, más Read/Write Files from Disk en `/home/node/.n8n-files/datafono/`, la carpeta que n8n 2.x permite por defecto. El CSV se copia ahí con `docker compose cp`. Un Form Trigger sirve para las pruebas, como en el `09`.
  - **Regla de duplicados:** la app no guarda el nº de operación.
    - Una venta con `concepto` `Datáfono op. <operacion>` de la misma `fecha` reconoce lo ya importado.
    - El resto se cuenta por `fecha` + `importe` contra las ventas `tarjeta` apuntadas a mano.
    - Se comprobó en local con un script de Python sobre el CSV y las ventas reales del 21/10/2026, leídas de la base de datos en solo lectura (`mode=ro`), sin llamar a la API. La 1.ª ejecución crea 4 ventas (208.75 €), con 2 ya registradas y 4 no importadas. La 2.ª, simulada con esas 4 ventas añadidas, no crea nada.
  - **HU-09:** las ventas creadas disparan `venta.registrada`. La de 129,90 € genera el aviso de venta grande, y se da por esperado.
  - **Informe** a la tienda con `Enviar notificación` (Mode Run once for each item). Lleva aviso propio si una noche no llega el fichero.
  - Cuatro decisiones nuevas en `AGENTS.md`, sección 8.
  - **Consultas a n8n-mcp:**
    - Read/Write Files from Disk 1.1: File(s) Selector, Put Output File in Field;
    - Extract From File: opción Delimiter;
    - Schedule Trigger: intervalo cron.
- **Problemas encontrados:**
  - **Las issues no son de esta variante.** #110 y sus sub-issues #112–#114 describen *Apartados desde casa*. Se proponen títulos nuevos (fuera del repo, para que la pareja decida).
  - **Acceso a ficheros sin confirmar.** n8n-mcp no documenta `N8N_RESTRICT_FILE_ACCESS_TO`: solo avisa de que el nodo lee bajo `/home/node/`. Que `~/.n8n-files` sea la carpeta permitida por defecto en n8n 2.x queda **a comprobar al construir**. También queda por comprobar qué hace el nodo si el fichero del día no existe.
  - **La carpeta no es persistente.** `/home/node/.n8n-files` no está en un volumen, y montarla obliga a cambiar `docker-compose.yml`. Queda como pregunta en la spec; no se ha cambiado.
  - **Versión de n8n.** `n8n --version` en el contenedor da **2.44.5**, no la 2.4.5 que dicen los documentos. La imagen de `docker-compose.yml` no fija versión, así que cambia al actualizarla.
  - **Las pruebas cambian los datos.** Las 4 ventas creadas en el 21/10/2026 cambian el cierre de ese día y el informe de octubre de HU-08. Está anotado en la spec.
  - **Orden con el cierre diario.** El flujo 5 todavía no tiene spec. El datáfono tiene que ir antes que el cierre; queda como pregunta.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

HU-13 (#110, nivel Avanzado), variante **Datáfono**: «cada noche se importa el CSV de cobros con tarjeta como ventas, sin duplicar las ya registradas». El README pide al menos una de las dos variantes; hacemos solo esta (la de «apartados desde casa» queda fuera). Escribe la spec y un CSV de ejemplo. La pareja construirá el flujo a mano en n8n después; ahora solo la spec. Estamos en la rama `feature/hu-13-datafono` (sale de `dev`).

## Fuentes

- README (HU-13 y lo que diga del datáfono), `AGENTS.md`, `docs/ontologia.md` (Venta), `docs/guia-de-la-app.md`, `specs/_plantilla.md`.
- `backend/routes/ventas.py`, `backend/models/venta.py` y el servicio de ventas: qué acepta `POST /api/ventas` (incluida `fecha`), qué devuelve `GET /api/ventas` (filtros por fecha, paginación) y qué webhook envía al registrar.
- Cómo se hizo algo parecido: `specs/09-migracion-excel.md` y `workflows/09-migracion-excel.json` (CSV con Form Trigger + Extract From File, carga idempotente, informe a la tienda) y `specs/07-informe-mensual.md` (Schedule Trigger + Form Trigger de prueba).
- `specs/01-eventos-tienda.md` (rama HU-09: cada venta registrada por API dispara `venta.registrada` y, si supera el umbral, un aviso de venta grande).
- `specs/10-sub-workflows.md` (`Enviar notificación`, regla Run once for each item).
- n8n-mcp (n8n 2.4.5 community): Schedule Trigger, Form Trigger con archivo, Extract From File, **Read/Write Files from Disk** (qué rutas puede leer n8n 2.x por defecto, `N8N_RESTRICT_FILE_ACCESS_TO`, `~/.n8n-files`).
- Issues: `gh issue view 110` y sus sub-issues #111–#115 (están pensadas para la otra variante).

## Contenido

1. **CSV de ejemplo** `data/datafono_ejemplo.csv`: el formato típico de un extracto de datáfono (por ejemplo `fecha`, `hora`, `importe`, `operacion`, `tarjeta` enmascarada `**** 1234`, `estado`). Sin nombres de personas. 6–10 filas pensadas para las pruebas:
   - cobros que **no** están en la app (se crean);
   - cobros que **ya** están en la app como venta `tarjeta` del mismo día e importe (no se duplican); usa ventas reales de los datos de ejemplo (`GET /api/ventas` en Swagger no: no llames a la API; léelas del seed en `backend/`);
   - una fila no válida o anulada/devuelta (qué se hace con ella);
   - dos cobros iguales el mismo día (cómo se cuentan).
   Pon fechas que existan en el seed para que la comprobación de duplicados tenga algo que encontrar.
2. `specs/NN-datafono.md` con la plantilla (`NN` según la numeración que decidas abajo). Decide y explica (y llévalo a `AGENTS.md`, sección 8):
   - **Numeración:** el README numera los flujos 1–8; mira si el datáfono es un flujo del README o no, y sigue la convención de `AGENTS.md`, sección 5 (el `09` es la migración y el `10` los sub-workflows). Propón nombre del workflow y del archivo.
   - **De dónde sale el CSV «cada noche»:** compara las opciones sin tocar `docker-compose.yml` si se puede (por ejemplo, Schedule Trigger + Read Files from Disk en una carpeta que n8n 2.x ya permite, con el CSV copiado ahí con `docker cp`; o Form Trigger para subirlo a mano) y elige. Si alguna opción obliga a cambiar `docker-compose.yml`, dilo como pregunta para la pareja, no lo cambies. Para probar, un Form Trigger con el CSV (como el `09`).
   - **Cómo se detecta un duplicado:** la app no guarda el número de operación. Define la regla (por ejemplo, misma `fecha`, mismo `importe` y `forma_pago` `tarjeta`, contando cuántas hay de cada en la app y en el CSV) y qué `concepto` lleva la venta creada (que permita reconocerla después, por ejemplo con el número de operación). Que una segunda ejecución con el mismo CSV no cree nada.
   - **Qué venta se crea:** `POST /api/ventas` con `fecha` del cobro, `forma_pago` `tarjeta`, `importe` y `concepto`.
   - **Efecto en HU-09:** cada venta creada dispara `venta.registrada`; las que superen el umbral generarán un aviso de venta grande. Di si es lo esperado o no y qué se hace.
   - **Informe a la tienda** al terminar (creadas, ya existían, no válidas), con `Enviar notificación` (Execute Workflow, Run once for each item).
   - Casos de error (CSV vacío o con columnas que faltan, `401`, `422`) y cómo llegan al `08`.
   - Prueba: primera ejecución (qué se crea, con cifras), segunda ejecución con el mismo CSV (0 creadas), CSV con una fila mal; cómo comprobarlo en la app.
   - Criterios de aceptación: los de README/#110 para el datáfono.
   - Evidencias previstas con nombres de archivo.
3. Propuesta (solo texto en tu respuesta, no lo hagas) de nuevos títulos para las sub-issues #112, #113 y #114, que hoy describen la otra variante.
4. `docs/ai-log.md`: entrada «### Spec del datáfono · HU-13 (`specs/NN-datafono.md`)» con el formato habitual y este prompt literal en un bloque `<details>`.

## Límites

- Solo la spec y el CSV: no toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`. No llames a la API.
- Usa solo campos de `docs/ontologia.md` para la Venta; las columnas del CSV son del datáfono, no de la app.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado y qué decisiones has tomado.
```

</details>

### Código de los nodos Code · HU-13 (`specs/11-datafono.md`)

- **Autora:** Esra
- **Tarea:** escribir el JavaScript de los 3 nodos Code de `11 · Datáfono` (`Revisar los cobros`, `Decidir qué crear`, `Preparar informe`) y un `LEEME.md` con la configuración de los demás nodos. **Reparto:** la pareja construye los nodos en n8n y pega el código; el agente solo escribe el código.
- **Resultado:**
  - **`~/hu13/`** (fuera del repo): `1-revisar-los-cobros.js`, `2-decidir-que-crear.js`, `3-preparar-informe.js` y `LEEME.md`.
    - El `LEEME.md` lleva qué recibe y qué devuelve cada Code, la configuración de los demás nodos y el esquema de conexiones.
    - Los Workflow Inputs de los 2 Execute Workflow van listos para pegar, en una línea.
    - Incluye los comandos `docker compose` para la carpeta y cómo hacer cada prueba.
  - Mismos patrones que HU-10:
    - `{ cuerpo: null }` cuando no hay nada que crear;
    - `isExecuted` con `try/catch` para leer `Registrar ventas`;
    - respuestas del `POST` con Never Error, emparejadas por orden;
    - `detail` de la app en los `422`.
  - `Revisar los cobros` sabe qué disparador se ejecutó con `$('Subir el CSV del datáfono').isExecuted`.
  - **Prueba en local con node:**
    - `GET /api/ventas?desde=2026-10-21&hasta=2026-10-21` real, con la clave del `.env` sin imprimirla;
    - el CSV leído como lo daría Extract From File (texto, con y sin Include Empty Cells);
    - los `POST` simulados.
    - **Prueba 1:** 4 creadas (004513, 004515, 004516, 004517; 208.75 €), 2 ya registradas (ventas 253 y 254) y 4 no importadas. Asunto «Datáfono del 21/10/2026: 4 ventas creadas».
    - **Prueba 2** (la app ya tiene las 4 ventas `Datáfono op. …`): 0 creadas, 4 ya importadas.
    - **Prueba 3** (mes 13 en la línea 4): `fila no válida (fecha)`, 0 creadas. En una base limpia serían 3 (163.75 €).
    - **Prueba 4** (sin `estado`): error «Datáfono: faltan columnas en el CSV: estado».
    - **Otros casos:**
      - un `422` va a «Rechazadas por la app» y el flujo sigue;
      - un `401` en el `POST` para con el código y el `detail`;
      - un CSV con solo la cabecera da «0 ventas creadas»;
      - el BOM se quita;
      - con separador `,`, falla con las 4 columnas que faltan;
      - una venta `tarjeta` sin cobro sale en su sección del informe.
- **Problemas encontrados:**
  - **Celdas vacías.** Según n8n-mcp, en Extract From File la opción **Include Empty Cells** viene desactivada, y una celda vacía no llega como `""`: esa columna no aparece en el item. Se añadió a la spec (paso 3) activarla, y el Code comprueba las columnas con la unión de todas las filas, así que funciona de las dos formas.
  - **BOM.** Extract From File tiene la opción **Exclude Byte Order Mark (BOM)**, desactivada por defecto. Se añadió a la spec activarla; el Code también quita el BOM.
  - **Una fila por operación.** El código supone que cada operación sale una vez con su estado final. Si un datáfono pusiera la anulación en otra fila con el mismo nº de operación, se importaría la `APROBADA` y la anulación saldría como no importada.
  - **Comprobado al construir:** sin fichero, Read/Write Files from Disk no se pone en rojo y llega al IF un item vacío; la carpeta `/home/node/.n8n-files/` se lee sin cambiar variables; `$binary.datafono` funciona en el IF (ver «Construcción del flujo · HU-13»).
  - **Versión de n8n.** El prompt sigue diciendo n8n 2.4.5; el contenedor da 2.44.5 (ver «Spec del datáfono · HU-13»).
- **Decisión:** aceptado. Los 3 Code del JSON exportado son idénticos a `~/hu13/*.js`.

<details><summary>Prompt</summary>

```text
## Tarea

HU-13 (Datáfono): vamos a construir a mano en n8n `11 · Datáfono` siguiendo `specs/11-datafono.md`. Tú escribes solo el JavaScript de los 3 nodos Code (`Revisar los cobros`, `Decidir qué crear`, `Preparar informe`); la pareja crea los demás nodos y pega tu código. Usa exactamente los nombres de nodo de la spec.

## Fuentes

- `specs/11-datafono.md` (secciones 3, 4, 5, 6 y 7), `data/datafono_ejemplo.csv`, `AGENTS.md`.
- Ejemplo de estilo y patrones ya probados: `workflows/09-migracion-excel.json` y `~/hu10-codigo/` (Code, `LEEME.md`, `isExecuted`, salida del HTTP Request con Never Error, `{ cuerpo: null }`), `~/hu08/`, `~/subflujos/LEEME.md` y `~/subflujos/LEEME-95.md` (Execute Workflow a `10 · Enviar notificación`, Workflow Inputs de una línea).
- `backend/routes/ventas.py`, `backend/schemas/venta.py`, `backend/models/venta.py`: forma de `GET /api/ventas` y de la respuesta de `POST /api/ventas`, y el `detail` de los `422`.
- n8n-mcp (n8n 2.4.5): Extract From File (CSV con `;`: ¿los valores llegan como texto? ¿qué pasa con el BOM y las columnas vacías?), Read/Write Files from Disk (qué devuelve si el fichero no existe), Form Trigger con archivo (nombre del campo binario), Schedule Trigger, y cómo saber en un Code qué disparador se ejecutó (`$('Subir el CSV del datáfono').isExecuted`).

## Contenido

1. En `~/hu13/` (fuera del repo, no se sube):
   - `1-revisar-los-cobros.js`, `2-decidir-que-crear.js`, `3-preparar-informe.js`.
   - Comentarios cortos en español, sin librerías externas. Mensajes de error exactamente como en la spec.
   - `LEEME.md`: qué recibe y qué devuelve cada Code (con un ejemplo corto); la configuración exacta de los demás nodos (los 2 disparadores, Read Files from Disk, los IF, Extract From File, el `GET`, el `POST`, los 2 Execute Workflow a `10 · Enviar notificación` con sus Workflow Inputs de una línea listos para pegar, Settings con Error workflow `08` y zona horaria); un dibujo de las conexiones; los comandos `docker compose` para crear la carpeta y copiar el CSV; y cómo hacer cada prueba de la sección 7.
2. Comprueba la lógica en local con node: lee `data/datafono_ejemplo.csv` como lo daría Extract From File, haz `GET /api/ventas?desde=2026-10-21&hasta=2026-10-21` (con la clave del `.env`, sin imprimirla), simula las respuestas del `POST` (201 con id inventado, y un 422) y ejecuta los 3 Code. Comprueba:
   - prueba 1: 4 creadas (004513, 004515, 004516, 004517; 208.75 €), 2 ya registradas, 4 no importadas;
   - prueba 2: simula que la app ya tiene esas 4 ventas `Datáfono op. ...` → 0 creadas;
   - prueba 3 (fecha mal) y prueba 4 (sin columna `estado`);
   - el texto del informe completo de la prueba 1.
   Dime los resultados. Si algo de la spec no cuadra con la API o con n8n-mcp, dímelo.
3. `specs/11-datafono.md`: solo si algo de la sección 4 no coincide con lo que has visto, corrígelo y dime qué.
4. `docs/ai-log.md`: entrada «### Código de los nodos Code · HU-13 (`specs/11-datafono.md`)» con el formato habitual (reparto: la pareja construye los nodos, el agente escribe el código) y este prompt literal en un bloque `<details>`.

## Límites

- No toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`.
- Solo `GET` a la API, nunca `POST`. No escribas la clave en ningún fichero ni en la salida.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

### Construcción del flujo · HU-13 (`workflows/11-datafono.json`)

- **Autora:** Esra
- **Tarea:** construir y probar en n8n `11 · Datáfono` según `specs/11-datafono.md`, y exportarlo.
- **Resultado:**
  - La pareja construyó a mano en n8n los nodos que no son Code y pegó el código de los 3 Code. El flujo tiene 13 nodos con los nombres de la spec, Error workflow `08` y zona horaria `Europe/Madrid`. Los 3 Code del JSON exportado son idénticos a `~/hu13/*.js`.
  - El JSON pasa `validate_workflow` de n8n-mcp sin errores. Da un aviso: `Leer ventas de esos días` tiene Execute Once, que es lo que pide la spec.
  - El flujo está publicado (`"active": true`).
  - **Pruebas** (copia de la base de datos en `~/tienda-antes-hu13.db`, restaurada al terminar):
    - **Prueba 1** (formulario, Test URL): «Datáfono del 21/10/2026: 4 ventas creadas».
      - Creadas, por 208.75 €: 004513 → 258, 004515 → 259, 004516 → 261 y 004517 → 260. Los `id` 260 y 261 salieron en otro orden que las operaciones, pero el informe los empareja bien (comprobado en la app).
      - 2 ya registradas (253 y 254), 4 no importadas, 0 rechazadas y 0 sin cobro.
      - Llega «Venta grande: 129.90 €» del `01` con `Datáfono op. 004517`.
      - En la app, 8 ventas el 21/10/2026, 6 con tarjeta.
    - **Prueba 2** (mismo CSV): 0 creadas, 4 ya importadas, 2 ya registradas y 4 no importadas. Sin aviso de venta grande.
    - **Prueba 3** (línea 4 con mes 13): 0 creadas; 004513 como «fila no válida (fecha)»; 3 ya importadas, 2 ya registradas y 5 no importadas.
    - **Prueba 4** (sin `estado`): `Revisar los cobros` en rojo con «Datáfono: faltan columnas en el CSV: estado». Sin correo: por la Test URL no salta el `08`.
    - **Prueba 5** (disparador programado, CSV en `/home/node/.n8n-files/datafono/datafono-2026-10-27.csv`): el informe de la prueba 2 con «(ejecución programada)». La carpeta se lee sin cambiar variables.
    - **Sin fichero del día:** `Leer el CSV del día` no se pone en rojo y devuelve un item vacío; el IF va por false y llega «Datáfono: no ha llegado el CSV del 27/10/2026».
  - Evidencias: los 7 `docs/evidencias/11-hu13-*.png`, enlazados en la sección 7 de la spec.
- **Problemas encontrados:**
  - **Conexión mal.** `Registrar ventas` estaba conectado a `Enviar informe del datáfono` en vez de a `Preparar informe`. Se corrigió antes de probar.
  - **El formulario de prueba solo vale una vez.** Para cada prueba hay que volver a pulsar **Execute workflow** y usar la pestaña nueva.
  - **Dos disparadores.** «Execute step» del Schedule Trigger solo ejecuta ese nodo; para probar la rama programada hay que elegir el disparador en el desplegable de **Execute workflow**.
  - **`docker compose exec n8n rm`** pide confirmación (`y`).
  - **Export del `01`.** El export vuelve a reescribir el `01` con el cambio de #95 (PR #170, sin fusionar); se descartó con `git restore`.
  - **Días del Schedule Trigger.** En el primer export, **Trigger on Weekdays** tenía solo el lunes y el sábado (`"triggerAtDay": [1, 6]`), no de lunes a sábado. Las pruebas no lo podían detectar, porque la rama programada se lanzó a mano. Se corrigió en n8n y se volvió a exportar: ahora es `[1, 2, 3, 4, 5, 6]` (spec, sección 3.2).
  - **On Error en `Leer el CSV del día`.** El JSON exportado tiene On Error → Continue (regular output) además de Always Output Data. La spec (paso 1) recoge la configuración exportada.
- **Decisión:** aceptado. Con los días del Schedule Trigger corregidos, todos los criterios de la sección 8 de la spec están cumplidos.
- No hay prompt: el flujo lo construyó la pareja a mano.

### Spec de vencimientos · HU-07 (`specs/06-recordatorios-vencimientos.md`, `specs/01-eventos-tienda.md`)

- **Autora:** Esra
- **Tarea:** HU-07 (#64, sub-issues #65–#69): spec de las dos partes ya repartidas. **Parte A** (criterios 1 y 3): el `06 · Recordatorios y vencimientos`, solo con la rama de vencimientos. **Parte B** (criterio 2): la rama `apartado.vencido` del `01`, que envía el vale al cliente con `10 · Enviar notificación`. Solo documentación; la pareja construye a mano en n8n. Rama `feature/hu-07-vencidos`, que sale de `feature/95-sub-workflows-en-01` (PR #170).
- **Resultado:**
  - **`specs/06-recordatorios-vencimientos.md`** (nuevo), nodo a nodo:
    - `Cada mañana a las 9:00` (todos los días) y `Probar a mano` (Manual Trigger);
    - `Leer apartados activos` (`Buscar apartado` con `estado` `activo`, Run once for each item);
    - `Elegir los fuera de plazo` (Code: `fecha_limite` < hoy en `Europe/Madrid`, `{ id: null }` si no hay ninguno) y el IF `¿Hay apartados que vencer?`;
    - `Vencer apartado` (`POST /vencer` con Batching 1 y Never Error);
    - `Preparar lista` (Code: `200` vencido, `404`/`422` a la lista, otro código para con error y nombra los ya vencidos);
    - `Enviar lista a la tienda` (`Enviar notificación`).
    - Sección 4.2 para HU-06, «pendiente, Beste», con lo que tiene que saber para compartir el workflow (los disparadores, la lectura y que los dos conjuntos de apartados no se cruzan), sin escribirla.
    - Casos de error, 4 pruebas, criterios y 3 preguntas (validez del vale, hora de apertura, día sin vencidos).
  - **`specs/01-eventos-tienda.md`:** nota de alcance, campos de la rama, pasos 16–18 (`¿Tiene email? (vencido)`, `Enviar vale al cliente`, `Avisar a la tienda: vencido sin email`) con los Workflow Inputs de una línea, salidas, casos de error, pruebas y el criterio 2.
  - **`tests/payloads/apartado.vencido-sin-email.json`** (nuevo): `apartado.vencido.json` con `email` `null`, para la rama No.
  - **`specs/10-sub-workflows.md`, sección 4.3:** el vale al cliente pasa del `06` al `01`.
  - **`AGENTS.md`, sección 8:** 4 filas (el reparto, «Tomada»; la hora y la regla de fuera de plazo, el día sin vencidos y el vencido sin email, «Pendiente de revisión»).
  - **Lo que hace la app al vencer** (`backend/models/apartado.py`): `200` con `{ apartado, vale }` (vale `VALE-<id con 5 cifras>`, `importe` = `abonado`) y el webhook `apartado.vencido`; `422` si no está `activo` («El apartado ya está …») o si hoy ≤ `fecha_limite` («no vence hasta …»); `404` si no existe. Usa `date.today()` con `TZ=Europe/Madrid`.
  - **Datos reales** (`GET /api/apartados?estado=activo`, solo lectura): 20 activos; fuera de plazo el 27/10/2026, el 16 (Paula Ramos), el 15 (Sergio Delgado), el 14 (Marta Molina) y el 13 (Pablo Rubio), como decía el prompt. Los 4 tienen email, así que se esperan 4 correos a clientes, 0 avisos de «sin email» y 1 lista.
  - **Comprobado en local con node y Luxon:**
    - las expresiones de la parte B con `apartado.vencido.json`, con el payload sin email y con los 4 avisos que enviará la app (construidos con el `GET` real y el vale del backend);
    - el filtro y la lista de la parte A con el `GET` real y respuestas de `/vencer` simuladas: los 4 apartados en orden de `fecha_limite`; con un `422` simulado, 3 vencidos y 1 con error; con los activos que quedan después, `{ id: null }`.
- **Decisiones tomadas en la spec:**
  - **Hora y días:** 9:00, todos los días. Por la mañana n8n y la app tienen el mismo «hoy», no se cruza con el datáfono (22:00) ni con el cierre, y los recordatorios de HU-06 no pueden saltarse el domingo.
  - **Fuera de plazo:** `fecha_limite` anterior a hoy. El de hoy no se vence, porque la app daría `422`.
  - **Día sin vencidos:** no se envía nada. La lista es para actuar y un correo diario vacío acaba sin leerse; los fallos los avisa el `08`.
  - **Vencido sin email:** aviso a la tienda con el teléfono y el vale, como HU-01. Un vencimiento ocurre sin el cliente delante.
  - **Error a mitad:** un `401` o `5xx` para el flujo, y el mensaje del `08` lleva los apartados ya vencidos con su vale, para que la tienda no pierda esa lista.
- **Problemas encontrados:**
  - **El payload de prueba no coincide con los datos de ejemplo.** En `apartado.vencido.json`, el 16 tiene talla 39 y fecha límite 18/10/2026; en la app, talla 40 y 23/09/2026. Se anota en la spec del `01`; las pruebas del webhook usan el payload y la de extremo a extremo, los datos reales.
  - **El resultado depende del día de carga del seed.** Con un seed cargado otro día, cambian los apartados fuera de plazo. Desde el 29/10 también saldrían el 11 y el 12 (vencen el 28/10).
  - **Un webhook perdido no se recupera.** Si el `01` no está publicado cuando se vence un apartado, el cliente no recibe el vale. La lista de la tienda lleva el código para avisarle.
  - **La app no dice cómo se usa ni cuánto dura un vale** (`usado` siempre `0`, sin endpoint). El correo no pone caducidad; queda como pregunta.
- **Decisión:** pendiente de revisión por la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

HU-07 · Apartados vencidos con su vale (#64, nivel Medio; sub-issues #65–#69). Escribe la spec. La pareja construirá a mano en n8n después; ahora solo documentación. Rama `feature/hu-07-vencidos`, que sale de `feature/95-sub-workflows-en-01` (PR #170, sin fusionar: el flujo 1 del `01` ya usa `10 · Enviar notificación`).

Criterios (README):
1. Los apartados fuera de plazo se vencen por API y la app genera el vale.
2. El cliente recibe un mensaje con el código y el importe de su vale.
3. Marisa recibe la lista de zapatos que vuelven a la venta.

## Reparto ya decidido

- **Parte A (criterios 1 y 3):** workflow nuevo **`06 · Recordatorios y vencimientos`** (`specs/06-recordatorios-vencimientos.md`, `workflows/06-recordatorios-vencimientos.json`), con **solo la rama de vencimientos**. La rama de recordatorios (HU-06, 7 días y 1 día) la añadirá Beste después **en el mismo workflow**: deja la spec preparada para eso (sección para HU-06 «pendiente, Beste»), sin escribirla.
- **Parte B (criterio 2):** en el `01 · Eventos de la tienda`, la salida `apartado.vencido` del Switch (hoy sin conectar, ver `specs/01-eventos-tienda.md`) envía al cliente su vale con `10 · Enviar notificación` (Execute Workflow, Mode Run once for each item, Workflow Inputs de una línea, como el flujo 1 en #95). Sin email: decide qué hacer (mira cómo lo resuelve el flujo 1) y justifícalo.

## Fuentes

- README (HU-06, HU-07, flujo 6), `AGENTS.md`, `docs/ontologia.md` (Apartado, Vale), `docs/guia-de-la-app.md` (webhook `apartado.vencido`: `datos.apartado` + `datos.vale`), `tests/payloads/apartado.vencido.json`.
- `backend/routes/apartados.py`, `backend/controllers/apartados.py` y el modelo/servicio de `vencer`: qué devuelve `POST /api/apartados/{id}/vencer`, qué errores da (no está fuera de plazo, ya vencido, liquidado…) y que envía el webhook.
- `specs/10-sub-workflows.md` y `workflows/10-*.json` (`Buscar apartado` con `estado` `activo`, `Enviar notificación`, regla Run once for each item, mensaje genérico de error), `~/subflujos/LEEME-95.md` (Workflow Inputs de una línea con `\n`).
- Patrones ya probados: `specs/11-datafono.md` y `~/hu13/` (Schedule + Form/Manual de prueba, POST con Batching 1 + Never Error, `{ cuerpo: null }`, informe a la tienda con el sub-workflow), `specs/07-informe-mensual.md`.
- `specs/01-eventos-tienda.md` en esta rama (flujo 1 con el sub-workflow).

## Contenido

1. `specs/06-recordatorios-vencimientos.md` (plantilla), parte A nodo a nodo:
   - Disparador: Schedule cada mañana (hora y días; justifica respecto al datáfono 22:00 y al cierre) + un disparador manual o formulario para probar.
   - Leer los activos con `Buscar apartado` (`estado` `activo`) y quedarse con los de `fecha_limite` < hoy (Europe/Madrid). Sin recalcular nada.
   - `POST /api/apartados/{id}/vencer` uno a uno (Batching 1, Never Error); qué hacer con un error de un apartado (seguir con los demás y ponerlo en la lista) y con `401`/`5xx` (parar → `08`).
   - Lista a la tienda con `Enviar notificación`: zapatos que vuelven a la venta (producto, talla, cliente, `id`, código y importe del vale) y los que fallaron. Día sin vencidos: decide si se envía «ningún apartado vencido hoy» o nada, y justifícalo.
   - Casos de error, prueba y criterios.
2. `specs/01-eventos-tienda.md`: la rama `apartado.vencido` (parte B) nodo a nodo, con los Workflow Inputs listos (texto con código, importe del vale, producto y cómo usarlo; sin recalcular nada), el caso sin email, prueba con `tests/payloads/apartado.vencido.json` y nota de alcance.
3. **Prueba con datos reales** (las dos partes juntas): con los datos de ejemplo de hoy, los apartados activos fuera de plazo son el 16 (Paula Ramos), 15 (Sergio Delgado), 14 (Marta Molina) y 13 (Pablo Rubio) — compruébalo con `GET /api/apartados?estado=activo` (solo lectura, clave del `.env` sin imprimirla). Resultado esperado: 4 vencidos, 4 vales (código e importe = `abonado` de cada uno), 4 correos a clientes (o lo que toque si falta email), 1 lista a la tienda; segunda ejecución: 0 vencidos. Copia de la base de datos antes y restauración después (como en HU-13).
4. `AGENTS.md` (sección 5 si hace falta, sección 8 con las decisiones) y `docs/ai-log.md`: entrada «### Spec de vencimientos · HU-07 (`specs/06-recordatorios-vencimientos.md`, `specs/01-eventos-tienda.md`)» con el formato habitual y este prompt literal en un bloque `<details>`.

## Límites

- Solo documentación: no toques n8n, `workflows/`, `backend/`, `frontend/`, `docker-compose.yml` ni `.env`. Solo `GET` a la API, nunca `POST`; no escribas la clave en ningún fichero ni en la salida.
- Usa solo campos de `docs/ontologia.md`.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado y qué decisiones has tomado.
```

</details>

### Código de los nodos Code · HU-07 (`specs/06-recordatorios-vencimientos.md`)

- **Autora:** Esra
- **Tarea:** escribir el JavaScript de los 2 nodos Code de la rama de vencimientos del `06` (`Elegir los fuera de plazo`, `Preparar lista`) y un `LEEME.md` con la configuración de los demás nodos del `06` y los pasos de la rama `apartado.vencido` del `01`. **Reparto:** la pareja construye los nodos en n8n y pega el código; el agente solo escribe el código.
- **Resultado:**
  - **`~/hu07/`** (fuera del repo): `1-elegir-los-fuera-de-plazo.js`, `2-preparar-lista.js` y `LEEME.md`.
    - El `LEEME.md` lleva qué recibe y qué devuelve cada Code, la configuración de los demás nodos del `06` (disparadores, `Leer apartados activos`, el IF, `Vencer apartado`, `Enviar lista a la tienda`, Settings) y el esquema de conexiones.
    - Los pasos del `01`, con `para`, `asunto` y `texto` copiados de la spec, cada uno en su bloque (comprobado que son idénticos).
    - Cómo hacer cada prueba: los `curl` de la rama del `01`, la copia y la restauración de la base de datos y el pin data de la prueba 3, listo para pegar.
  - Mismos patrones que HU-10 y HU-13:
    - `{ id: null }` cuando no hay nada que vencer;
    - respuestas del `POST` con Never Error, emparejadas por orden con Batching 1;
    - `detail` de la app en los `404` y `422`.
  - No hace falta `isExecuted`: `Preparar lista` solo se ejecuta por la rama true, después de `Vencer apartado`.
  - **Prueba en local con node:**
    - `GET /api/apartados?estado=activo` real, con la clave del `.env` sin imprimirla, pasado por la forma de `Buscar apartado` (`{ total, apartados }`, solo los campos de la lista);
    - los `POST /vencer` simulados como los hace `backend/models/apartado.py` (vale `VALE-<id con 5 cifras>` con `importe` = `abonado`, `422` y `404` con su `detail`).
    - **Prueba 1:** 16, 15, 14 y 13 vencidos, con `VALE-00016` 5.00 €, `VALE-00015` 60.00 €, `VALE-00014` 45.00 € y `VALE-00013` 30.00 €. Asunto «Vencimientos del 27/10/2026: 4 pares vuelven a la venta».
    - **Prueba 2** (con los 16 activos que quedan): `{ id: null }`, sin `POST` ni correo.
    - **Prueba 3** (pin data con el 22 y el 9999): `404` «Apartado no encontrado» y `422` «El apartado ya está vencido»; «0 pares vuelven a la venta · 2 con error».
    - **`500` en el 14:** para con «Vencer apartado: la app respondió 500 en el apartado 14: Internal Server Error. Ya vencidos: 16 (VALE-00016), 15 (VALE-00015), 13 (VALE-00013)».
    - **`401` en todos:** para con «… respondió 401 en el apartado 16: Falta la cabecera X-API-Key o no es válida (y en 3 más: 15, 14, 13). Ya vencidos: ninguno».
    - **Otros casos:** menos respuestas que apartados, una entrada sin `apartados` (paran con su error) y un solo vencido sin talla («1 par vuelve a la venta», sin «talla»).
- **Problemas encontrados:**
  - **Never Error sigue después de un `500`.** La spec decía que el mensaje del `08` lleva «los que ya se vencieron». Con Never Error, `Vencer apartado` intenta todos los `POST`, así que también se pueden vencer los de después del que falla. El código los incluye todos, y se corrigió la spec (paso 8) con los mensajes exactos.
  - **Mensajes que no estaban en la spec.** Se añadieron a la sección 4 el de las respuestas que no cuadran (paso 7) y el de una entrada sin `{ total, apartados }` (paso 4). Sin este último, un Execute Workflow mal configurado parecería un día sin vencidos.
  - **Singular en el asunto** («1 par vuelve a la venta»): añadido a la sección 5.
  - **Comprobado al construir:** el `POST` sin cuerpo funciona y las 4 respuestas llegaron en orden (cada vale emparejado con su apartado); el pin data de `Leer apartados activos` no se probó, porque la prueba 3 no se hizo en n8n (ver «Construcción de los vencimientos · HU-07»).
- **Decisión:** aceptado. Los 2 Code del JSON exportado son idénticos a `~/hu07/*.js`.

<details><summary>Prompt</summary>

```text
## Tarea

HU-07: vamos a construir a mano en n8n la rama de vencimientos de `06 · Recordatorios y vencimientos` y la rama `apartado.vencido` del `01`, siguiendo `specs/06-recordatorios-vencimientos.md` y `specs/01-eventos-tienda.md`. Tú escribes solo el JavaScript de los 2 nodos Code del `06` (`Elegir los fuera de plazo`, `Preparar lista`); la pareja crea los demás nodos y pega tu código. Usa exactamente los nombres de nodo de la spec.

## Fuentes

- `specs/06-recordatorios-vencimientos.md` (secciones 3, 4, 5, 6 y 7), `specs/01-eventos-tienda.md` (rama HU-07), `AGENTS.md`.
- Estilo y patrones ya probados: `~/hu13/` (Code, `LEEME.md`, emparejar respuestas por orden con Batching 1 + Never Error, `isExecuted`), `~/subflujos/LEEME.md` y `~/subflujos/LEEME-95.md` (Execute Workflow a los sub-workflows, Workflow Inputs de una línea).
- `backend/models/apartado.py` (`vencer`) y las rutas: forma de la respuesta de `POST /vencer` y los `detail`.
- `workflows/10-buscar-apartado.json` (qué devuelve `{ total, apartados }`).

## Contenido

1. En `~/hu07/` (fuera del repo, no se sube):
   - `1-elegir-los-fuera-de-plazo.js` y `2-preparar-lista.js`. Comentarios cortos en español, sin librerías externas, mensajes de error exactamente como en la spec, sin recalcular importes.
   - `LEEME.md`:
     - qué recibe y qué devuelve cada Code (con un ejemplo corto);
     - la configuración exacta de los demás nodos del `06` (2 disparadores, `Leer apartados activos` con sus Workflow Inputs, el IF, `Vencer apartado`, `Enviar lista a la tienda`, Settings con Error workflow `08` y zona horaria), con un dibujo de las conexiones;
     - los pasos en el `01` para la rama `apartado.vencido`: conectar la salida del Switch, el IF `¿Tiene email? (vencido)` y los 2 Execute Workflow, con `para`, `asunto` y `texto` **copiados de la spec**, cada valor en su propio bloque para copiarlo de uno en uno;
     - cómo hacer cada prueba de la sección 7 (con los `curl` de la rama del `01`, la copia de la base de datos y la restauración).
2. Comprueba la lógica en local con node: `GET /api/apartados?estado=activo` real (clave del `.env`, sin imprimirla), simula la salida de `Buscar apartado` y las respuestas de `/vencer` (200 con el vale como lo genera la app, un 422 y un 404), y ejecuta los 2 Code. Prueba 1 (4 vencidos: 16, 15, 14, 13), prueba 2 (`{ id: null }`), prueba 3 (422 + 404) y un `500` (para con el mensaje de la spec). Dime los resultados y el texto completo de la lista de la prueba 1.
3. `specs/06-recordatorios-vencimientos.md`: solo si algo de la sección 4 no cuadra con lo que has visto, corrígelo y dime qué.
4. `docs/ai-log.md`: entrada «### Código de los nodos Code · HU-07 (`specs/06-recordatorios-vencimientos.md`)» con el formato habitual (reparto: la pareja construye los nodos, el agente escribe el código) y este prompt literal en un bloque `<details>`.

## Límites

- No toques n8n, `workflows/`, `backend/`, `frontend/` ni `docker-compose.yml`.
- Solo `GET` a la API, nunca `POST`. No escribas la clave en ningún fichero ni en la salida.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

### Construcción de los vencimientos · HU-07 (`workflows/06-recordatorios-y-vencimientos.json`, `workflows/01-eventos-tienda.json`)

- **Autora:** Esra
- **Tarea:** construir y probar en n8n la rama de vencimientos de `06 · Recordatorios y vencimientos` y la rama `apartado.vencido` del `01`, según `specs/06-recordatorios-vencimientos.md` y `specs/01-eventos-tienda.md`, y exportarlas.
- **Resultado:**
  - La pareja construyó a mano en n8n los nodos que no son Code y pegó el código de los 2 Code.
    - El `06` tiene 8 nodos con los nombres de la spec, Error workflow `08` y zona horaria `Europe/Madrid`. Los 2 Code del JSON son idénticos a `~/hu07/*.js`.
    - En el `01` hay 3 nodos nuevos (`¿Tiene email? (vencido)`, `Enviar vale al cliente` y `Avisar a la tienda: vencido sin email`), conectados a la salida `apartado.vencido` del Switch. Sus Workflow Inputs son idénticos a los de la spec. El resto del `01` no cambia: solo se movieron nodos en el canvas y en Settings se añadió la zona horaria `Europe/Madrid`.
  - Los dos JSON pasan `validate_workflow` de n8n-mcp sin errores ni avisos (8 y 17 nodos).
  - El `06` está **sin publicar** (`"active": false`) a propósito. Publicado, vencería de verdad a las 9:00 los apartados fuera de plazo, entre ellos el 16, que la prueba de HU-03 (correo `06_bizum_paula`) necesita `activo` y fuera de plazo. Se publicará cuando terminen las pruebas de HU-03.
  - **Pruebas** (copia de la base de datos en `~/tienda-antes-hu07.db`, restaurada al terminar):
    - **Rama del `01`** (Test URL):
      - con `apartado.vencido.json` llega a `paula16@example.com` el vale `VALE-00016` de 5.00 €;
      - con `apartado.vencido-sin-email.json` llega a la tienda el aviso con el teléfono y el vale.
    - **Prueba 1 del `06`** (Probar a mano, con el `01` publicado):
      - total 20; 4 elegidos (16, 15, 14 y 13); 4 respuestas `200`;
      - en Mailpit, 5 correos: la lista «4 pares vuelven a la venta» y los 4 vales (5.00, 60.00, 45.00 y 30.00 €);
      - en la app, `resumen` 16 / 9 / 5 y 5 vales. El del apartado 15 (60,00 €) es la suma de sus abonos (10 + 20 + 20 + 10).
    - **Prueba 2:** `{ id: null }`, el IF va por false, sin `POST` ni correo.
    - **Prueba 3** (pin data con `422` y `404`): no se hizo en n8n. Sus caminos están comprobados en local («Código de los nodos Code · HU-07»).
    - **Prueba 4** (programada): no se hizo, porque el `06` está sin publicar.
  - Evidencias: los 6 `docs/evidencias/06-hu07-*.png`, enlazados en la sección 7 de las dos specs.
- **Problemas encontrados:**
  - **Mode de `Enviar lista a la tienda`.** Al principio se quedó con el Mode por defecto (Run once with all items). Con un solo item funcionaba, pero incumplía la regla de `AGENTS.md`. Se cambió a Run once for each item y se volvió a exportar.
  - **Nombre del archivo.** El export lo llama `06-recordatorios-y-vencimientos.json`: `scripts/flujos.py` quita «de», «la» y «del», pero no «y». La spec decía `06-recordatorios-vencimientos.json`; se cambió en la spec. La spec mantiene su nombre (`specs/06-recordatorios-vencimientos.md`): `AGENTS.md` solo pide el mismo `NN`, y renombrarla rompería los enlaces de las otras specs y de los prompts literales.
  - **«Execute Sub-workflow».** En n8n, el nodo Execute Workflow aparece con ese nombre. Se anotó en las dos specs.
  - **Sin página de vales.** La app no tiene página de vales: cada vale se ve en la página de su apartado. Se corrigió en la spec del `06`.
- **Decisión:** aceptado. Las 3 filas de HU-07 de `AGENTS.md` (sección 8) pasan a «Tomada». Los 3 criterios de HU-07 están cumplidos con pruebas manuales; el disparador de cada mañana queda sin probar hasta publicar el `06`.
- No hay prompt: los flujos los construyó la pareja a mano.

### Entregables: instalación, credenciales y revisión de secretos (#142, #143, #140)

- **Autora:** Esra
- **Tarea:** documentar cómo instalar todo desde cero (#142), completar la tabla «Workflow → credenciales» con todos los workflows (#143) y revisar los secretos de todos los JSON (#140). Solo documentación, en la rama `docs/entregables-instalacion`; los workflows se leyeron de `dev` y de las ramas de los PR con `git show`.
- **Resultado:**
  - **`docs/instalacion.md`** (nuevo), en 11 pasos:
    - requisitos y `.env`, `docker compose up -d` y URLs;
    - las 3 credenciales (`Mailpit`, `API Tienda`, `Groq`) y `Google Sheets` para el `05`;
    - la Data table `Configuración` y la carpeta del datáfono;
    - el orden de importación con `flujos.py importar` y por qué (ids de los Execute Workflow y del Error workflow), y qué revisar en cada workflow;
    - qué publicar y por qué;
    - una prueba de humo por workflow, enlazada a la sección 7 de su spec;
    - la copia y restauración de la base de datos y cómo recargar los datos de ejemplo sin perder n8n;
    - los problemas frecuentes.
  - **README:** una línea con el enlace al principio de «Cómo empezar»; el enunciado no cambia.
  - **`docs/credenciales.md`:**
    - la credencial `Google Sheets` y el nodo IMAP del `03` (deshabilitado, sin credencial);
    - la tabla «Workflow → credenciales» con los 10 workflows y estas columnas: credenciales en sus nodos, las que usa a través de los `10`, Data tables y archivos, variables del `.env` y Error workflow.
  - **`docs/revision-secretos.md`** (nuevo): los comandos (`git grep` sobre 11 ramas: `dev`, #172, #173, la rama de HU-03 y los 7 PR parciales de HU-03) y el resultado.
    - No hay ningún secreto: ni claves, ni cabeceras con valor, ni URLs con credenciales, ni `shared`/`pinData`. El único email es `tienda@pasofirme.example`.
    - Hay un punto a revisar, sin arreglar: el `documentId` de un Google Sheets real en `workflows/05-cierre-diario.json`, línea 175 (PR #173).
- **Problemas encontrados:**
  - **#171 ya está fusionado.** El prompt lo daba como abierto; el `11` ya está en `dev`.
  - **La rama de HU-03 no tiene PR.** `feature/39-hu03-prueba-correos` tiene el `03` integrado. Los PR abiertos #158–#169 tienen exports parciales (`03-abonos-distancia-entrada.json`…), que su propia guía dice que no se importen. Se revisaron igual en #140.
  - **Una cuarta credencial.** El prompt hablaba de 3 credenciales, pero el `05` (#173) necesita `Google Sheets` (OAuth2). Se documenta como opcional, solo para el `05`.
  - **El `03` y el `05` no traen `id`** y sus credenciales tienen `id` `null`: n8n les da un id nuevo y hay que elegir las credenciales a mano. No afecta a nadie, porque ningún workflow los llama.
  - **El problema del worktree no estaba documentado** en el repo. Se explica a partir de cómo Docker Compose nombra el proyecto (`docker compose ls` da `paso-firme`): desde otra carpeta, otro proyecto sin `.env`. La solución propuesta (`COMPOSE_PROJECT_NAME=paso-firme`) no se ha probado.
  - **Recargar los datos de ejemplo sin perder n8n** (`rm /data/tienda.db` y reiniciar) sale de `backend/main.py` (el seed se carga si la base de datos está vacía) y no se ha probado, para no tocar la base de datos.
  - **Conflicto previsible con #173.** Su rama también añade a `docs/credenciales.md` la fila de `Google Sheets` y la del `05`; al fusionar, habrá que quedarse con una.
- **Decisión:** pendiente de revisión de la pareja. Que Beste revise el punto del `documentId` y las filas del `03` y el `05`.

<details><summary>Prompt</summary>

```text
## Tarea

Entregables finales #142, #143 y #140 (los tres en esta rama `docs/entregables-instalacion`, que sale de `dev`). Solo documentación y una revisión de solo lectura.

Ten en cuenta que hay PR abiertos que añaden workflows y todavía no están en `dev`: #171 (`11 · Datáfono`), #172 (`06 · Recordatorios y vencimientos` y la rama `apartado.vencido` del `01`), #173 de Beste (`05 · Cierre diario`, rama `feature/hu04-cierre-diario`) y la rama de HU-03 de Beste (`03 · Abonos a distancia`, rama `feature/39-hu03-prueba-correos`). #170 (flujo 1 con `Enviar notificación`) ya está en `dev`. Léelos con `git show origin/<rama>:<ruta>` o `gh pr diff <n>` y documenta el estado final, con todos los workflows.

## Fuentes

- README (Entregables, Requisitos técnicos, Cómo empezar), `AGENTS.md` (secciones 3, 5, 7 y 8), `docs/credenciales.md`, `docs/guia-de-la-app.md`, `.env.example`, `docker-compose.yml`, `scripts/flujos.py`, `scripts/datos_demo.py`.
- `workflows/*.json` de `dev` y de las ramas de los PR abiertos (credenciales por nodo, Data tables, Error workflow, sub-workflows que llama cada uno, disparadores).
- Las specs de cada flujo (sección 1: credenciales; sección 7: pruebas).

## Contenido

1. **#142 · `docs/instalacion.md`** (y un enlace corto desde el README, en «Cómo empezar» o justo antes, sin cambiar el enunciado): cómo poner en marcha todo desde cero en otro ordenador, paso a paso y en orden:
   - requisitos y `.env` (desde `.env.example`, sin valores reales); `docker compose up -d`; URLs;
   - crear las 3 credenciales en n8n (nombres exactos);
   - crear las Data tables (`Configuración` con su fila) y la carpeta del datáfono (`docker compose exec n8n mkdir -p ...`);
   - **importar en este orden** con `python3 scripts/flujos.py importar ...`: primero los sub-workflows `10`, luego el `08`, luego el `01` y el resto; por qué el orden (los Execute Workflow y el Error workflow apuntan por id; `flujos.py importar` conserva el id). Qué hay que revisar después de importar en cada workflow (credencial en cada nodo, tabla en el nodo de Data table, Error workflow);
   - qué publicar y qué no (y por qué: el `01` y los `10` sí; los que tienen Schedule, según la decisión de cada spec);
   - una prueba rápida de humo por flujo (un `curl` o un formulario y qué debe llegar a Mailpit), enlazando a la sección 7 de su spec;
   - copia y restauración de la base de datos para las pruebas que cambian datos; cómo volver a cargar los datos de ejemplo;
   - problemas frecuentes que nos han pasado (Test URL vs Production URL, formulario de prueba de un solo uso, Execute step vs Execute workflow con varios disparadores, `docker compose` desde un worktree, Workflow Inputs de una línea, `git restore` del `01` al exportar desde otra rama).
2. **#143 · `docs/credenciales.md`:** completa la tabla «Workflow → credenciales» con **todos** los workflows (01, 03, 05, 06, 07, 08, 09, 10 ×2, 11), incluidas las credenciales que usan a través de los sub-workflows, las Data tables y las variables del `.env`. Sin valores.
3. **#140 · Revisión de secretos** en todos los `workflows/*.json` (de `dev` y de las ramas de los PR abiertos): busca claves, tokens, contraseñas, cabeceras `X-API-Key` con valor, `apiKey`, URLs con credenciales, emails reales (todo lo que no sea `@example.com` / `@pasofirme.example` / `@bancoejemplo.example`), nombres y emails del propietario (`shared`, `pinData`), e ids de credencial que delaten algo. Pon el resultado (comandos usados y qué se encontró) en `docs/revision-secretos.md`. Si encuentras algo, **no lo arregles**: dímelo con archivo y línea.
4. `docs/ai-log.md`: entrada «### Entregables: instalación, credenciales y revisión de secretos (#142, #143, #140)» con el formato habitual y este prompt literal en un bloque `<details>`.

## Límites

- Solo documentación: no toques n8n, `workflows/`, `backend/`, `frontend/`, `docker-compose.yml` ni `.env`. No llames a la API.
- Ningún secreto en ningún fichero ni en la salida (si encuentras uno, nombra el archivo y la línea, no el valor).
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

### Reintentos en los HTTP Request · #56

- **Autora:** Esra
- **Tarea:** documentar la decisión de #56 (HU-05) para el commit `feat:`, en la rama `feature/56-reintentos`. **Reparto:** la pareja activó a mano en n8n **Retry On Fail** (Max Tries 3, Wait Between Tries 2000 ms) en los 11 HTTP Request `GET` de los workflows 07, 09, 10 y 11, y los exportó. El agente documentó y comprobó.
- **Resultado:**
  - **Comprobación con un script** sobre todos los `workflows/*.json`: tienen `retryOnFail: true` y `waitBetweenTries: 2000` exactamente esos 11 nodos, y solo ellos:
    - los 4 `Leer …` del `07`;
    - los 3 `Leer … de la app` y `Comprobar pendientes` del `09`;
    - los 2 `GET` de `10 · Buscar apartado`;
    - `Leer ventas de esos días` del `11`.
  - Ningún `POST` tiene reintentos. El diff de los 4 JSON solo añade esas 2 claves en los 11 nodos y cambia el `versionId`.
  - **`validate_workflow`:** los 4 válidos, 0 errores.
    - `10`: 0 avisos.
    - `07`, `09` y `11`: solo los avisos de **Execute Once**, que es lo que piden sus specs.
    - Para no enviar 80 KB, el `09` y el `11` se validaron con el cuerpo de sus Code sustituido por `return $input.all();`, y el `07` con `Preparar informe` simplificado. Los Code no cambian en esta rama.
  - **`AGENTS.md`**, sección 8: la decisión.
  - **`specs/08-error-workflow.md`:**
    - sección «Reintentos» con la tabla de nodos con y sin reintento, y cómo encaja con el `08` (primero los 3 intentos, después un solo aviso);
    - el criterio de #56, marcado.
  - **Specs `07`, `09`, `10` y `11`:**
    - una línea «Settings → Retry On Fail: 3 intentos, 2000 ms» en la configuración de esos nodos;
    - los casos de error de «la app no responde» y del `401`, corregidos: ahora dicen que primero se reintenta.
    - Ninguna spec decía nada contrario.
- **Problemas encontrados:**
  - **Never Error en `10 · Buscar apartado`.** Sus dos `GET` tienen Never Error: un `401` o un `5xx` no hacen fallar el nodo y no se reintentan. Solo se reintentan los errores sin respuesta (app parada, tiempo agotado). El `401` «inofensivo» del prompt vale para el `07`, el `09` y el `11`, no para el `10`. Se documentó así; no hace falta cambiar el flujo.
  - **`maxTries` no se pudo comprobar en n8n-mcp.** n8n-mcp no documenta los ajustes del nodo (Retry On Fail, Max Tries, Wait Between Tries):
    - en `get_node` del HTTP Request no salen, ni en las propiedades ni en la documentación;
    - `validate_workflow` no dice el valor por defecto (solo avisa si `maxTries` es alto: probado con 20).
    - Que `3` es el valor por defecto sale de la interfaz de n8n: el JSON exportado sí guarda `waitBetweenTries: 2000`, que no es el valor por defecto, y no guarda `maxTries`.
  - **Cuándo reintenta n8n:** solo cuando el nodo falla; con Never Error u On Error → Continue, no. Tampoco está en n8n-mcp. Coincide con lo que ya decía la spec del `10` («Never Error no cubre los errores de red»).
  - **Sin prueba en n8n.** Los reintentos no se han provocado (por ejemplo, con `docker compose stop tienda` durante una ejecución). Las pruebas del `401` de las specs siguen valiendo; el aviso del `08` llega unos 4 s más tarde.
- **Decisión:** pendiente de revisión de la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

#56 (HU-05) · Reintentos (Retry On Fail) en los nodos HTTP Request. La pareja ya ha activado **Retry On Fail** a mano en n8n (Max Tries 3, Wait Between Tries 2000 ms) **solo en los HTTP Request de lectura (`GET`)** y lo ha exportado. Documenta la decisión para el commit `feat:`. Rama `feature/56-reintentos`.

Nodos cambiados (11):
- `07 · Informe mensual`: `Leer ventas del mes`, `Leer abonos desde el día 1`, `Leer apartados`, `Leer vales`.
- `09 · Migración del Excel`: `Leer apartados de la app`, `Leer abonos de la app`, `Leer ventas de la app`, `Comprobar pendientes`.
- `10 · Buscar apartado`: `Leer apartado por número`, `Buscar apartados por texto`.
- `11 · Datáfono`: `Leer ventas de esos días`.

Sin reintentos, a propósito: los `POST` (`Vencer apartado` del `06`; `Crear apartados`, `Registrar abonos`, `Registrar ventas` del `09`; `Registrar ventas` del `11`). `05` (PR #173) y `03` (HU-03) son de Beste y no se tocan en esta rama.

## Fuentes

- `workflows/07-informe-mensual.json`, `workflows/09-migracion-excel.json`, `workflows/10-buscar-apartado.json`, `workflows/11-datafono.json` (léelos, no los modifiques). Comprueba con un script que esos 11 nodos, y solo esos, tienen `retryOnFail: true` y `waitBetweenTries: 2000` (`maxTries` no aparece en el JSON porque 3 es el valor por defecto y n8n no lo exporta; compruébalo en la documentación del nodo), y valida los 4 con `validate_workflow` de n8n-mcp.
- `specs/03-abonos-distancia.md` (líneas 37 y 57: «no reintentar un POST a ciegas»), `specs/08-error-workflow.md`, `specs/07-...`, `specs/09-...`, `specs/10-sub-workflows.md`, `specs/11-datafono.md`, `AGENTS.md`, `docs/instalacion.md` si ya está en `dev`.
- Documentación de n8n (n8n-mcp) sobre Retry On Fail: cuándo reintenta (solo si el nodo falla; con **Never Error** o **On Error → Continue** el nodo no falla y no reintenta).

## Contenido

1. `AGENTS.md`, sección 8: una fila «Retry On Fail (3 intentos, 2 s) solo en los HTTP Request `GET`; nunca en los `POST`». Motivo: un `GET` repetido no cambia nada; un `POST` que llegó a la app pero cuya respuesta se perdió crearía un abono, una venta o un apartado duplicado. Si los 3 intentos fallan, el nodo falla y avisa el `08`. Un `401` también se reintenta (inofensivo: 2 × 2 s).
2. `specs/08-error-workflow.md`: sección corta «Reintentos» con la tabla de nodos (con y sin reintento y por qué), y cómo encaja con el `08` (primero reintentos, después el aviso). Criterio de #56 marcado.
3. En la spec de cada workflow cambiado (`07`, `09`, `10`, `11`), una línea en la configuración de esos nodos: «Settings → Retry On Fail: 3 intentos, 2000 ms». Si la spec dice algo contrario, corrígelo.
4. Una nota para Beste (en tu respuesta, no en un archivo): qué nodos de lectura del `05` y del `03` deberían llevar lo mismo (`Leer ventas del día`, `Leer abonos del día`, `Buscar apartado`) y cuáles no.
5. `docs/ai-log.md`: entrada «### Reintentos en los HTTP Request · #56» con el formato habitual (la pareja configuró los nodos; el agente documentó y comprobó) y este prompt literal en un bloque `<details>`.

## Límites

- No toques n8n, `workflows/`, `backend/`, `frontend/`, `docker-compose.yml` ni `.env`. No llames a la API.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado y el resultado de la comprobación y de `validate_workflow`.
```

</details>

### Agente, modelos y n8n-mcp · #8

- **Autora:** Esra
- **Tarea:** #8 [Base del proyecto]: dejar documentados y justificados el agente, el modelo gratuito y n8n-mcp, en la sección 1 de este documento. Rama `docs/8-agente-ia`. Solo documentación.
- **Resultado:** sección 1 reescrita.
  - **Tabla:**
    - un agente de desarrollo por persona: Esra con Claude Code; Beste con Codex, cuyo modelo no consta en el repo;
    - el modelo de n8n: Groq con `openai/gpt-oss-20b`, sacado del nodo `Extraer datos con Groq` del JSON del `03`, en uso en el flujo 3;
    - n8n-mcp en modo solo documentación.
  - **Por qué Claude Code y Codex, y no OpenCode:** cada una usa el agente que ya tenía. El alcance se delimita con hechos del repo:
    - una rama y una tarea por persona;
    - el mismo `AGENTS.md` para los dos agentes;
    - la sección 9 de AGENTS.md;
    - la pareja construye los nodos y el agente escribe specs, código y documentación;
    - todo pasa por una PR revisada.
  - **Modelo gratuito:** por qué Groq y ese modelo, y que la IA solo extrae y el flujo decide. Qué datos recibe Groq: solo `{ ordenante, importe, concepto }`, recortados antes en `Preparar correo`, y por qué son los imprescindibles. Enlace a la comparativa pendiente (#96, #98).
  - **Por qué n8n-mcp sin API key**, y cómo se configura.
- **Problemas encontrados:**
  - **Error nuestro en la sección 1.** Decía que usábamos Claude Code «porque ya lo tenemos las dos». No era así: Esra usa Claude Code y Beste usa Codex, como dice su entrada de HU-04 en `origin/feature/hu04-cierre-diario` («Autora: Beste, con Codex»). Se corrigió.
  - **La sección 1 estaba desactualizada.** El modelo de Groq seguía «Por decidir / Pendiente de configurar», aunque el flujo 3 ya usa `openai/gpt-oss-20b` («Extracción estructurada HU-03 (#34)», prueba real del 26/10/2026).
  - **No se puede comprobar en el repo:**
    - el modelo que usa Codex;
    - el límite de la capa gratuita de Groq;
    - que el código del `03` siga igual al fusionarse, porque solo está en la rama de HU-03.
    - No se afirma nada de eso: la tabla dice «No consta en el repo» para el modelo de Codex y que el `03` está «todavía sin fusionar».
- **Decisión:** pendiente de revisión de la pareja. Que Beste confirme la fila de Codex y lo que se dice del flujo 3.

<details><summary>Prompt</summary>

```text
## Tarea

#8 [Base del proyecto] «Agente de IA elegido y configurado + modelo gratuito + n8n-mcp (justificar la elección en ai-log)». Todo está ya en uso; falta dejarlo documentado y justificado en `docs/ai-log.md`, sección «1. Herramientas y modelos», que está desactualizada (dice que el modelo de Groq está «Por decidir / Pendiente de configurar»). Rama `docs/8-agente-ia`. Solo documentación.

## Fuentes

- README, sección «🤖 Desarrollo Agéntico con IA» (Herramientas) y requisito técnico 10.
- `docs/ai-log.md` (sección 1 y las entradas: qué se ha hecho con el agente, qué errores se detectaron), `AGENTS.md` (sección 6 «Herramientas del agente» y sección 9), `.mcp.json`.
- El modelo de Groq que usa el flujo 3: `git show origin/feature/39-hu03-prueba-correos:workflows/03-abonos-distancia.json` (nodo `Extraer datos con Groq`) y `specs/03-abonos-distancia.md`.
- Issues #96 y #98 (comparativa de modelos, de Beste): solo para enlazarla, no la hagas.

## Contenido

1. `docs/ai-log.md`, sección 1, actualizada:
   - **Corrección:** el párrafo actual dice que usamos Claude Code «porque ya lo tenemos las dos». No es así: **Esra usa Claude Code y Beste usa Codex** (OpenAI; ver su entrada de HU-04 en `origin/feature/hu04-cierre-diario`, «Autora: Beste, con Codex»). Corrígelo y deja constancia en la entrada nueva de que era un error nuestro.
   - Tabla: un agente de desarrollo por persona (Esra: Claude Code y su modelo; Beste: Codex, sin inventar el modelo si no está en el repo), modelo de IA dentro de n8n (Groq, capa gratuita, el modelo exacto del JSON del `03`, «En uso» en el flujo 3), n8n-mcp (modo solo documentación, «En uso»).
   - **Por qué Claude Code y Codex y no OpenCode** (sustituye el párrafo actual): cada una usa el agente que ya tenía. El README admite IAs de pago si se delimita el alcance; di cuál es ese alcance y cómo lo delimitamos, con hechos del repo: cada una en su rama y su tarea, así dos agentes distintos no se pisan; los dos leen el mismo `AGENTS.md` (Claude Code lo carga con `CLAUDE.md` → `@AGENTS.md`; Codex lee `AGENTS.md` directamente); el agente no toca n8n ni publica (AGENTS.md, sección 9); la pareja construye los nodos a mano y el agente escribe specs, código de los nodos Code y documentación; todo pasa por PR revisada.
   - **Modelo gratuito:** por qué Groq y ese modelo para el flujo 3 (capa gratuita, compatible con OpenAI, solo extrae ordenante, importe y concepto; las decisiones las toma el flujo). Qué datos personales se le envían y por qué son los imprescindibles. Enlace a la comparativa de modelos (#96) como pendiente.
   - **Por qué n8n-mcp sin API key:** sin conexión a la instancia, el agente no puede crear ni publicar flujos; lo usamos para consultar nodos y para `validate_workflow` antes de cada PR. Cómo se configura (`.mcp.json`, aprobar el servidor al abrir el proyecto).
2. `docs/ai-log.md`: entrada «### Agente, modelos y n8n-mcp · #8» con el formato habitual y este prompt literal en un bloque `<details>`.

## Límites

- Solo `docs/ai-log.md`. No toques n8n, `workflows/`, `backend/`, `frontend/`, `docker-compose.yml` ni `.env`. No llames a la API.
- No escribas ninguna clave. Solo hechos que estén en el repo; si algo no lo puedes comprobar, dilo en tu respuesta en lugar de inventarlo.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué has cambiado.
```

</details>

### Mapa del proceso · #141

- **Autora:** Esra
- **Tarea:** entregable 1 del README: el mapa del proceso de apartado, hoy y automatizado, con diagramas Mermaid en `docs/mapa-proceso.md`.
- **Resultado:**
  - `docs/mapa-proceso.md`, con cuatro partes:
    - **Hoy:** `flowchart` con carriles para el cliente, la dependienta, el banco y Marisa. Los 5 problemas del README van marcados en rojo y se repiten en una lista debajo.
    - **Automatizado:** los mismos carriles más la app y n8n.
      - Cada paso de n8n lleva el nombre real del flujo y su disparador, que salen de las specs y de los JSON: `01` por evento, `06` cada mañana a las 9:00, `11` de lunes a sábado a las 22:00, `05` a las 00:05, `07` el día 1 a las 8:00 y `08` si falla un flujo.
      - El `03` va como un subgrafo, con sus decisiones en rombos.
      - Lo humano va en amarillo.
    - **Ciclo de vida del apartado:** `stateDiagram-v2` con `activo`, `liquidado` y `vencido`, y qué provoca cada paso.
    - **Antes → después:** tabla que enlaza cada problema del README con la spec del flujo que lo resuelve.
  - Se dibuja el proceso final, también lo que todavía se está terminando:
    - el `03`, tomado de `origin/feature/39-hu03-prueba-correos`;
    - el `05`, de `origin/feature/hu04-cierre-diario` (#173);
    - los recordatorios del `06`, solo con lo que dicen el README y la sección 4.2 de su spec: nombre, «cada mañana» y aviso al cliente. Sin hora, porque la spec solo dice que «puede usar» el disparador de las 9:00.
  - Enlace al mapa en «Cómo empezar» del README.
- **Problemas encontrados:**
  - **Validación de Mermaid.** No se pudo validar con `npx -y @mermaid-js/mermaid-cli`: el modo automático de Claude Code bloqueó la descarga del paquete. Se revisó la sintaxis a mano (etiquetas entre comillas y sin HTML). Queda pendiente comprobarlo en GitHub o con mermaid-cli.
  - **Enlaces de specs que no están en `dev`.** `specs/05-cierre-diario.md` solo existe en la rama de #173, así que el enlace no funciona hasta que se fusione.
  - **IMAP desactivado.** En el JSON del `03`, el nodo `Correo bancario IMAP` está desactivado, y el flujo se prueba con `Formulario de desarrollo`. El mapa dibuja el disparador final (el correo del banco) y lo indica en el texto.
  - **Pendiente de cobro.** El README dice que Marisa no lo sabe «en ningún momento». Ningún flujo lo envía a diario: va en el informe mensual, y con su formulario se puede pedir cuando se quiera. La tabla lo dice así.
- **Decisión:** pendiente de revisión de la pareja.

<details><summary>Prompt</summary>

```text
## Tarea

#141 [Entregables finales] «Mapa del proceso: hoy vs automatizado». Entregable 1 del README: «Mapa del proceso de apartado: cómo se hace hoy y cómo queda automatizado (diagrama BPMN, Miro, Excalidraw o similar)». Lo hacemos con diagramas **Mermaid** dentro de un Markdown, porque GitHub los dibuja directamente y quedan versionados con el repo. Rama `docs/141-mapa-proceso`. Solo documentación.

## Fuentes

- README: «Planteamiento» (cómo se trabaja hoy: libreta, Excel, calculadora, avisos del banco), «Reglas del negocio», «Automatizaciones a construir» y las historias de usuario.
- `docs/ontologia.md` (entidades y estados del apartado), `AGENTS.md` (secciones 2, 5 y 8), `docs/guia-de-la-app.md` (eventos del webhook).
- Las specs de cada flujo y los `workflows/*.json` de `dev` y de las ramas abiertas (`origin/feature/hu04-cierre-diario` para el `05`, `origin/feature/39-hu03-prueba-correos` para el `03`): disparadores, horas, a quién avisa cada flujo.
- `data/excel_actual_apartados.csv`, `data/excel_actual_ventas.csv` (cómo se lleva hoy).

## Contenido

1. `docs/mapa-proceso.md`, en español:
   - **Hoy (a mano):** un diagrama Mermaid (`flowchart`, con carriles o `subgraph` por actor: cliente, dependienta, Marisa, banco) del ciclo de un apartado: alta en la libreta, abonos en la tienda y desde casa (Bizum o transferencia → Marisa revisa el banco y apunta a mano), comprobar cuánto falta, liquidar y recoger, plazo vencido (nadie avisa; zapatos olvidados en el almacén), cierre diario y suma mensual con calculadora. Marca con un estilo los puntos de dolor del README, y debajo una lista corta de esos problemas.
   - **Automatizado:** el mismo ciclo con la app y n8n, con los mismos carriles más «App» y «n8n». Cada paso automático dice qué flujo lo hace con su nombre real (`01 · Eventos de la tienda`, `03 · Abonos a distancia`, `05 · Cierre diario`, `06 · Recordatorios y vencimientos`, `07 · Informe mensual`, `08 · Error Workflow`, `11 · Datáfono`; los `10` como sub-workflows) y su disparador (evento del webhook u hora). Las decisiones del flujo 3 (registrar o preguntar a Marisa) como rombos. Lo que sigue siendo humano (alta y abonos en la tienda, revisar los casos dudosos) debe verse claro.
   - Un segundo diagrama, pequeño, del **ciclo de vida del apartado** (`stateDiagram-v2`: `activo` → `liquidado` / `vencido` + vale), con qué lo provoca en cada caso.
   - Una tabla «Antes → después» que enlace cada problema del README con el flujo que lo resuelve (enlace a su spec).
   - Dibuja el proceso **final**, también lo que aún se está terminando y vamos a entregar: el `03` (HU-03, rama `feature/39-hu03-prueba-correos`), el `05` (HU-04, PR #173) y los recordatorios de 7 y 1 días en el `06` (HU-06, Beste; si no hay spec ni JSON todavía, usa el README y la sección reservada en `specs/06-recordatorios-vencimientos.md`, y no inventes detalles: nombre del flujo, disparador y a quién avisa). No los marques como pendientes. Lo que **no** vamos a hacer (Telegram HU-11/12, HU-14 y el resto del nivel Avanzado salvo HU-13) no se dibuja.
2. Comprueba que los diagramas son Mermaid válido (sintaxis que GitHub soporta: sin HTML en las etiquetas, comillas en las etiquetas con paréntesis o `·`). Si tienes `npx`, valida con `npx -y @mermaid-js/mermaid-cli` a un archivo en `/tmp` (no lo dejes en el repo); si no, dime que no lo has podido validar.
3. Un enlace corto desde el README a `docs/mapa-proceso.md` en «Cómo empezar», junto al de `docs/instalacion.md` si ya está; no cambies el enunciado.
4. `docs/ai-log.md`: entrada «### Mapa del proceso · #141» con el formato habitual y este prompt literal en un bloque `<details>`.

## Límites

- Solo documentación. No toques n8n, `workflows/`, `backend/`, `frontend/`, `docker-compose.yml` ni `.env`. No llames a la API.
- Usa solo entidades y estados de `docs/ontologia.md`. Nada que no exista en el repo.
- No añadas `.DS_Store`.
- No hagas commit, push ni PR. Dime qué archivos has cambiado.
```

</details>

### Evidencias de un apartado completo · #144

- **Autora:** Esra
- **Tarea:** entregable 5 del README. Documentar con capturas un apartado completo (alta → abonos → liquidación) en `docs/evidencias/apartado-completo.md`.
- **Resultado:**
  - **La prueba y las capturas las hizo la pareja**, el 28/10/2026, en la app real y con el `01` publicado:
    - copia de la base de datos en `~/tienda-antes-hu144.db`, restaurada al terminar;
    - clienta inventada Irene Navarro y apartado #31 (Botín piel marrón, talla 37, 40,00 €);
    - alta con 10,00 € en efectivo, abono de 15,00 € por bizum y abono de 15,00 € con tarjeta, que lo liquida;
    - 3 correos en Mailpit y 3 ejecuciones correctas del `01` (08:24:47, 08:25:43 y 08:27:08).
  - **El agente la documentó** a partir de las 7 capturas de `docs/evidencias/apartado-completo-*.png`, después de mirarlas una a una:
    - cada paso con su captura de la app, su correo, el evento y la rama del `01`;
    - una tabla que compara cada cifra de la app con la del correo (todas coinciden);
    - los criterios de HU-01 y HU-02 que demuestra la prueba.
  - Enlace al documento en «Cómo empezar» del README.
- **Problemas encontrados:**
  - **Asunto sin «¡».** El prompt da el asunto del tercer correo como «¡Ya puedes recoger tus zapatos! Botín piel marrón». En la captura, y en el Send Email `Avisar de que puede recoger` de `workflows/01-eventos-tienda.json`, es «Ya puedes recoger tus zapatos! …», sin el signo de apertura. Se documentó el asunto real y una nota. El flujo no se toca: es una tarea aparte.
  - **«Menos de un minuto» (HU-01).** Las capturas muestran la hora de la ejecución (08:24:47) y la del correo (8:24), pero no la hora exacta del alta en la app. Se dice así en el documento.
  - **Sin email (HU-01, criterio 3).** Esta prueba no lo cubre; se remite a las pruebas de la spec del `01`.
- **Decisión:** pendiente de revisión de la pareja.

### Filtro de avisos bancarios HU-03 (#33)

- **Autora:** Beste.
- **Tarea:** añadir el filtro determinista que distingue pagos recibidos, publicidad y entradas inválidas.
- **Resultado:** `workflows/03-abonos-distancia-filtro.json`, generador reproducible, código del nodo, cinco pruebas y `docs/hu03-filtro.md`. La salida `extraer` prepara el siguiente paso (#34); `ignorar` termina; `revisar` no registra pagos. Esta rama continúa #32.
- **Verificación local:** `node --test tests/test_hu03_filtro.cjs tests/test_hu03_entrada.cjs` — 11/11 superadas. El JSON se regeneró y `git diff --check` no encontró errores.
- **Pendiente:** importación y validación n8n-mcp siguen sin realizarse para la exportación específica de #33. Esta PR se mantiene como borrador.
- **Decisión:** el filtro reconoce las plantillas del repositorio y no autentica el banco. IA, búsqueda, registro y avisos corresponden a tareas posteriores.

### Extracción estructurada HU-03 (#34)

- **Autora:** Beste.
- **Tarea:** extraer ordenante, importe y concepto de los avisos que el filtro #33 reconoce como pagos.
- **Resultado:** export parcial e inactivo `workflows/03-abonos-distancia-extraccion.json`, generador independiente, Code nodes de preparación/validación, cuatro pruebas y guía `docs/hu03-extraccion.md`. No consulta la API de tienda, no registra abonos ni envía emails. Credencial `Groq`; `08` enlazado por el ID del export del equipo y debe volver a seleccionarse en una instancia donde cambie.
- **Verificación local:** cuatro pruebas sobre el JSON generado cubren ocho pagos de ejemplo, publicidad, valores inventados, esquemas inválidos, importe negativo, JSON truncado y fallo de Groq.
- **Prueba real (26/10/2026):** los ocho pagos llegaron a `buscar` y publicidad a `ignorar` usando `openai/gpt-oss-20b`; no hubo escrituras. Se guardan salidas, capturas y los nueve IDs de ejecución (pagos 5–11 y 13; publicidad 12).
- **Pendiente:** revisar el enlace local de `08` y validar el export final con n8n-mcp. PR en borrador; no cerrar #34 hasta completar la revisión.

### Búsqueda de apartado HU-03 (#35)

- **Tarea:** consultar la API con la URL ya elegida por #34 (ID explícito o búsqueda conservadora) y entregar la respuesta a #36.
- **Resultado:** se añade `workflows/03-abonos-distancia-busqueda.json`, generador determinista, prueba automatizada y guía. El nodo es un GET autenticado con `API Tienda`; no hay escritura ni SMTP. El 404 explícito conserva su estado para revisión; fallos de red paran la ejecución.
- **Pendiente:** importar y validar en n8n, asignar credenciales y seleccionar el 08 local. Mantener la PR como borrador y el workflow inactivo.


### Decisión de apartado HU-03 (#36)

- **Tarea:** validar candidatos de la API contra ordenante y concepto; exigir un único apartado activo, en plazo y con saldo suficiente antes de pasar a #37.
- **Resultado:** borrador parcial `workflows/03-abonos-distancia-decision.json`, generado desde #35. La rama válida entrega el apartado a #37; las demás entregan motivo y candidatos a #38. No registra abonos ni envía correos.
- **Verificación:** pruebas locales cubren coincidencias por nombre/producto, acentos e iniciales, concepto vacío, candidatos cero o múltiples, discrepancias, fecha límite, estado, pendiente, 404 explícito y errores HTTP técnicos.
- **Pendiente:** revisión y validación en n8n con credenciales locales; workflow inactivo y PR borrador.
- **Decisión:** 401 y 5xx se mantienen como errores técnicos para 08; un 404 de ID explícito requiere revisión manual y nunca activa una búsqueda alternativa.


### Registro de abono HU-03 (#37)

- **Tarea:** registrar mediante POST solo cuando #36 devuelve `decision=registrar`; manejar el 422 de la API como revisión manual.
- **Resultado:** workflow parcial e inactivo con guard adicional de ID, estado, plazo y saldo; POST a `/api/apartados/{id}/abonos` con `forma_pago: bizum`; 201 deja el recibo al webhook HU-02; 422 y 404 pasan a #38; errores de red, 401 y 5xx llegan al 08. Sin retry automático ni correo duplicado.
- **Verificación:** pruebas simuladas para autorización, saldo, estado, plazo, 201/422/404/401/5xx y transporte; no se envió POST a la app ni se modificó la base de datos.
- **Pendiente:** review y prueba de importación en n8n. Para validar escritura real se requiere una base desechable/restaurable; no usar datos de la tienda habitual. Mantener borrador inactivo.
- **Decisión:** ante timeout no reintentar a ciegas porque el POST pudo haberse aplicado; conciliar antes de cualquier repetición.


### Aviso de revisión manual HU-03 (#38)

- **Tarea:** avisar a la tienda cuando un pago no se registra automáticamente.
- **Resultado:** export parcial e inactivo `workflows/03-abonos-distancia-aviso.json`. Las rutas de revisión por extracción y decisión/registro pasan a un correo plano por Mailpit. Incluye motivo, ordenante, importe, método original si se identifica, concepto, referencia y candidatos disponibles. El mensaje no reenvía el cuerpo original ni ejecuta registros.
- **Verificación:** suite HU-03 completa — 35/35 pruebas; incluye motivos, candidatos, 422, método Bizum/transferencia y limpieza de saltos de línea/pseudoencabezados. No se envió ningún correo en las pruebas.
- **Pendiente:** review y validación en n8n/Mailpit. Mantener workflow inactivo y la PR borrador.
- **Decisión:** mostrar hasta 20 candidatos y advertir si hay más; no poner datos variables en el asunto ni reenviar el correo bancario completo.

### Preparación de cierre y auditoría de pruebas · HU-03

- **Autora:** Beste, con Codex.
- **Tarea:** retomar el cierre en el worktree feature/39-hu03-prueba-correos sin tocar las modificaciones HU-03 de la carpeta principal.
- **Resultado:** origin/dev incorporado con conflicto de ai-log resuelto conservando entradas completas de ambas partes; merge preparado sin commit. La rama ya tenía un único JSON 03 y ningún docs/superpowers. Generadores por etapas documentados como históricos/no necesarios; no se vuelven a crear los parciales.
- **Guía:** `~/hu03-prueba.md`, nueve referencias/asuntos/cuerpos exactos extraídos de .eml, ramas, saldos, correos esperados, capturas y copia/restauración. Se advierte no repetir Carmen/Jorge sobre los saldos actuales.
- **Auditoría real (28/10/2026):** #34 corresponde a Carmen y #35 a Jorge, ambos Succeeded. Se comprobó la referencia del formulario guardado; los asuntos usados fueron descripciones y no los originales .eml. GET actual: #1 pendiente 9.50 y #2 59.00; Lucía 12 y Silvia 35. La copia antigua está íntegra pero precede a esos dos abonos. No se restaura ni sobrescribe automáticamente.
- **Evidencia pendiente:** siete casos sin ejecución exitosa en el historial auditado; recibo Carmen no acreditado. No se inventa que estén probados. Auditoría y validación mínimas en docs/evidencias/03-hu03-*.json.
- **Verificación:** 35/35 tests; validate_workflow válido, 0 errores, 0 avisos (30 nodos, 2 notas; validator cuenta 28). No POST, no reejecución de pagos, no cambios de configuración n8n, no commit/push/cierre de PRs en esta fase.
- **Decisión:** fase 1 preparada; esperar pruebas manuales y capturas para fase 2 según el prompt de cierre.

### Construcción y prueba del flujo · HU-03 (`workflows/03-abonos-distancia.json`)

- **Autora:** Beste, con Codex.
- **Tarea:** cerrar HU-03 con un único flujo completo, nueve pruebas reales, capturas, restauración y PR consolidada a dev.
- **Resultado:** un JSON 03, sin los siete parciales ni docs/superpowers; generadores por etapas conservados como históricos/no necesarios. Documentación de etapas resumida y enlazada a spec principal. Nombres de nodo con issue conservados, no se rompen expresiones. Notas y descripción del formulario ya no dicen flujo parcial.
- **Pruebas reales:** ejecuciones 34,35,60,62,63,64,65,66,67 Succeeded. Abonos reales #84–#87 por 10/20/12/5 € para 1/2/3/24 (47 €). Cuatro avisos sin registro; publicidad sin Groq, POST ni email. Lucía liquidada. Capturas de las nueve ejecuciones y ocho emails; resultados estructurados mínimos sin claves/contactos.
- **Diferencias:** los asuntos de Carmen/Jorge eran descripciones; cuerpos bancarios correctos. Desconocido tuvo candidatos amplios API, ninguno compatible; no se afirma cero filas. Recibo Carmen comprobado después mediante replay autorizado al 01 del abono existente #84: mismos saldos e IDs antes/después, ningún nuevo POST de abono. No se presenta como envío original observado en ejecución 34.
- **Restauración:** copia original íntegra y copia adicional de seguridad del estado posterior. Comparación: únicamente cuatro abonos y estado Lucía; original restaurada y tienda reiniciada. GET confirma pendientes originales y conteos. Se conservan emails/ejecuciones de prueba.
- **Verificación:** suite local 35/35, validación n8n-mcp sin errores/avisos; export inactivo. La comprobación del export detectó que faltaba seleccionar Error workflow 08; se restauró esa referencia y se explicitaron GET, formato IMAP simple y adjuntos desactivados. La referencia Groq conserva su ID válido y usa el nombre documentado. Se importó la configuración corregida sin ejecutar pagos ni publicar el flujo. No backend/frontend/compose/.env modificados ni secreto escrito. IMAP sin credencial/deshabilitado y sus pruebas pendientes; 401/422/5xx solo probados localmente, no inventados como integración. La relectura/deduplicación no está probada ni implementada.
- **Decisión:** consolidar a dev para revisión humana. No publicar, mergear ni modificar main/dev. PR antiguas se cerrarán como sustituidas solo tras crear la consolidada, conforme a la autorización de Beste.

## 4. Decisiones abiertas

Ninguna por ahora.
