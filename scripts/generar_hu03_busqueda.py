"""Genera la exportación parcial de búsqueda de HU-03 (#35)."""
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]


def node(name, kind, params, position, version=1, **extra):
    return {
        'name': name,
        'id': str(uuid5(NAMESPACE_URL, 'pasofirme/hu03/busqueda/' + name)),
        'type': 'n8n-nodes-base.' + kind,
        'typeVersion': version,
        'position': position,
        'parameters': params,
        **extra,
    }


def link(workflow, source, destination):
    workflow['connections'][source] = {
        'main': [[{'node': destination, 'type': 'main', 'index': 0}]]
    }


def build():
    workflow = json.loads((ROOT / 'workflows/03-abonos-distancia-extraccion.json').read_text())
    workflow['name'] = '03 · Abonos a distancia (búsqueda)'
    form = next(n for n in workflow['nodes'] if n['type'].endswith('.formTrigger'))
    form['parameters']['options']['path'] = 'hu03-busqueda'
    form['webhookId'] = str(uuid5(NAMESPACE_URL, 'pasofirme/hu03/busqueda/form'))
    form['parameters']['formDescription'] = 'HU-03 · Prueba de búsqueda. Solo correos ficticios. No registra abonos ni envía recibos.'
    workflow['active'] = False

    note = next(n for n in workflow['nodes'] if n['type'].endswith('.stickyNote'))
    note['name'] = 'Notas de búsqueda HU-03'
    note['parameters']['content'] = (
        '## HU-03 · Búsqueda (#35)\n'
        'Borrador parcial e inactivo. Asignar credenciales Groq y API Tienda; seleccionar el 08 local en Settings. '
        'IMAP sigue deshabilitado. Usar solo correos ficticios. La URL de búsqueda ya fue validada en #34. '
        'Esta etapa solo hace GET; no registra abonos ni envía emails. Ver docs/hu03-busqueda.md.'
    )
    workflow['nodes'].extend([
        node('Buscar apartado', 'httpRequest', {
            'method': 'GET',
            'url': '={{ $json.url_busqueda }}',
            'authentication': 'genericCredentialType',
            'genericAuthType': 'httpHeaderAuth',
            'options': {
                'response': {'response': {
                    'fullResponse': True,
                    'neverError': True,
                    'responseFormat': 'json',
                }},
            },
        }, [2550, -150], 4.5,
            credentials={'httpHeaderAuth': {'id': None, 'name': 'API Tienda'}},
        ),
        node('Resultados de búsqueda (#36)', 'noOp', {}, [2800, -150]),
    ])

    link(workflow, 'Continuar con búsqueda (#35)', 'Buscar apartado')
    link(workflow, 'Buscar apartado', 'Resultados de búsqueda (#36)')
    return workflow


if __name__ == '__main__':
    output = ROOT / 'workflows/03-abonos-distancia-busqueda.json'
    output.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
    print(output.relative_to(ROOT))
