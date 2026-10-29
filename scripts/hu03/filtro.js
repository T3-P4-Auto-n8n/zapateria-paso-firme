// #33: clasificar el aviso; la extracción de campos corresponde a #34.
if ($json.entrada_valida !== true) {
  return {json:{...$json,es_pago:false,ruta:'revisar',motivo:$json.motivo || 'Entrada inválida; revisar antes de continuar'}};
}
const texto = ($json.asunto + '\n' + $json.cuerpo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const es_pago = /\b(?:has recibido un bizum|transferencia recibida|se ha abonado una transferencia)\b/.test(texto);
return {json:{...$json,es_pago,ruta:es_pago ? 'extraer' : 'ignorar',motivo:es_pago ? '' : 'No es un aviso de pago recibido reconocido'}};
