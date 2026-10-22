<!--
Plantilla de spec · Paso Firme. Copiadla como specs/<nº>-<nombre-del-flujo>.md.
Usad solo las entidades y campos de docs/ontologia.md. Si falta algo, no lo inventéis: anotadlo como pregunta.
-->

# Flujo <nº> · <Nombre del flujo>

## 1. Cabecera

Datos para identificar el flujo y lo que necesita para funcionar.

- **Flujo:** <nº y nombre, como en "Automatizaciones a construir" del README>
- **HU:** <HU-xx>
- **Nivel:** <Esencial / Medio / Avanzado / Experto>
- **Responsable:** <quién de la pareja>
- **Credenciales y variables:** <solo nombres, nunca valores>

## 2. Objetivo

Qué problema de la tienda resuelve, en una frase.

## 3. Disparador y entradas

Qué lo activa (evento del webhook, programación o correo / formulario) y qué campos recibe, con los nombres de la ontología.

- **Disparador:** 
- **Entradas:** 

## 4. Pasos y reglas

Lo que hace el flujo, en orden: cada llamada a la API (método y endpoint) y cada decisión (IF / Switch) con sus caminos. `abonado` y `pendiente` los da la app; no se recalculan.

1. 

## 5. Salidas

Qué mensajes envía, a quién (cliente, Marisa, la tienda), por qué canal y con qué campos.

- 

## 6. Casos de error

Qué puede fallar (sin `email`, `401`, `404`, `422`, sin datos...) y qué hace el flujo en cada caso.

| Caso | Qué hace el flujo |
|---|---|
| | |

## 7. Prueba

Datos de entrada (payload o pinned data) y resultado esperado. Si la prueba falla, se arregla el flujo, no la prueba.

| Entrada | Resultado esperado |
|---|---|
| | |

## 8. Criterios de aceptación

Checklist copiada tal cual de la HU del README.

- [ ] 
