# Mapa del proceso de apartado · hoy y automatizado

Entregable 1 del [README](../README.md#-entregables) (#141): cómo se lleva hoy un apartado en Paso Firme y cómo queda con la app y n8n. Los diagramas son Mermaid, que GitHub dibuja directamente.

Fuentes: el [README](../README.md) (planteamiento, reglas del negocio, automatizaciones e historias de usuario), la [ontología](ontologia.md), la [guía de la app](guia-de-la-app.md), [AGENTS.md](../AGENTS.md) (secciones 2, 5 y 8), las specs de `specs/`, los JSON de `workflows/` y los CSV del Excel antiguo de [`data/`](../data/).

## 1. Hoy (a mano)

Todo se lleva con una libreta, un Excel y la calculadora. En [`data/excel_actual_apartados.csv`](../data/excel_actual_apartados.csv) los apartados y los abonos van mezclados en la misma hoja, con la columna `resta` calculada a mano. En [`data/excel_actual_ventas.csv`](../data/excel_actual_ventas.csv) están las ventas del día, con los abonos apuntados también como ventas y un `TOTAL SEPTIEMBRE (a mano)` al final.

Los pasos en rojo son los problemas que describe el README.

```mermaid
flowchart TB
    subgraph CLI["Cliente"]
        C1(["Elige unos zapatos"])
        C2["Paga un abono en la tienda"]
        C3["Paga desde casa por Bizum o transferencia"]
        C4["Pregunta cuánto le falta"]
        C5["Recoge sus zapatos"]
        C6["Nadie le avisa del plazo y se olvida"]
    end

    subgraph DEP["Dependienta"]
        D1["Apunta el apartado en la libreta: modelo, talla, precio y abono inicial (mínimo 5 €)"]
        D2["Apunta el abono en la libreta"]
        D3["Busca en la libreta cuánto ha pagado y cuánto falta, a veces no cuadra"]
        D4{"¿Falta 0 €?"}
        D5["Entrega los zapatos"]
    end

    subgraph BAN["Banco"]
        B1["Envía a Marisa el aviso del pago"]
    end

    subgraph MAR["Marisa"]
        M1["Revisa los avisos del banco"]
        M2["Adivina de qué apartado es cada pago y lo apunta a mano; algunos se le pasan"]
        M3["Apunta las ventas del día en el Excel"]
        M4["Cierre de caja diario con calculadora, tarde y con errores"]
        M5["Suma mensual con calculadora"]
        M6["No sabe cuánto tiene pendiente de cobro"]
        M7["Pasan los 3 meses: nadie cierra el apartado y los zapatos se quedan en el almacén"]
    end

    C1 --> D1
    D1 --> C2
    C2 --> D2
    C3 --> B1 --> M1 --> M2
    M2 --> D3
    D2 --> D3
    C4 --> D3
    D3 --> D4
    D4 -- "Sí" --> D5 --> C5
    D4 -- "No, sigue pagando" --> C2
    D4 -- "No, y no vuelve" --> C6 --> M7
    D2 --> M3 --> M4 --> M5 --> M6

    classDef dolor fill:#fde2e1,stroke:#c0392b,color:#7b1d14
    class D3,M2,M4,M5,M6,M7,C6 dolor
```

**Problemas** (README, «Planteamiento»):

1. Hay que buscar en la libreta cuánto ha pagado un cliente y cuánto le falta, y a veces las cuentas no cuadran.
2. Nadie avisa a los clientes de que su plazo está a punto de vencer: hay apartados olvidados con zapatos ocupando el almacén.
3. El cierre de caja diario y la suma mensual se hacen con calculadora, tarde y con errores.
4. Marisa no sabe en ningún momento cuánto dinero tiene pendiente de cobro.
5. Con los pagos por Bizum o transferencia, Marisa tiene que revisar los avisos del banco, adivinar de qué apartado es cada uno y apuntarlo a mano; algunos se le pasan.

## 2. Automatizado (app y n8n)

La dependienta registra en la app los apartados, los abonos en la tienda y las ventas. La app calcula `abonado`, `pendiente`, `fecha_limite` y el estado, y avisa a n8n por el webhook (`POST /webhook/tienda`, un solo Switch en el `01`). Los flujos programados consultan la API.

Los pasos en verde los hace n8n, y cada uno lleva el nombre del flujo y su disparador. Los azules son de la app. Los amarillos siguen siendo trabajo de personas.

```mermaid
flowchart TB
    subgraph CLI["Cliente"]
        C1(["Elige unos zapatos"])
        C2["Paga un abono en la tienda"]
        C3["Paga desde casa por Bizum o transferencia"]
        C4["Recibe la confirmación: producto, talla, precio, abonado, pendiente y fecha límite"]
        C5["Recibe el recibo con lo que falta"]
        C6["Recibe el aviso de que puede recoger sus zapatos"]
        C7["Recibe el recordatorio: vence en 7 días o en 1 día"]
        C8["Recibe su vale: código e importe"]
        C9["Recoge sus zapatos"]
    end

    subgraph DEP["Dependienta"]
        D1["Registra el apartado en la app con el abono inicial"]
        D2["Registra el abono en la app"]
        D3["Registra una venta directa en la app"]
        D4["Entrega los zapatos"]
    end

    subgraph BAN["Banco"]
        B1["Envía el aviso del pago por correo"]
    end

    subgraph APP["App de la tienda"]
        A1["Crea el apartado activo y calcula abonado, pendiente y fecha límite"]
        A2{"¿pendiente = 0 €?"}
        A3["Lo pasa a liquidado"]
        A4["Lo pasa a vencido y genera el vale con lo abonado"]
        A5["Guarda la venta"]
    end

    subgraph N8N["n8n"]
        N1["01 · Eventos de la tienda (evento apartado.creado): confirmación"]
        N2["01 · Eventos de la tienda (evento abono.registrado): recibo o aviso de recogida"]
        N3["01 · Eventos de la tienda (evento venta.registrada): aviso si supera el umbral de Configuración"]
        N4["01 · Eventos de la tienda (evento apartado.vencido): vale al cliente"]
        R1["06 · Recordatorios y vencimientos (cada mañana): recordatorios a 7 días y a 1 día"]
        V1["06 · Recordatorios y vencimientos (cada mañana, 9:00): vence por API los activos con fecha límite anterior a hoy"]
        F1["11 · Datáfono (lunes a sábado, 22:00): importa el CSV de cobros con tarjeta como ventas, sin duplicar"]
        K1["05 · Cierre diario (cada noche, 00:05): ventas y abonos de ayer por forma de pago, guardado en Google Sheets"]
        I1["07 · Informe mensual (día 1, 8:00): recaudación, pendiente de cobro y apartados nuevos, liquidados y vencidos"]
        E1["08 · Error Workflow (si falla cualquier flujo): flujo, paso y error"]
        SUB["10 · Buscar apartado y 10 · Enviar notificación: sub-workflows que usan el 01, el 06, el 08 y el 11"]

        subgraph F3["03 · Abonos a distancia (correo nuevo del banco)"]
            T1{"¿Es un pago?"}
            T0["Se ignora (publicidad)"]
            T2["La IA (Groq) solo extrae ordenante, importe y concepto"]
            T3{"¿Extracción válida?"}
            T4["Busca el apartado por API: nº de apartado del concepto o nombre"]
            T5{"¿Un único apartado claro?"}
            T6{"¿Activo, en plazo e importe no mayor que pendiente?"}
            T7["Registra el abono por API con forma_pago bizum"]
            T8{"¿La app lo acepta?"}
            T9["No registra nada y pregunta o avisa a Marisa con el motivo"]
        end
    end

    subgraph MAR["Marisa"]
        M1["Revisa el pago dudoso y decide"]
        M2["Aviso de venta grande"]
        M3["Lista de zapatos que vuelven a la venta"]
        M4["Devuelve los zapatos a la venta"]
        M5["Resumen del cierre diario"]
        M6["Informe mensual"]
        M7["Aviso de error"]
        M8["Resumen de la importación del datáfono"]
    end

    C1 --> D1 --> A1 --> N1 --> C4
    C2 --> D2 --> A2
    A2 -- "No" --> N2
    A2 -- "Sí" --> A3 --> N2
    N2 -- "activo" --> C5
    N2 -- "liquidado" --> C6 --> C9 --> D4

    C3 --> B1 --> T1
    T1 -- "No" --> T0
    T1 -- "Sí" --> T2 --> T3
    T3 -- "No" --> T9
    T3 -- "Sí" --> T4 --> T5
    T5 -- "No: varios, sin concepto o desconocido" --> T9
    T5 -- "Sí" --> T6
    T6 -- "No: fuera de plazo o paga de más" --> T9
    T6 -- "Sí" --> T7 --> T8
    T8 -- "No (422)" --> T9
    T8 -- "Sí" --> A2
    T9 --> M1

    R1 --> C7 --> C2
    V1 --> A4 --> N4 --> C8
    V1 --> M3 --> M4

    D3 --> A5
    F1 --> A5
    F1 --> M8
    A5 --> N3 --> M2

    K1 --> M5
    I1 --> M6
    E1 --> M7

    classDef auto fill:#dff5e3,stroke:#1e8449,color:#145a32
    classDef app fill:#ddeaf7,stroke:#2e6da4,color:#1b4f72
    classDef humano fill:#fff3cd,stroke:#b7950b,color:#7d6608
    class N1,N2,N3,N4,R1,V1,F1,K1,I1,E1,SUB,T0,T2,T4,T7,T9 auto
    class A1,A3,A4,A5 app
    class D1,D2,D3,D4,M1,M4 humano
```

Cómo se lee:

- **Lo que sigue siendo humano:**
  - el alta del apartado, los abonos en la tienda y las ventas directas, que la dependienta registra en la app;
  - entregar los zapatos;
  - revisar los pagos dudosos del `03`;
  - devolver a la venta los zapatos de los apartados vencidos.
- **El `03` no decide con la IA.** La IA solo extrae ordenante, importe y concepto. Los rombos son reglas del flujo con los datos de la API. Si el flujo registra el abono, la app envía `abono.registrado` y el recibo lo manda el `01`, igual que para un abono en la tienda. Las transferencias también se registran con `forma_pago` `bizum`, porque la app no acepta `transferencia` (AGENTS.md, sección 8). El disparador final es el correo del banco por IMAP; para las pruebas, el flujo tiene un formulario con el asunto y el cuerpo.
- **Clientes sin email** (no aparecen en el diagrama):
  - en la confirmación (HU-01) y en el vale (HU-07), el `01` avisa a la tienda con el teléfono;
  - en el recibo de un abono (HU-02), no se envía nada (AGENTS.md, sección 8).
- **El vale lo envía el `01`, no el `06`.** El `06` vence el apartado con `POST /api/apartados/{id}/vencer` y la app envía el webhook `apartado.vencido`. Así el cliente recibe su vale aunque el apartado se venza por otra vía.
- **El orden de la noche:** el `11` importa el datáfono a las 22:00 (de lunes a sábado), y a las 00:05 el `05` cierra el día anterior con lo importado. Las ventas del datáfono que superan el umbral también pasan por el aviso de venta grande del `01`.
- **El `08`** está asignado como Error workflow en el `01`, el `03`, el `05`, el `06`, el `07`, el `09` y el `11`. Los sub-workflows `10` no lo tienen: sus errores los avisa el `08` del flujo que los llama.
- **Fuera del ciclo:** `09 · Migración del Excel` se usa una vez, con un formulario, para pasar a la app los CSV de `data/`. Los casos dudosos van en un informe a la tienda.
- Todos los correos a Marisa llegan a `tienda@pasofirme.example` (en las pruebas, por Mailpit).

## 3. Ciclo de vida del apartado

Los estados son los de la [ontología](ontologia.md#estados): `activo`, `liquidado` y `vencido`.

```mermaid
stateDiagram-v2
    [*] --> activo: La dependienta lo registra en la app con el abono inicial (mínimo 5 €)
    activo --> activo: Abono en la tienda o del 03 que deja pendiente mayor que 0 €
    activo --> liquidado: Un abono deja pendiente en 0 € (lo hace la app)
    activo --> vencido: El 06 llama a POST /vencer pasada la fecha límite
    vencido --> [*]: La app genera el vale y el 01 lo envía al cliente
    liquidado --> [*]: El cliente recoge sus zapatos
```

Un apartado con la `fecha_limite` pasada sigue `activo` hasta que el `06` lo vence; la app no lo hace sola. El `06` solo vence los que tienen la `fecha_limite` anterior a hoy, así que el día de la fecha límite todavía se puede abonar.

## 4. Antes → después

| Problema de hoy (README) | Cómo queda | Flujo |
|---|---|---|
| Buscar en la libreta cuánto ha pagado y cuánto falta; las cuentas no cuadran | La app calcula `abonado` y `pendiente`. El cliente los recibe en cada confirmación y recibo, con los importes de la app, sin recalcular | [`01 · Eventos de la tienda`](../specs/01-eventos-tienda.md) |
| Nadie avisa del plazo; zapatos olvidados en el almacén | Recordatorio a 7 días y a 1 día. Pasado el plazo, el apartado se vence por API, el cliente recibe su vale y Marisa la lista de zapatos que vuelven a la venta | [`06 · Recordatorios y vencimientos`](../specs/06-recordatorios-vencimientos.md) y la rama `apartado.vencido` del [`01`](../specs/01-eventos-tienda.md) |
| Cierre de caja diario con calculadora | Cada noche, un resumen de ventas directas, abonos y total por forma de pago, guardado también en Google Sheets | [`05 · Cierre diario`](../specs/05-cierre-diario.md) |
| Suma mensual con calculadora | El día 1, un informe con la recaudación del mes anterior (ventas directas y abonos por separado) y los apartados nuevos, liquidados y vencidos | [`07 · Informe mensual`](../specs/07-informe-mensual.md) |
| No sabe cuánto tiene pendiente de cobro | El informe mensual trae el total pendiente de cobro (suma del `pendiente` de los apartados `activo` que da la app). Con su formulario se puede pedir cualquier día, y da el pendiente del momento | [`07 · Informe mensual`](../specs/07-informe-mensual.md) |
| Revisar los avisos del banco, adivinar el apartado y apuntarlo; algunos se pasan | Cada correo del banco se lee solo: se registra el abono si el apartado está claro y se puede abonar; si no, no se registra nada y se pregunta a Marisa con el motivo | [`03 · Abonos a distancia`](../specs/03-abonos-distancia.md) |

Además, sin un problema propio en el README:

- [`01 · Eventos de la tienda`](../specs/01-eventos-tienda.md): el aviso de venta grande (HU-09).
- [`11 · Datáfono`](../specs/11-datafono.md): los cobros con tarjeta entran solos (HU-13).
- [`08 · Error Workflow`](../specs/08-error-workflow.md): si una automatización falla, Marisa se entera (HU-05).
- [`10 · Buscar apartado` y `10 · Enviar notificación`](../specs/10-sub-workflows.md): sub-workflows comunes a los flujos.
