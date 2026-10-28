# HU-03 · Generadores históricos

El archivo vigente es `workflows/03-abonos-distancia.json`, un único flujo completo. Los generadores `generar_hu03_filtro.py`, `generar_hu03_extraccion.py`, `generar_hu03_busqueda.py`, `generar_hu03_decision.py`, `generar_hu03_registro.py` y `generar_hu03_aviso.py` pertenecen a la construcción por etapas y **ya no hacen falta para la entrega**. Se conservan como código histórico; no ejecutarlos para exportar o reconstruir el flujo consolidado: leen/escriben parciales retirados.

La fuente de la entrega final será el flujo construido y probado en n8n, exportado con `COMPOSE_PROJECT_NAME=zapateria-paso-firme python3 scripts/flujos.py exportar`. Revisar el diff y conservar solo el JSON 03 para esta PR. Las pruebas `node --test tests/test_hu03_*.cjs` ya leen el JSON único.
