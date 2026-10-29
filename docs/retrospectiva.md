# Retrospectiva de la pareja

Proyecto Zapatería Paso Firme · Esra Kesken y Beste Ozaydin · 29/10/2026

## Esra · Retrospectiva

**Qué fue bien**
- **Primero la spec, luego el flujo.** Escribir la spec antes de construir nos ahorró rehacer flujos: cuando algo fallaba en la prueba, sabíamos qué tenía que pasar.
- **Construir los nodos a mano y dejar al agente el código y la documentación.** Así entendía cada flujo y podía explicarlo; el agente acertaba más con el código de los nodos Code que generando flujos enteros.
- **Probar con datos reales y copia de la base de datos.** Cada prueba que cambiaba datos (HU-07, HU-10, HU-13) empezaba con una copia y terminaba restaurándola, y las evidencias son de ejecuciones reales.
- **Decisiones escritas en `AGENTS.md`.** Muchas dudas se resolvían leyendo la sección 8 en lugar de volver a discutirlas.

**Qué haríamos diferente**
- **Repartir el trabajo de forma más equilibrada desde el principio** y revisar cada día en qué punto estaba cada una.
- **Probar en n8n antes de abrir la PR.** Algunas PR se abrieron con pruebas solo en código local y tuvieron que rehacerse.
- **Fusionar las PR antes.** Al tener muchas PR abiertas a la vez, casi todas chocaban en `docs/ai-log.md` y perdimos tiempo resolviendo conflictos.

**Qué he aprendido**
- **n8n:** webhook + Switch, sub-workflows, Error Workflow, Data tables, la diferencia entre Test URL y Production URL, y que un formulario de prueba solo vale una vez.
- **Trabajar con un agente como *tech lead*:** darle contexto (spec, AGENTS.md), revisar lo que genera y no aceptar lo que no puedo comprobar. El agente también se equivoca, y hay que detectarlo.
- **Git en equipo:** ramas por tarea, PR revisadas y resolver conflictos (worktrees, merges de `dev`).

## Beste · Retrospectiva

**Qué fue bien**
- Dividimos el trabajo en tareas pequeñas y probamos los flujos con diferentes casos de ejemplo.

**Qué haríamos diferente**
- Prepararíamos antes un entorno de pruebas aislado y coordinaríamos mejor los cambios.

**Qué he aprendido**
- He aprendido a conectar n8n con una API y a utilizar la IA para extraer datos, manteniendo las decisiones de negocio en reglas claras.
