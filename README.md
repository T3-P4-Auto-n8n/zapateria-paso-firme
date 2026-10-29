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
| `03 · Abonos a distancia` | Correo del banco (IMAP, desactivado: Mailpit no tiene IMAP); formulario para pruebas | La IA (Groq) extrae ordenante, importe y concepto. El flujo busca el apartado por API y registra el abono, o pregunta a Marisa | HU-03 | [spec](specs/03-abonos-distancia.md) · [JSON](workflows/03-abonos-distancia.json) | [Los 9 correos](specs/03-abonos-distancia.md#resultados-reales--28102026) |
| `05 · Cierre diario` | Cada noche a las 00:05; formulario | Ventas y abonos del día anterior por forma de pago, en la Data table `Cierres` y por correo a Marisa | HU-04 | [spec](specs/05-cierre-diario.md) · [JSON](workflows/05-cierre-diario.json) | [Resultados](docs/evidencias/05-hu04-resultados.md) |
| `06 · Recordatorios y vencimientos` | Cada mañana a las 9:00 | Vence por API los apartados fuera de plazo y envía a la tienda la lista de zapatos que vuelven a la venta. Avisa a los clientes a 7 días y a 1 día del plazo, una sola vez (Data table `recordatorios enviados`), con un saludo y una despedida redactados por IA; importes y fechas los pone el flujo | HU-07, HU-06 | [spec](specs/06-recordatorios-vencimientos.md) · [JSON](workflows/06-recordatorios-y-vencimientos.json) | [Sección 7](specs/06-recordatorios-vencimientos.md#7-prueba) · [recordatorios con IA](docs/recordatorios-ia.md) |
| `07 · Informe mensual` | Día 1 a las 8:00; formulario | Recaudación del mes anterior, pendiente de cobro y apartados nuevos, liquidados y vencidos, en una tabla HTML | HU-08 | [spec](specs/07-informe-mensual.md) · [JSON](workflows/07-informe-mensual.json) | [Sección 7](specs/07-informe-mensual.md#7-prueba) |
| `08 · Error Workflow` | Error en cualquier flujo | Avisa a la tienda con el flujo, el paso, el error y el enlace a la ejecución | HU-05, #56 | [spec](specs/08-error-workflow.md) · [JSON](workflows/08-error-workflow.json) | [Sección 7](specs/08-error-workflow.md#7-prueba) |
| `09 · Migración del Excel` | Formulario con los 2 CSV | Limpia los CSV de `data/` y los carga por API con su fecha, sin duplicar. Los casos dudosos van a un informe | HU-10 | [spec](specs/09-migracion-excel.md) · [JSON](workflows/09-migracion-excel.json) | [Sección 7](specs/09-migracion-excel.md#7-prueba) |
| `10 · Buscar apartado` y `10 · Enviar notificación` | Execute Workflow | Sub-workflows comunes; los usan el `01`, el `06`, el `08` y el `11` | #92 | [spec](specs/10-sub-workflows.md) · [JSON](workflows/10-buscar-apartado.json), [JSON](workflows/10-enviar-notificacion.json) | [Sección 7](specs/10-sub-workflows.md#7-prueba) |
| `11 · Datáfono` | De lunes a sábado a las 22:00; formulario | Importa el CSV de cobros con tarjeta como ventas, sin duplicar | HU-13 | [spec](specs/11-datafono.md) · [JSON](workflows/11-datafono.json) | [Sección 7](specs/11-datafono.md#7-prueba) |
| `12 · Panel de Marisa` | Webhook `GET /webhook/panel` con Basic Auth | Página web servida por n8n: cobrado hoy, recaudado en el mes, pendiente de cobro y apartados que vencen en 7 días o están fuera de plazo. Pide los datos a la API en cada visita | HU-15 | [spec](specs/12-panel-marisa.md) · [JSON](workflows/12-panel-marisa.json) | [Sección 7](specs/12-panel-marisa.md#7-prueba) |
| `13 · Servidor MCP` | MCP Server Trigger con Header Auth | Herramienta `estado_apartado` para otros agentes: estado, pendiente, abonado y fecha límite de un apartado. Solo lectura, sin datos personales | Experto (#136) | [spec](specs/13-servidor-mcp.md) · [JSON](workflows/13-servidor-mcp.json) | [Sección 6](specs/13-servidor-mcp.md#6-resultados-reales) |

Todos se han probado a mano en n8n con los datos de ejemplo. Están publicados el `01`, el `08`, los `10`, el `11` y el `12`. Los demás se exportan sin publicar: se prueban con su formulario o con *Execute workflow*, y la pareja los publica al ponerlos en marcha. Por eso las ejecuciones programadas del `05` (00:05) y del `06` (9:00) no se han visto todavía.

## Niveles

✅ hecho y en `dev` · ❌ no lo hacemos

### 🟢 Esencial

| Criterio del enunciado | Estado | Prueba |
|---|---|---|
| App y n8n con `docker compose`, conectados | ✅ | [Evento que llega a n8n](docs/evidencias/01-evento-llega-a-n8n.png) |
| Flujo 1 · Confirmación de apartado | ✅ | [Apartado completo](docs/evidencias/apartado-completo.md), [spec 01, sección 7](specs/01-eventos-tienda.md#7-prueba) |
| Flujo 2 · Recibo de abono | ✅ | [Apartado completo](docs/evidencias/apartado-completo.md), [spec 01, sección 7](specs/01-eventos-tienda.md#7-prueba) |
| Flujo 3 · Abonos a distancia | ✅ | [Spec 03, resultados reales](specs/03-abonos-distancia.md#resultados-reales--28102026), probado con el formulario. El nodo IMAP está desactivado porque Mailpit no tiene IMAP: en producción se activa con un buzón real |
| El flujo 3 resuelve los 8 correos; la IA solo extrae | ✅ | [Los 9 correos](specs/03-abonos-distancia.md#resultados-reales--28102026): 4 abonos registrados, 4 avisos a Marisa y la publicidad descartada sin llamar a la IA |
| Flujo 5 · Cierre diario | ✅ | [Resultados](docs/evidencias/05-hu04-resultados.md): un día con movimientos, un día sin movimientos y una repetición sin duplicar la fila en `Cierres` |
| Un único webhook con un Switch por `evento` | ✅ | [Spec 01](specs/01-eventos-tienda.md) |
| Mensajes al cliente con los importes de la app | ✅ | [Comprobación cifra a cifra](docs/evidencias/apartado-completo.md#5-comprobación-cifra-de-la-app--cifra-del-correo) |
| Error Workflow que avisa a la tienda | ✅ | [Spec 08, sección 7](specs/08-error-workflow.md#7-prueba) |
| Credenciales en n8n y JSON en GitHub | ✅ | [Credenciales](docs/credenciales.md), [revisión de secretos](docs/revision-secretos.md) |
| `AGENTS.md` y bitácora con los prompts de cada flujo principal | ✅ | [AGENTS.md](AGENTS.md) y [bitácora](docs/ai-log.md), con una entrada por flujo (también el `03` y el `05`) |

### 🟡 Medio

| Criterio del enunciado | Estado | Prueba |
|---|---|---|
| Flujo 4 · Venta grande | ✅ | [Spec 01, sección 7](specs/01-eventos-tienda.md#7-prueba) |
| Flujo 6 · Vencimientos (HU-07) | ✅ | [Spec 06, sección 7](specs/06-recordatorios-vencimientos.md#7-prueba) |
| Flujo 6 · Recordatorios a 7 días y a 1 día (HU-06) | ✅ | [Spec 06, sección 7](specs/06-recordatorios-vencimientos.md#7-prueba): una primera ejecución con 2 avisos y una segunda sin repetirlos |
| Flujo 7 · Informe mensual | ✅ | [Spec 07, sección 7](specs/07-informe-mensual.md#7-prueba) |
| Aviso al cliente con el código y el importe de su vale | ✅ | [Vale al cliente](docs/evidencias/06-hu07-vale-cliente.png) |
| Sub-workflows reutilizables | ✅ | [Spec 10, sección 7](specs/10-sub-workflows.md#7-prueba). Se usan en el `01`, el `06`, el `08` y el `11` (#95) |
| Migración del Excel | ✅ | [Spec 09, sección 7](specs/09-migracion-excel.md#7-prueba) |
| Informe mensual con tabla en el correo | ✅ | [Informe de octubre](docs/evidencias/07-hu08-informe-octubre.png) |
| Comparativa de 2 modelos gratuitos | ✅ | [Comparativa](docs/comparativa-modelos.md): `openai/gpt-oss-20b` y `openai/gpt-oss-120b` en la extracción del flujo 3 (calidad, velocidad y errores) |

### 🟠 Avanzado

| Criterio del enunciado | Estado | Prueba |
|---|---|---|
| Asistente de IA por Telegram (HU-11, HU-12) | ❌ | Solo el diseño de HU-11 ([spec 14](specs/14-asistente-telegram.md)), sin construir |
| Otra entrada de datos automática: datáfono (HU-13) | ✅ | [Spec 11, sección 7](specs/11-datafono.md#7-prueba). La variante «Apartados desde casa» no se hace |
| Recordatorios redactados por IA | ✅ | [Recordatorios con IA](docs/recordatorios-ia.md): el modelo solo escribe el saludo y la despedida y no recibe datos del cliente; importes y fechas los pone el flujo |
| Webhook protegido y validación de los datos | ❌ | La app no envía ninguna cabecera y no podemos tocar `backend/` (#117, #118) |
| Datos personales conforme al RGPD (HU-14) | ❌ | Solo limitamos lo que recibe Groq: en el flujo 3, ordenante, importe y concepto ([bitácora, #8](docs/ai-log.md#agente-modelos-y-n8n-mcp--8)); en los recordatorios, nada del cliente |
| Comandos o subagentes personalizados | ✅ | [`.claude/commands/`](.claude/commands/): `/revisar-flujo`, `/generar-spec` y `/cerrar-tarea` de Claude Code ([AGENTS.md, sección 6](AGENTS.md#6-forma-de-trabajo)) |

### 🔴 Experto

| Criterio del enunciado | Estado | Prueba |
|---|---|---|
| Panel sencillo para Marisa (HU-15) | ✅ | [Spec 12, sección 7](specs/12-panel-marisa.md#7-prueba): las cifras coinciden con la API, se actualizan al recargar y se ve en una columna en el móvil |
| n8n con PostgreSQL y copias de seguridad automáticas (HU-16) | ❌ | — |
| Despliegue en la nube con HTTPS (HU-16) | ❌ | — |
| CI con GitHub Actions que valide los JSON (HU-16) | ❌ | Validamos a mano con `validate_workflow` de n8n-mcp y `/revisar-flujo` |
| Flujos como servidor MCP (MCP Server Trigger) | ✅ | [Spec 13, sección 6](specs/13-servidor-mcp.md#6-resultados-reales): un agente llama a `estado_apartado` y recibe lo mismo que da la API |

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
- **Retry On Fail en todos los `GET` y nunca en los `POST`:** repetir un `POST` podría registrar dos veces un abono o una venta.
- **Históricos en Data tables de n8n** (`Cierres`, `recordatorios enviados`), sin Google Sheets: no hace falta OAuth ni una cuenta de Google para importar y probar.
- **El `06` vence y el `01` envía el vale:** el cliente recibe su vale aunque el apartado se venza por otra vía.
- **HU-13 con la variante Datáfono:** a las 22:00, antes del cierre, y sin duplicar lo que ya se apuntó a mano.
- **El panel es una web que sirve el propio n8n, con Basic Auth:** siempre al día y sin Looker Studio ni Google Sheets.

## Cómo nos organizamos

- **Kanban:** [Project «zapateria-paso-firme»](https://github.com/orgs/T3-P4-Auto-n8n/projects/1). Una historia por tarjeta, con sus tareas. Etiquetas por nivel (`esencial`, `medio`, `avanzado`, `experto`) y por tipo (`historia`, `tarea`).
- **Una tarea = una rama = una PR a `dev`**, con su spec, su JSON y su entrada en la bitácora.
- **Revisión:** la otra persona de la pareja aprueba cada PR antes de fusionarla. Así se han fusionado todas las PR del [historial](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pulls?q=is%3Apr).
- **Idiomas:** commits y PR en inglés, con Conventional Commits (`feat:`, `docs:`, `fix:`, `chore:`). Documentación en español.
- **Conflictos en `docs/ai-log.md`:** todas las ramas añaden su entrada al final. Antes de fusionar, se trae `dev` a la rama (`git merge origin/dev`) y se dejan las dos entradas, una detrás de otra, antes de «Decisiones abiertas».
- **Ramas:**
  - `main`: entrega; recibe `dev` en la entrega (29/10);
  - `dev`: integración;
  - `feature/…`, `docs/…`, `fix/…` y `chore/…`: siempre desde `dev`.

## Desarrollo con IA

- **Agentes:** Esra trabaja con Claude Code y Beste con Codex. Cada una en su rama, y las dos con el mismo [AGENTS.md](AGENTS.md).
- **Modelo gratuito en n8n:** Groq `openai/gpt-oss-20b` (capa gratuita):
  - en el `03`, solo para extraer ordenante, importe y concepto;
  - en el `06`, solo para el saludo y la despedida de los recordatorios.
- **Comparativa:** `openai/gpt-oss-20b` frente a `openai/gpt-oss-120b` en la extracción del `03`; nos quedamos con el 20B ([comparativa](docs/comparativa-modelos.md)).
- **Comandos de Claude Code** en [`.claude/commands/`](.claude/commands/): `/generar-spec`, `/revisar-flujo` y `/cerrar-tarea`. Ninguno hace commit ni publica flujos; Beste usa el mismo texto como prompt en Codex.
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
| 8 | Bitácora de IA | [docs/ai-log.md](docs/ai-log.md) |
| 9 | Historial de PR con revisiones | [Pull requests](https://github.com/T3-P4-Auto-n8n/zapateria-paso-firme/pulls?q=is%3Apr) |
| 10 | Retrospectiva de la pareja | [docs/retrospectiva.md](docs/retrospectiva.md) |

## Estructura del repo

```
├── workflows/     Workflows exportados de n8n (JSON)
├── specs/         Una spec por workflow, desde specs/_plantilla.md
├── docs/          Enunciado, instalación, ontología, guía de la app, credenciales, mapa, bitácora, comparativa, retrospectiva
│   └── evidencias/  Capturas de las pruebas
├── tests/         Eventos de prueba (payloads/) y tests de los nodos Code
├── scripts/       flujos.py (exportar/importar), datos_demo.py, comparar_modelos.py y generadores de nodos
├── data/          CSV del Excel antiguo y correos del banco de ejemplo
├── backend/, frontend/  La app de la tienda (no se toca)
└── AGENTS.md      Contexto y reglas para los agentes de IA
```

## Mejoras futuras

Lo que no hemos hecho y cómo lo haríamos:

- **Webhook protegido (HU-14):** Header Auth en el Webhook del `01` y que la app envíe esa clave en cada evento; hay que cambiar `backend/`, que no podíamos tocar.
- **Consentimiento y RGPD (HU-14):** guardar fuera de la app quién acepta recibir mensajes y comprobarlo antes de cada envío.
- **Abonos desde el buzón real:** activar el nodo IMAP del `03` con un correo real del banco; Mailpit no tiene IMAP.
- **Asistentes por Telegram (HU-11, HU-12):** Telegram solo envía mensajes a una URL pública con HTTPS, y n8n está en local. El diseño de HU-11 ya está en la [spec 14](specs/14-asistente-telegram.md).
- **Funcionar siempre (HU-16):** n8n en la nube con HTTPS, PostgreSQL con copias automáticas y GitHub Actions que valide los JSON de `workflows/` en cada PR.
- **Apartados desde casa:** la otra variante de HU-13.
