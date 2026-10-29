---
description: Revisa un workflow exportado (solo lectura) antes de abrir la PR
argument-hint: workflows/NN-nombre.json
allowed-tools: Read, Grep, Glob, Bash(git grep:*), Bash(git ls-files:*), Bash(git status:*), Bash(python3 -c:*), mcp__n8n-mcp__validate_workflow
---

Revisa el workflow exportado `$1` antes de abrir la PR. Es una revisión **de solo lectura**: no modifiques ningún archivo, no toques n8n, no llames a la API de la tienda, no hagas commit ni push y no publiques nada. Si `$1` está vacío o no existe, dilo y para.

Contexto: `AGENTS.md` (secciones 3, 5, 6, 7, 8 y 9), `scripts/flujos.py`, `docs/credenciales.md` y la spec del flujo en `specs/`. Lee el JSON con Read o con `python3 -c` (solo lectura).

## Qué comprobar

Para cada punto: ✅ si está bien; ⚠️ si hay que revisarlo; ❌ si hay que corregirlo antes de la PR. Cada ⚠️ y ❌ lleva el **nodo** (nombre exacto) y el **motivo**.

1. **Nombres**
   - `name` empieza por `NN · ` (dos cifras, espacio, `·`, espacio).
   - El nombre del archivo es el que daría `nombre_archivo()` de `scripts/flujos.py`: sin tildes, en minúsculas, sin `de`, `la` ni `del` y con guiones.
   - Los nodos tienen nombres descriptivos en español (no `HTTP Request1`, `If`, `Code`…).
2. **Secretos**: busca solo en `$1`, con las búsquedas de `docs/revision-secretos.md`:
   - ningún valor de clave, token, contraseña, `Authorization` ni `X-API-Key`;
   - ningún `sk-`, `gsk_`, `ghp_`, `AIza`, `ya29.` ni `eyJ…`;
   - ninguna URL con `usuario:clave@`;
   - ningún teléfono escrito;
   - sin las claves `pinData`, `shared` ni datos del propietario: solo deben estar las claves de `CLAVES_EXPORTADAS` de `scripts/flujos.py`;
   - emails solo de `@example.com`, `@pasofirme.example` o `@bancoejemplo.example`. Los de los clientes salen de expresiones;
   - `documentId`, `cachedResultUrl` o ids de servicios externos: ⚠️, para que la pareja decida (no son claves).
   - **Si encuentras un secreto, di el nodo y la línea, nunca el valor.**
3. **Credenciales y URLs**
   - Cada HTTP Request a la app usa `authentication` `genericCredentialType` con `httpHeaderAuth` y la credencial `API Tienda`, sin `sendHeaders` ni `headerParameters` con `X-API-Key`.
   - La URL es `http://tienda:8000/...`, nunca `localhost` ni `127.0.0.1` (AGENTS.md, sección 3).
   - Los Send Email usan la credencial `Mailpit`.
4. **Settings**
   - `settings.errorWorkflow` es el `id` de `workflows/08-error-workflow.json`, salvo en el propio `08` y en los `10`, que no lo llevan (AGENTS.md, sección 8).
   - `settings.timezone` es `Europe/Madrid`. Si falta, ⚠️ (n8n usa la zona de la instancia); en un flujo con Schedule Trigger o con fechas de «hoy», ❌.
5. **Execute Workflow**
   - Cada nodo `executeWorkflow` tiene `"mode": "each"` (Run once for each item). Si no, ❌: con Run once with all items, los demás items se pierden sin error (ver `docs/ai-log.md`).
   - El `workflowId` apunta a un `id` que existe en algún `workflows/*.json`; di a cuál.
   - **Workflow Inputs:** los campos son de una línea. Un `texto` con saltos de línea reales en vez de `\n` es ⚠️ (el aviso del `08` llegó en una sola línea).
6. **Retry On Fail**
   - Solo en HTTP Request `GET`. Un `POST` con `retryOnFail` es ❌ (podría registrar dos veces).
   - Un `GET` a la app sin `retryOnFail` es ⚠️ (AGENTS.md, sección 8, #56).
   - Un `GET` con `onError` `continueRegularOutput`/`continueErrorOutput` o Never Error no se reintenta en los errores HTTP: anótalo.
7. **Expresiones e IF**
   - Ninguna expresión (`={{ … }}`) tiene espacios o texto después del último `}}` dentro de un IF, Switch o Filter: `'false '` no está vacío, y por eso un `email` `null` pasó el IF `¿Tiene email? (abono)` (ver `docs/ai-log.md`). Revisa también `leftValue`, `rightValue` y los nombres de salida de los Switch, sin espacios al final.
   - **Sin recálculos.** Que no se calculen `abonado`, `pendiente`, `fecha_limite` ni `estado` de un apartado (por ejemplo `precio - abonado`, o sumar los abonos de un apartado): se usan los de la app (AGENTS.md, sección 9). Sumar el `pendiente` de varios apartados para un total sí está permitido (ontología, «Quién calcula qué»).
   - Solo campos de `docs/ontologia.md` en las expresiones `$json.…` que leen datos de la app.
8. **`active`**
   - Si el JSON viene con `"active": true`, ⚠️. Si la spec dice que va sin publicar, ❌.
   - Recuerda que el agente no publica flujos.
9. **Spec**
   - Existe `specs/NN-*.md` con el mismo `NN`.
   - Lista los nodos del JSON que la spec no nombra entre comillas invertidas, y los nodos que la spec nombra para este flujo y no están en el JSON. Las notas adhesivas (`stickyNote`) no cuentan.
10. **Validación**
    - Si la herramienta `mcp__n8n-mcp__validate_workflow` está disponible, pásale el JSON y copia sus errores y avisos.
    - Si el flujo es muy grande o tiene datos personales en los Code, puedes simplificar el código de los Code para validar, pero dilo.
    - Si no está disponible, dilo.
11. **Git**
    - Con `git status --short workflows/`, avisa si hay otros `workflows/*.json` cambiados: el export reescribe todos, también los de otras ramas.
    - Propón `git restore <archivo>` para los que no son de esta tarea. No lo ejecutes.

## Informe

En español, con este formato:

```
## Revisión de <archivo> · <name>

| # | Comprobación | Estado | Detalle (nodo · motivo) |
|---|---|---|---|
| 1 | Nombres | ✅ | … |
…

### Problemas
- ❌ `<nodo>`: <motivo y cómo corregirlo en n8n>
- ⚠️ `<nodo>`: <motivo>

**Veredicto:** Listo para PR | Corregir antes de la PR
```

- «Listo para PR» solo si no hay ningún ❌. Los ⚠️ se dicen igual, pero no bloquean.
- Lo que no hayas podido comprobar, dilo; no lo des por bueno.
