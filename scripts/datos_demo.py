"""Genera actividad en la tienda llamando a la API, para que la app envíe eventos reales a n8n.

Crea 2 apartados (uno con email y otro sin él), 1 abono parcial, 1 abono que liquida
y 1 venta. Dispara: apartado.creado, abono.registrado (activo y liquidado) y venta.registrada.

Uso (desde cualquier carpeta del repo, con `docker compose up -d` en marcha):
    python3 scripts/datos_demo.py
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
# Se ejecuta desde el ordenador, no desde n8n: por eso localhost y no tienda
URL_BASE = "http://localhost:8000"


def leer_api_key():
    """API_KEY de la variable de entorno o, si no está, del .env de la raíz."""
    if os.environ.get("API_KEY"):
        return os.environ["API_KEY"]
    env = RAIZ / ".env"
    if env.is_file():
        for linea in env.read_text(encoding="utf-8").splitlines():
            clave, _, valor = linea.strip().partition("=")
            if clave == "API_KEY" and valor:
                return valor.strip().strip("\"'")
    sys.exit("Falta API_KEY: defínela en el .env o como variable de entorno.")


API_KEY = leer_api_key()


def post(ruta, datos):
    """POST a la API. Devuelve el JSON de respuesta, o None si la API da error."""
    peticion = urllib.request.Request(
        URL_BASE + ruta,
        data=json.dumps(datos).encode(),
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(peticion, timeout=10) as respuesta:
            return json.load(respuesta)
    except urllib.error.HTTPError as error:
        # La app responde {"detail": "..."} en los 401, 404 y 422
        try:
            detalle = json.load(error).get("detail")
        except ValueError:
            detalle = error.reason
        print(f"  ✗ {ruta} → {error.code}: {detalle}")
    except urllib.error.URLError as error:
        sys.exit(f"No se pudo conectar con {URL_BASE} ({error.reason}). ¿Está levantada la app?")
    return None


def mostrar(que, apartado):
    print(f"  ✓ {que}: apartado {apartado['id']} · estado {apartado['estado']} · pendiente {apartado['pendiente']} €")


def main():
    print("Apartados")
    con_email = post("/api/apartados", {
        "cliente": "Lucía Demo", "email": "lucia.demo@example.com", "telefono": "600 000 001",
        "producto": "Botín piel marrón", "talla": "38", "precio": 89.9,
        "abono_inicial": 10, "forma_pago": "bizum",
    })
    if con_email:
        mostrar("con email", con_email)

    sin_email = post("/api/apartados", {
        "cliente": "Andrés Demo", "telefono": "600 000 002",
        "producto": "Zapatilla running azul", "talla": "42", "precio": 64.5,
        "abono_inicial": 5, "forma_pago": "efectivo",
    })
    if sin_email:
        mostrar("sin email", sin_email)

    print("Abonos")
    if con_email:
        parcial = post(f"/api/apartados/{con_email['id']}/abonos", {"importe": 20, "forma_pago": "tarjeta"})
        if parcial:
            mostrar("abono parcial de 20 €", parcial)

    if sin_email:
        # Se abona justo el pendiente que devuelve la app, sin recalcularlo
        liquida = post(f"/api/apartados/{sin_email['id']}/abonos",
                       {"importe": sin_email["pendiente"], "forma_pago": "efectivo"})
        if liquida:
            mostrar(f"abono de {sin_email['pendiente']} € que liquida", liquida)

    print("Ventas")
    venta = post("/api/ventas", {"concepto": "Crema calzado", "importe": 4.5, "forma_pago": "efectivo"})
    if venta:
        print(f"  ✓ venta {venta['id']} · {venta['concepto']} · {venta['importe']} € · {venta['forma_pago']}")


if __name__ == "__main__":
    main()
