"""Exporta e importa los flujos de n8n con su CLI, dentro del contenedor.

Uso (desde cualquier carpeta del repo, con `docker compose up -d` en marcha):
    python3 scripts/flujos.py exportar
    python3 scripts/flujos.py importar workflows/NN-nombre.json
"""

import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA_FLUJOS = RAIZ / "workflows"
TMP_CONTENEDOR = "/tmp/workflows"
PALABRAS_FUERA = {"de", "la", "del"}
CLAVES_EXPORTADAS = ["name", "nodes", "connections", "settings", "meta", "tags", "active", "id", "versionId"]


def docker(*args):
    """Ejecuta `docker compose ...` en la raíz del repo y para si falla."""
    resultado = subprocess.run(["docker", "compose", *args], cwd=RAIZ)
    if resultado.returncode != 0:
        sys.exit(f"Error al ejecutar: docker compose {' '.join(args)}")


def nombre_archivo(nombre):
    """'01 · Eventos de la tienda' -> '01-eventos-tienda.json'."""
    sin_tildes = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    palabras = re.findall(r"[a-z0-9]+", sin_tildes.lower())
    return "-".join(p for p in palabras if p not in PALABRAS_FUERA) + ".json"


def exportar():
    # Exporta un archivo por flujo dentro del contenedor (borrando lo de la vez anterior)
    docker("exec", "-T", "n8n", "sh", "-c", f"rm -rf {TMP_CONTENEDOR} && mkdir -p {TMP_CONTENEDOR}")
    docker("exec", "-T", "n8n", "n8n", "export:workflow", "--all", "--separate", f"--output={TMP_CONTENEDOR}/")

    with tempfile.TemporaryDirectory() as tmp:
        docker("cp", f"n8n:{TMP_CONTENEDOR}/.", tmp)
        CARPETA_FLUJOS.mkdir(exist_ok=True)

        for origen in sorted(Path(tmp).glob("*.json")):
            flujo = json.loads(origen.read_text(encoding="utf-8"))
            nombre = flujo.get("name", "")

            # Solo los flujos con el formato "NN · Nombre"; se ignoran los archivados
            if not re.match(r"^\d{2} ", nombre) or flujo.get("isArchived"):
                print(f"  omitido: {nombre!r}")
                continue

            # Solo las claves de la descarga desde la interfaz: el resto (shared, fechas...) trae datos de la instancia y del propietario
            flujo = {clave: flujo[clave] for clave in CLAVES_EXPORTADAS if clave in flujo}
            destino = CARPETA_FLUJOS / nombre_archivo(nombre)
            destino.write_text(json.dumps(flujo, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"  {nombre} -> {destino.relative_to(RAIZ)}")

    print("Revisa el diff antes de hacer commit: sin claves ni datos personales reales.")


def importar(ruta):
    archivo = Path(ruta).resolve()
    if not archivo.is_file():
        sys.exit(f"No existe el archivo: {ruta}")

    # Copia el JSON al contenedor y lo importa con la CLI de n8n
    destino = f"/tmp/{archivo.name}"
    docker("cp", str(archivo), f"n8n:{destino}")
    docker("exec", "-T", "n8n", "n8n", "import:workflow", f"--input={destino}")
    print(f"Importado: {archivo.name}. Revisa en n8n que no se haya publicado solo.")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "exportar":
        exportar()
    elif len(sys.argv) == 3 and sys.argv[1] == "importar":
        importar(sys.argv[2])
    else:
        sys.exit(__doc__)
