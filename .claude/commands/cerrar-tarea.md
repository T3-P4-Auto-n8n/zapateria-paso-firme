---
description: Repasa los cambios antes del commit y propone el mensaje (no hace commit)
argument-hint: "[nº de issue …]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git grep:*), Read, Grep
---

Repasa los cambios de la rama actual antes del commit. **No hagas `git add`, commit, push, `git restore` ni PR, y no modifiques archivos:** solo informa y propone. Issues mencionados: $ARGUMENTS

1. **Rama:**
   - `git branch --show-current`. Si es `main` o `dev`, ❌: hay que crear una rama `feature/`, `docs/`, `fix/` o `chore/` desde `dev` (AGENTS.md, sección 5).
   - `git diff --stat dev...HEAD` y `git status --short`.
2. **`.DS_Store`:** si aparece, avisa de que no se añade (y no uses `git add .`).
3. **Workflows de otros flujos:**
   - si hay cambios en `workflows/*.json` que no son de esta tarea, avisa: `scripts/flujos.py exportar` reescribe todos los flujos, también los de otras ramas;
   - propón `git restore workflows/<archivo>.json` para cada uno, sin ejecutarlo.
4. **Secretos en el diff** (`git diff` y `git diff --cached`, más los archivos sin seguimiento):
   - claves, tokens, contraseñas, `X-API-Key` o `Authorization` con valor, `sk-`, `gsk_`, `ghp_`, `AIza`, `eyJ…`;
   - el contenido del `.env`;
   - `pinData` o `shared`;
   - emails o teléfonos reales.
   Si encuentras algo, di archivo y línea, nunca el valor (búsquedas de `docs/revision-secretos.md`).
5. **Coherencia:**
   - si cambia un `workflows/NN-*.json`, ¿cambia también su `specs/NN-*.md`?
   - ¿hay entrada nueva en `docs/ai-log.md`?
   - si es un workflow, recomienda `/revisar-flujo workflows/NN-….json`.
6. **Propón:**
   - un **mensaje de commit** en inglés con Conventional Commits (`feat:`, `fix:`, `docs:` o `chore:`), de una línea, con el nº de issue entre paréntesis si lo hay;
   - la **lista de cierre para la PR** (`Closes #N` por issue terminado, `Refs #N` por los que siguen abiertos), con los números de `$ARGUMENTS` o de la rama. Si no sabes si un issue queda terminado, pregunta.

Termina con los comandos `git add <archivos>` que propondrías, archivo por archivo, para que los ejecute la pareja.
