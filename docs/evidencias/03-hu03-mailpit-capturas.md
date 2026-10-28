# HU-03 · Capturas reales de Mailpit

Capturadas el 28/10/2026 abriendo cada mensaje y mostrando cabecera y cuerpo. No se reenviaron mensajes ni pagos.

| Caso | Captura | Resultado visible | Mailpit ID |
|---|---|---|---|
| 02 Jorge | [03-hu03-02-jorge-mailpit.png](03-hu03-02-jorge-mailpit.png) | Recibo 20 €, apartado 2, pendiente 59 € | `14hGhtImJ7BNm81ZmZL0uK` |
| 03 Lucía | [03-hu03-03-lucia-mailpit.png](03-hu03-03-lucia-mailpit.png) | Recogida tras abono 12 €, apartado 3 | `1mFB6sSxhMxqOMWEPZneLa` |
| 04 Laura | [03-hu03-04-laura-mailpit.png](03-hu03-04-laura-mailpit.png) | Aviso: importe supera pendiente 10 € | `7ajqxZi3osr1rQgUAUx6nC` |
| 05 Romero | [03-hu03-05-romero-mailpit.png](03-hu03-05-romero-mailpit.png) | Aviso: falta concepto suficiente | `0fpMxLix9Wtk9mEAlCDDHf` |
| 06 Paula | [03-hu03-06-paula-mailpit.png](03-hu03-06-paula-mailpit.png) | Aviso: fuera de plazo | `1XDqk5A7DcL9KqEYiEEFyF` |
| 07 Desconocido | [03-hu03-07-desconocido-mailpit.png](03-hu03-07-desconocido-mailpit.png) | Aviso: ningún apartado coincide claramente | `0s1ELzX2Cy9n2Ev0SEOHhp` |
| 09 Silvia | [03-hu03-09-silvia-mailpit.png](03-hu03-09-silvia-mailpit.png) | Recibo 5 €, apartado 24, pendiente 30 € | `7Peh57cbyoj3kngBTE2TcK` |

**01 Carmen:** recibo recuperado mediante replay explícitamente autorizado del evento `abono.registrado` existente (abono #84), solo al webhook del 01; no se repitió el registro del abono. [Captura](03-hu03-01-carmen-mailpit.png) · [Verificación antes/después](03-hu03-01-carmen-recibo-replay.json). Mailpit ID `3t2sZ7mflqSEzLi2Gto6GX`. Pendiente 9.50 €, abonado 25 €, mismos IDs de abonos [1,2,84] antes/después. Esta prueba acredita la entrega del recibo por 01, no una nueva ejecución completa de 03. **08 Publicidad:** no debe generar correo; su evidencia debe ser la rama Ignorar publicidad y comparación de mensajes, no una captura de email inexistente.
