"""Solo GET: obtiene cobros sin datos personales y calcula controles Decimal para HU-04."""
import argparse
import json
import os
from datetime import date
from decimal import Decimal
from pathlib import Path
from urllib.request import Request, urlopen

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--fecha',required=True,type=date.fromisoformat)
    p.add_argument('--env-file',type=Path)
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args()
    key=os.environ.get('API_KEY')
    if not key and a.env_file:
        for line in a.env_file.read_text().splitlines():
            if line.startswith('API_KEY='):
                key=line.split('=',1)[1].strip().strip('\"\'');break
    if not key:raise SystemExit('Falta API_KEY (entorno o --env-file); no se muestra su valor')
    result={'fecha':a.fecha.isoformat(),'source':'GET API local; sin POST ni datos personales','reference':{}}
    for collection in ['ventas','abonos']:
        url=f'http://localhost:8000/api/{collection}?desde={a.fecha}&hasta={a.fecha}'
        try:
            with urlopen(Request(url,headers={'X-API-Key':key}),timeout=15) as response:
                records=json.load(response)
        except Exception:
            raise SystemExit(f'No se pudo consultar GET /api/{collection}; comprueba servicio y credencial') from None
        result[collection]=[{k:row[k] for k in ['id','fecha','importe','forma_pago']} for row in records]
        totals={method:Decimal('0') for method in ['efectivo','tarjeta','bizum']}
        for row in records:totals[row['forma_pago']]+=Decimal(str(row['importe']))
        result['reference'][collection]={k:float(v) for k,v in totals.items()}
        result['reference'][collection]['total']=float(sum(totals.values()))
        result['reference'][collection]['operaciones']=len(records)
    result['reference']['total']=float(sum(Decimal(str(result['reference'][k]['total'])) for k in ['ventas','abonos']))
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'fecha':result['fecha'],'reference':result['reference']},ensure_ascii=False))
if __name__=='__main__':main()
