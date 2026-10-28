# 👟 Zapatería Paso Firme · Automatizaciones con n8n

Flujos de **n8n** que automatizan todo lo que pasa alrededor de la app de la tienda: avisos a clientes, vencimientos, cierres de caja, informes y entrada de datos.

**Pareja:** Esra Kesken y Beste Ozaydin · **Enunciado del profesor:** [docs/enunciado.md](docs/enunciado.md)

## Qué problema resuelve

Marisa, la dueña, llevaba los apartados en una libreta y las ventas en un Excel. Sumaba con calculadora y apuntaba a mano los Bizum que llegaban al banco.

- **Clientes:** nadie les avisaba de cuánto les faltaba ni de cuándo vencía el plazo.
- **Dependienta:** buscaba en la libreta cuánto había pagado cada cliente.

Ahora la dependienta solo registra apartados, abonos y ventas en la app. n8n avisa a cada cliente con los importes que da la app, vence los apartados fuera de plazo con su vale, y envía a Marisa sus cifras y los casos que tiene que decidir.

→ [Mapa del proceso: hoy y automatizado](docs/mapa-proceso.md)

## Qué hemos construido

| Workflow | Disparador | Qué hace | HU | Spec · JSON | Pruebas |
|---|---|---|---|---|---|
| `01 · Eventos de la tienda` | Webhook `POST /webhook/tienda` + Switch por `evento` | Confirmación de apartado, recibo de abono o aviso de recogida, aviso de venta grande y vale al cliente cuando vence | HU-01, HU-02, HU-09, HU-07 (criterio 2) | [spec](specs/01-eventos-tienda.md) · [JSON](workflows/01-eventos-tienda.json) | [Sección 7](specs/01-eventos-tienda.md#7-prueba) · [apartado completo](docs/evidencias/apartado-completo.md) |
| `03 · Abonos a distancia` 🟡 | Correo del banco (IMAP); formulario para pruebas | La IA (Groq) extrae ordenante, importe y concepto. El flujo busca el apartado por API y registra el abono, o pregunta a Marisa | HU-03 | [spec](specs/03-abonos-distancia.md) · JSON en la rama `feature/39-hu03-prueba-correos` (sin PR) y en las PR parciales #158 y #163–#169 | [Tabla de los 9 correos](specs/03-abonos-distancia.md#7-prueba-tabla-de-decisión-de-los-nueve-correos) (esperado) |
| `05 · Cierre diario` 🟡 | Cada noche a las 00:05; formulario | Ventas y abonos del día anterior por forma de pago, en Google Sheets y por correo a Marisa | HU-04 | Spec y JSON en la [PR #173](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pull/173) | En la PR #173 |
| `06 · Recordatorios y vencimientos` | Cada mañana a las 9:00 | Vence por API los apartados fuera de plazo y envía a la tienda la lista de zapatos que vuelven a la venta. Los recordatorios (HU-06) están en curso | HU-07 · HU-06 🟡 | [spec](specs/06-recordatorios-vencimientos.md) · [JSON](workflows/06-recordatorios-y-vencimientos.json) | [Sección 7](specs/06-recordatorios-vencimientos.md#7-prueba) |
| `07 · Informe mensual` | Día 1 a las 8:00; formulario | Recaudación del mes anterior, pendiente de cobro y apartados nuevos, liquidados y vencidos, en una tabla HTML | HU-08 | [spec](specs/07-informe-mensual.md) · [JSON](workflows/07-informe-mensual.json) | [Sección 7](specs/07-informe-mensual.md#7-prueba) |
| `08 · Error Workflow` | Error en cualquier flujo | Avisa a la tienda con el flujo, el paso, el error y el enlace a la ejecución | HU-05, #56 | [spec](specs/08-error-workflow.md) · [JSON](workflows/08-error-workflow.json) | [Sección 7](specs/08-error-workflow.md#7-prueba) |
| `09 · Migración del Excel` | Formulario con los 2 CSV | Limpia los CSV de `data/` y los carga por API con su fecha, sin duplicar. Los casos dudosos van a un informe | HU-10 | [spec](specs/09-migracion-excel.md) · [JSON](workflows/09-migracion-excel.json) | [Sección 7](specs/09-migracion-excel.md#7-prueba) |
| `10 · Buscar apartado` y `10 · Enviar notificación` | Execute Workflow | Sub-workflows comunes; los usan el `01`, el `06`, el `08` y el `11` | #92 | [spec](specs/10-sub-workflows.md) · [JSON](workflows/10-buscar-apartado.json), [JSON](workflows/10-enviar-notificacion.json) | [Sección 7](specs/10-sub-workflows.md#7-prueba) |
| `11 · Datáfono` | De lunes a sábado a las 22:00; formulario | Importa el CSV de cobros con tarjeta como ventas, sin duplicar | HU-13 | [spec](specs/11-datafono.md) · [JSON](workflows/11-datafono.json) | [Sección 7](specs/11-datafono.md#7-prueba) |

🟡 = en curso: todavía no está en `dev`.

## Niveles

✅ hecho y en `dev` · 🟡 en curso (PR o rama) · ❌ no lo hacemos

### 🟢 Esencial

| Criterio del enunciado | Estado | Prueba |
|---|---|---|
| App y n8n con `docker compose`, conectados | ✅ | [Evento que llega a n8n](docs/evidencias/01-evento-llega-a-n8n.png) |
| Flujo 1 · Confirmación de apartado | ✅ | [Apartado completo](docs/evidencias/apartado-completo.md), [spec 01, sección 7](specs/01-eventos-tienda.md#7-prueba) |
| Flujo 2 · Recibo de abono | ✅ | [Apartado completo](docs/evidencias/apartado-completo.md), [spec 01, sección 7](specs/01-eventos-tienda.md#7-prueba) |
| Flujo 3 · Abonos a distancia | 🟡 | Rama `feature/39-hu03-prueba-correos` (sin PR); PR parciales #158 y #163–#169 |
| El flujo 3 resuelve los 8 correos; la IA solo extrae | 🟡 | Resultado esperado en la [spec](specs/03-abonos-distancia.md#7-prueba-tabla-de-decisión-de-los-nueve-correos); prueba real pendiente (#39) |
| Flujo 5 · Cierre diario | 🟡 | [PR #173](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pull/173) |
| Un único webhook con un Switch por `evento` | ✅ | [Spec 01](specs/01-eventos-tienda.md) |
| Mensajes al cliente con los importes de la app | ✅ | [Comprobación cifra a cifra](docs/evidencias/apartado-completo.md#5-comprobación-cifra-de-la-app--cifra-del-correo) |
| Error Workflow que avisa a la tienda | ✅ | [Spec 08, sección 7](specs/08-error-workflow.md#7-prueba) |
| Credenciales en n8n y JSON en GitHub | ✅ | [Credenciales](docs/credenciales.md), [revisión de secretos](docs/revision-secretos.md) |
| `AGENTS.md` y bitácora con los prompts de cada flujo principal | 🟡 | [AGENTS.md](AGENTS.md) ✅; en la [bitácora](docs/ai-log.md) faltan las entradas de construcción del `03` y del `05`, que llegan con sus ramas |

### 🟡 Medio

| Criterio del enunciado | Estado | Prueba |
|---|---|---|
| Flujo 4 · Venta grande | ✅ | [Spec 01, sección 7](specs/01-eventos-tienda.md#7-prueba) |
| Flujo 6 · Vencimientos (HU-07) | ✅ | [Spec 06, sección 7](specs/06-recordatorios-vencimientos.md#7-prueba) |
| Flujo 6 · Recordatorios a 7 días y a 1 día (HU-06) | 🟡 | Beste; todavía sin rama ni PR ([sección 4.2 de la spec](specs/06-recordatorios-vencimientos.md)) |
| Flujo 7 · Informe mensual | ✅ | [Spec 07, sección 7](specs/07-informe-mensual.md#7-prueba) |
| Aviso al cliente con el código y el importe de su vale | ✅ | [Vale al cliente](docs/evidencias/06-hu07-vale-cliente.png) |
| Sub-workflows reutilizables | ✅ | [Spec 10, sección 7](specs/10-sub-workflows.md#7-prueba). Se usan en el `01`, el `06`, el `08` y el `11` (#95 sigue abierta) |
| Migración del Excel | ✅ | [Spec 09, sección 7](specs/09-migracion-excel.md#7-prueba) |
| Informe mensual con tabla en el correo | ✅ | [Informe de octubre](docs/evidencias/07-hu08-informe-octubre.png) |
| Comparativa de 2 modelos gratuitos | ❌ | Sin empezar (#96) |

### 🟠 Avanzado

| Criterio del enunciado | Estado | Prueba |
|---|---|---|
| Asistente de IA por Telegram (HU-11, HU-12) | ❌ | — |
| Otra entrada de datos automática: datáfono (HU-13) | ✅ | [Spec 11, sección 7](specs/11-datafono.md#7-prueba) |
| Recordatorios redactados por IA | ❌ | — |
| Webhook protegido y validación de los datos | ❌ | — (#117, #118) |
| Datos personales conforme al RGPD (HU-14) | ❌ | Solo documentamos qué datos recibe Groq en el flujo 3 ([bitácora, #8](docs/ai-log.md#agente-modelos-y-n8n-mcp--8)) |
| Comandos o subagentes personalizados | 🟡 | [PR #179](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pull/179): `/revisar-flujo`, `/generar-spec` y `/cerrar-tarea` de Claude Code |

## Cómo ponerlo en marcha

```bash
git clone https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme.git paso-firme && cd paso-firme
cp .env.example .env      # cambiar API_KEY por una clave propia
docker compose up -d
```

App: http://localhost:8000 · n8n: http://localhost:5678 · Mailpit: http://localhost:8025

Todo lo demás está en **[docs/instalacion.md](docs/instalacion.md)**: credenciales, Data table, el orden en que se importan los workflows, qué se publica y las pruebas de humo.

## Decisiones técnicas

Todas, con su motivo, en [AGENTS.md, sección 8](AGENTS.md#8-decisiones-tomadas).

- **Un webhook y un Switch** en el `01` reparten todos los eventos de la app: lo pide el enunciado y es una sola URL que mantener ([AGENTS.md, sección 3](AGENTS.md#3-servicios-y-urls)).
- **Sub-workflows `10`** para buscar apartados y enviar correos, siempre con Mode «Run once for each item»: con «all items» se perderían items sin error.
- **Umbral de venta grande en una Data table** (`Configuración`): las Variables de n8n son de pago, y así Marisa cambia el importe sin editar el flujo.
- **Las transferencias se registran como `bizum`:** la app no acepta `transferencia`. Lo confirmó el profesor.
- **En el flujo 3, la IA solo extrae** ordenante, importe y concepto. Qué apartado es y si se puede registrar lo decide el flujo con la API ([AGENTS.md, sección 9](AGENTS.md#9-lo-que-el-agente-no-debe-hacer)).
- **Retry On Fail solo en los `GET`:** repetir un `POST` podría registrar dos veces un abono o una venta.
- **El `06` vence y el `01` envía el vale:** el cliente recibe su vale aunque el apartado se venza por otra vía.
- **HU-13 con la variante Datáfono:** a las 22:00, antes del cierre, y sin duplicar lo que ya se apuntó a mano.

## Cómo nos organizamos

- **Kanban:** [Project «zapateria-paso-firme»](https://github.com/orgs/T3-P4-Auto-n8n/projects/1). Una historia por tarjeta, con sus tareas. Etiquetas por nivel (`esencial`, `medio`, `avanzado`, `experto`) y por tipo (`historia`, `tarea`).
- **Una tarea = una rama = una PR a `dev`**, con su spec, su JSON y su entrada en la bitácora.
- **Revisión:** la otra persona de la pareja aprueba cada PR antes de fusionarla. Así se han fusionado todas las PR del [historial](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pulls?q=is%3Apr).
- **Idiomas:** commits y PR en inglés, con Conventional Commits (`feat:`, `docs:`, `fix:`, `chore:`). Documentación en español.
- **Conflictos en `docs/ai-log.md`:** todas las ramas añaden su entrada al final. Antes de fusionar, se trae `dev` a la rama (`git merge origin/dev`) y se dejan las dos entradas, una detrás de otra, antes de «Decisiones abiertas».
- **Ramas:**
  - `main`: entrega; recibe `dev` al cerrar un nivel (todavía no se ha hecho);
  - `dev`: integración;
  - `feature/…`, `docs/…`, `fix/…` y `chore/…`: siempre desde `dev`.

## Desarrollo con IA

- **Agentes:** Esra trabaja con Claude Code y Beste con Codex. Cada una en su rama, y las dos con el mismo [AGENTS.md](AGENTS.md).
- **Modelo gratuito en n8n:** Groq `openai/gpt-oss-20b` en el flujo 3, solo para extraer datos.
- **n8n-mcp** en modo solo documentación (sin API key): consulta nodos y valida los JSON, pero no puede tocar n8n.
- **El agente propone; la pareja construye en n8n, prueba y decide.** Prompts, errores del agente y decisiones, en la [bitácora de IA](docs/ai-log.md).

## Entregables

| # | Entregable | Dónde |
|---|---|---|
| 1 | Mapa del proceso, hoy y automatizado | [docs/mapa-proceso.md](docs/mapa-proceso.md) |
| 2 | Repositorio con los flujos en JSON e instrucciones | [workflows/](workflows/) · [docs/instalacion.md](docs/instalacion.md) |
| 3 | Credenciales y variables de cada flujo | [docs/credenciales.md](docs/credenciales.md) |
| 4 | Script de datos de ejemplo | [scripts/datos_demo.py](scripts/datos_demo.py) · [tests/payloads/](tests/payloads/) |
| 5 | Evidencias de un apartado completo | [docs/evidencias/apartado-completo.md](docs/evidencias/apartado-completo.md) · [docs/evidencias/](docs/evidencias/) |
| 6 | Kanban con las historias | [Project](https://github.com/orgs/T3-P4-Auto-n8n/projects/1) |
| 7 | `AGENTS.md` y specs | [AGENTS.md](AGENTS.md) · [specs/](specs/) |
| 8 | Bitácora de IA | [docs/ai-log.md](docs/ai-log.md) (en curso, #145) |
| 9 | Historial de PR con revisiones | [Pull requests](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pulls?q=is%3Apr) |
| 10 | Retrospectiva de la pareja | En curso (#146) |

## Estructura del repo

```
├── workflows/     Workflows exportados de n8n (JSON)
├── specs/         Una spec por workflow, desde specs/_plantilla.md
├── docs/          Enunciado, instalación, ontología, guía de la app, credenciales, mapa, bitácora
│   └── evidencias/  Capturas de las pruebas
├── tests/payloads/  Eventos de prueba para el webhook
├── scripts/       flujos.py (exportar/importar) y datos_demo.py
├── data/          CSV del Excel antiguo y correos del banco de ejemplo
├── backend/, frontend/  La app de la tienda (no se toca)
└── AGENTS.md      Contexto y reglas para los agentes de IA
```

## Mejoras futuras

- **Asistente por Telegram para clientes (HU-11):** saldo y fecha límite, solo de sus propios apartados.
- **Asistente por Telegram para Marisa (HU-12):** recaudación y vencimientos, con las cifras de la API.
- **Recordatorios redactados por IA,** siempre con los importes del flujo.
- **Webhook con autenticación por cabecera** y validación de lo que llega (HU-14).
- **Consentimiento de los clientes** para recibir mensajes, guardado fuera de la app (HU-14).
- **Apartados desde casa:** la otra variante de HU-13.
- **Comparativa de 2 modelos gratuitos** en la extracción del flujo 3 (#96, nivel Medio).
- **Nivel Experto** (panel, PostgreSQL, nube, CI y servidor MCP): no abordado.
