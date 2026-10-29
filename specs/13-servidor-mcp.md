# 13 · Servidor MCP · #136

## 1. Objetivo

Permitir a un agente de confianza del equipo consultar el estado actual de un apartado mediante MCP Server Trigger. Herramienta única `estado_apartado`, solo lectura y para personal autorizado, no para clientes Telegram.

## 2. Entrada y autenticación

MCP Server Trigger, path `paso-firme-estado`, Header Auth con credencial existente `API Tienda` (`X-API-Key`). Las pruebas se limitan a localhost. Es una restricción operativa, no un aislamiento de red: el compose existente publica 5678 en todas las interfaces del host; no se cambió ese binding. Mantener Header Auth y no abrir/redirigir el puerto hacia Internet. Test URL prevista `http://localhost:5678/mcp-test/paso-firme-estado`; URL de producción no habilitada. No se publica ni se habilita acceso MCP global de instancia.

Reutilizar la clave de tienda significa que el cliente MCP es un agente de confianza que ya dispone de esa clave. No distribuirla a clientes, modelos externos ni terceros. Una futura exposición remota requiere revisión humana y credencial separada de acceso limitado.

## 3. Herramienta

`estado_apartado(apartado_id: number)` valida entero seguro positivo antes de construir una URL fija `http://tienda:8000/api/apartados/{id}`. GET con Header Auth API Tienda, timeout 10 s; Retry On Fail 3 intentos/2 s solo para lectura. Ninguna URL, método o filtro general elegible por el modelo.

Respuesta reducida a `id`, `estado`, `pendiente`, `abonado`, `fecha_limite`. Los valores proceden de la API, sin recalcularlos. No nombre, email, teléfono, historial, ventas ni lista de todos los clientes.

404 = apartado no encontrado; 401/5xx/red = error de herramienta, nunca saldo inventado. No se añaden acciones de pago/vencimiento. El cliente agente decide cómo presentar el resultado, sin convertirlo en autorización para ver cuentas de clientes.

## 4. Configuración

JSON `workflows/13-servidor-mcp.json`, inactivo. Dos nodos: MCP Server Trigger versión 2 (sin propagación de cabeceras a herramientas) + HTTP Request Tool conectado por `ai_tool`. Referencias a credenciales, nunca valores. Error workflow 08 por referencia del equipo; su aviso de producción no se prueba durante escucha manual.

## 5. Pruebas previstas

- Validación local de ID (positivo, entero, no strings/NaN/Infinity/rutas), URL fija, método GET, allowlist y autenticación.
- n8n-mcp validate_workflow antes de PR.
- Desde este agente mediante cliente MCP: initialize → tools/list → tools/call para #1; comparar con GET directo actual. No enviar resultado a un modelo externo.
- Rechazar ID inválido sin petición a tienda; 404 para ID inexistente; ausencia de credencial sin acceso a datos.
- Captura de n8n y evidencia de protocolo reducida, sin cabeceras/clave.

## 6. Resultados reales

Prueba real desde Codex mediante cliente MCP JSON-RPC local el 28/10/2026: initialize (protocolo 2025-03-26) → tools/list (única herramienta estado_apartado) → tools/call. Sin enviar salidas API a modelos externos.

- Sin credencial: HTTP 403, probado en escucha independiente.
- ID 1: ejecución **71**, Succeeded 149 ms. Resultado exacto de API: `{id:1, estado:"activo", pendiente:19.5, abonado:15, fecha_limite:"2027-01-22"}`; solo los cinco campos permitidos.
- ID 0: ejecución **72**, error MCP `isError=true`. n8n presenta `URL parameter must be a string, got undefined` al evaluar la expresión inválida; no se obtiene un apartado. No se afirma que muestre el mensaje literal del guard. Pruebas locales también rechazan string/ruta, negativos, fraccionarios y números no seguros.
- ID 999999: ejecución **73**, escucha nueva, error MCP `isError=true`, «Apartado no encontrado». Un HTTP 404 anterior tras el error ID 0 era la escucha ya retirada, no una prueba de la API; se repitió correctamente y esa es la evidencia final.

El estado Succeeded del contenedor MCP no significa éxito de cada herramienta: se comprueba también `isError` en la respuesta JSON-RPC.

Evidencias: [protocolo reducido](../docs/evidencias/136-prueba-agente.json), [ejecución 71](../docs/evidencias/136-ejecucion.png), [respuesta mínima](../docs/evidencias/136-respuesta.png), [validación](../docs/evidencias/136-validacion.json).

Durante la preparación se detectó que la credencial API Tienda devolvía 401 y no coincidía con la clave local vigente (que daba 200). Se sincronizó con esa clave verificada mediante stdin en memoria; ID y nombre conservados, sin nueva clave ni cambio de permisos, sin escribir valores en disco/mensajes. La consulta MCP posterior y su GET interno acreditan que funciona.

No POST a tienda, modificaciones de DB, publicaciones ni activación MCP global. Export inactivo. La URL de producción no se probó. La escucha de pruebas se cerró al terminar.

## 7. Criterios

- [x] MCP Server Trigger expone estado_apartado con autenticación y solo GET.
- [x] Prueba desde agente, documentación y evidencias.
- [ ] Validación, revisión y PR a dev; export inactivo.

## 8. Repetir la prueba desde un cliente MCP

1. Importar el JSON, seleccionar API Tienda en ambos nodos y mantener el flujo inactivo.
2. En el trigger, pulsar **Execute step** y comprobar **Stop Listening**. La escucha temporal puede caducar; preparar el cliente antes.
3. Configurar en el cliente MCP el transporte Streamable HTTP y la Test URL mostrada por n8n; introducir X-API-Key mediante variable de entorno/almacén seguro, nunca en un fichero versionado ni en una conversación con un modelo. Debe ser la misma credencial seleccionada en el trigger.
4. El cliente negocia initialize y notifications/initialized; tools/list debe mostrar solo estado_apartado, cuyo argumento apartado_id es number.
5. Pedir estado_apartado con apartado_id=1 y comparar los cinco valores con la app. El agente solo debe usar esos valores de API.
6. Para repetir la prueba de ausencia de auth o un error, iniciar una escucha nueva. Un HTTP 404 con “webhook not registered” significa que caducó la escucha; no acredita un apartado inexistente. La inexistencia real es un resultado MCP isError=true con Apartado no encontrado.
7. Al terminar, detener la escucha si sigue activa; no pulsar Publish. La Production URL no funciona con el export inactivo.

Referencia técnica oficial: [MCP Server Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/), consultada el 28/10/2026. Se usó cliente JSON-RPC local de este agente, no se añadió configuración permanente de MCP a Codex ni se habilitó acceso global n8n.

### Ejemplo ejecutable de cliente sin secretos en argumentos

Con `API_KEY` ya disponible en el entorno de la terminal (no pegar su valor en este documento), ejecutar este cliente estándar Python **después** de iniciar la escucha. No guarda la clave, cabeceras ni configuración. Cambiar `MCP_APARTADO_ID` en el entorno a `0` o `999999` permite repetir los errores con una escucha nueva.

```bash
python3 - <<'PYCLIENT'
import json, os, urllib.request, urllib.error
url = 'http://localhost:5678/mcp-test/paso-firme-estado'
key = os.environ['API_KEY']
session = None
def rpc(method, params=None, ident=None):
    global session
    body = {'jsonrpc': '2.0', 'method': method}
    if params is not None: body['params'] = params
    if ident is not None: body['id'] = ident
    headers = {'Content-Type': 'application/json',
               'Accept': 'application/json, text/event-stream',
               'MCP-Protocol-Version': '2025-03-26', 'X-API-Key': key}
    if session: headers['Mcp-Session-Id'] = session
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            session = response.headers.get('Mcp-Session-Id', session)
            if response.status == 202: return {}
            if 'text/event-stream' in response.headers.get('Content-Type', ''):
                for line in response:
                    if line.startswith(b'data: '):
                        message = json.loads(line[6:])
                        if message.get('id') == ident: return message
            else: return json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit('HTTP ' + str(error.code) + '; revisar credencial o escucha')
    raise SystemExit('Sin respuesta MCP coincidente')
hello = rpc('initialize', {'protocolVersion': '2025-03-26', 'capabilities': {},
            'clientInfo': {'name': 'revision-paso-firme', 'version': '1.0'}}, 1)
if 'result' not in hello: raise SystemExit('Initialize falló')
rpc('notifications/initialized')
tools = rpc('tools/list', {}, 2)['result']['tools']
assert [tool['name'] for tool in tools] == ['estado_apartado']
result = rpc('tools/call', {'name': 'estado_apartado',
             'arguments': {'apartado_id': int(os.environ.get('MCP_APARTADO_ID', '1'))}}, 3)
print(json.dumps(result, ensure_ascii=False, indent=2))
PYCLIENT
```

La prueba sin auth se hace en una escucha independiente omitiendo el header X-API-Key del cliente: debe devolver HTTP 403 sin datos. No volver a interpretar un 404 de webhook retirado como error de negocio. Este ejemplo reproduce el protocolo usado en la evidencia; no registra permanentemente un servidor en el agente.
