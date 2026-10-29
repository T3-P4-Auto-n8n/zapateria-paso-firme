#!/usr/bin/env python3
"""Add only the three AI style nodes to the exported HU-06 email branch."""
import json
from pathlib import Path
import uuid

root = Path(__file__).resolve().parents[1]
path = root / 'workflows/06-recordatorios-y-vencimientos.json'
w = json.loads(path.read_text())
names = ['Preparar redacción del recordatorio', 'Redactar con Groq', 'Validar redacción del recordatorio']
w['nodes'] = [n for n in w['nodes'] if n['name'] not in names]
for name in names:
    w['connections'].pop(name, None)

def node(name, kind, parameters, position):
    return {'parameters': parameters, 'type': 'n8n-nodes-base.' + kind,
            'typeVersion': 2 if kind == 'code' else 4.4,
            'position': position, 'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'paso-firme/121/' + name)), 'name': name}

prepare = node(names[0], 'code', {'mode': 'runOnceForEachItem', 'jsCode': (root/'scripts/hu06/preparar-redaccion.js').read_text()}, [1776, 640])
http = node(names[1], 'httpRequest', {'method': 'POST', 'url': 'https://api.groq.com/openai/v1/chat/completions', 'authentication': 'predefinedCredentialType', 'nodeCredentialType': 'groqApi', 'sendBody': True, 'specifyBody': 'json', 'jsonBody': '={{ JSON.stringify({model:"openai/gpt-oss-20b",temperature:0,max_completion_tokens:1024,reasoning_effort:"low",response_format:{type:"json_object"},messages:[{role:"system",content:$json.prompt_ia},{role:"user",content:"Devuelve las dos frases cordiales, sin otros datos."}]}) }}', 'options': {'timeout': 20000, 'response': {'response': {'fullResponse': True, 'neverError': True, 'responseFormat': 'json'}}}}, [2000,640])
http['credentials'] = {'groqApi': {'id': 'AnfBC8J72G4tF4nA', 'name': 'Groq'}}
http['onError'] = 'continueRegularOutput'
http['retryOnFail'] = False
validate = node(names[2], 'code', {'mode': 'runOnceForEachItem', 'jsCode': (root/'scripts/hu06/validar-redaccion.js').read_text()}, [2224,640])
w['nodes'].extend([prepare,http,validate])
def edge(name): return {'node': name, 'type': 'main', 'index': 0}
w['connections']['¿Tiene email para el recordatorio?']['main'][0] = [edge(names[0])]
for source,target in zip(names, names[1:] + ['Enviar recordatorio al cliente']):
    w['connections'][source] = {'main': [[edge(target)]]}
w['active'] = False
path.write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n')
print('Updated inactive HU-06:', len(w['nodes']), 'nodes')
