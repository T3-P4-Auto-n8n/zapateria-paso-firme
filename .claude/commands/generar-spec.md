---
description: Crea la spec de un flujo a partir de la plantilla, sin inventar nada
argument-hint: NN nombre-del-flujo HU-xx
allowed-tools: Read, Grep, Glob, Write
---

Crea la spec `specs/$1-$2.md` del flujo `$1`, que cubre la historia `$3`, a partir de `specs/_plantilla.md`.

## Antes de escribir

- Si falta alguno de los tres argumentos (`NN`, `nombre` o `HU-xx`), dilo y para.
- **Si `specs/$1-$2.md` ya existe, no lo sobrescribas:** avisa y para.
- Si ya hay otra spec con el mismo `NN` (`specs/$1-*.md`), avisa y pregunta antes de seguir.
- No toques n8n, `workflows/`, `backend/`, `frontend/` ni `AGENTS.md`. No llames a la API. Solo creas este archivo.

## Fuentes (solo estas)

- `README.md`:
  - la historia `$3` con su texto y sus criterios de aceptación, copiados tal cual;
  - la fila del flujo en «Automatizaciones a construir», si la tiene;
  - su nivel (🟢 Esencial, 🟡 Medio, 🟠 Avanzado, 🔴 Experto).
- `docs/ontologia.md`: entidades, campos, estados y quién calcula cada dato. **Solo campos que existen ahí.**
- `docs/guia-de-la-app.md`: endpoints, parámetros, eventos del webhook y errores (`401`, `404`, `422`).
- `AGENTS.md`:
  - sección 3: URLs, `http://tienda:8000`, Header Auth `API Tienda`, `$json.body`;
  - sección 5: nombre `NN · Nombre`, nombres de nodo en español;
  - sección 8: decisiones ya tomadas que le afecten (sub-workflows `10`, Mode Run once for each item, Data table `Configuración`, cliente sin email…);
  - sección 9: lo que el agente no hace.
- `docs/credenciales.md`: nombres de credenciales (nunca valores).
- Como ejemplo de estilo, no de contenido: `specs/07-informe-mensual.md`, `specs/11-datafono.md` y `specs/10-sub-workflows.md`.

## Cómo rellenarla

- Sigue las secciones de la plantilla (1 a 8) y añade al final **«## 9. Preguntas para la pareja»**.
- **Cabecera:**
  - Flujo: `$1 · <Nombre>` y `workflows/$1-$2.json`.
  - HU `$3`.
  - Nivel según el README.
  - **Responsable:** «pendiente» si no lo dice nada.
  - Credenciales y variables: solo los nombres.
  - **Error workflow:** `08 · Error Workflow`.
- **Disparador:** si el README lo dice (evento, programado, correo…), úsalo. Si no dice la hora, el canal o la herramienta, **no la elijas: pregúntalo**.
- **Pasos:**
  - cada llamada con método y endpoint de la guía;
  - cada decisión (IF/Switch) con sus caminos;
  - `abonado` y `pendiente`, los de la app;
  - para buscar apartados o enviar correos, los sub-workflows `10 · Buscar apartado` y `10 · Enviar notificación`, con Mode Run once for each item;
  - Retry On Fail solo en los `GET`;
  - nombres de nodo propuestos en español, entre comillas invertidas.
- **Salidas y casos de error:** en tablas, como en las specs de ejemplo. Incluye siempre `401`, `404`/`422` si aplican, cliente sin `email` si hay mensajes al cliente, y «sin datos».
- **Prueba:** tabla de entradas y resultados esperados, con payloads de `tests/payloads/` si existen. Si no, propón el nombre del payload y márcalo como pendiente.
- **Criterios de aceptación:** los de `$3`, copiados del README, sin marcar.
- **Si algo no se puede saber de las fuentes, escríbelo como pregunta en la sección 9, nunca inventado:** un dato que la app no da, una hora, un canal, un umbral, cómo evitar duplicados… Si una pregunta afecta a un paso, deja en el paso «ver pregunta N».
- Spec en español; ningún secreto ni dato personal real (emails solo `@example.com` o `@pasofirme.example`).

## Al terminar

Di qué archivo has creado y lista las preguntas abiertas para la pareja. No hagas commit.
