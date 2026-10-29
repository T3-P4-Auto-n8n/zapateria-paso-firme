// Run once for each item. The model receives generic style instructions only.
const base = $json;
if (typeof base.texto !== 'string' || !base.texto || typeof base.para !== 'string') throw new Error('Falta el recordatorio original');
const prompt_ia = 'Redacta en español dos frases breves y cercanas para acompañar un recordatorio de Zapatería Paso Firme. Devuelve JSON con exactamente introduccion y despedida, ambas strings. Solo tono cordial; no incluyas datos personales, cifras, números escritos, importes, pagos, descuentos, fechas, plazos, enlaces ni instrucciones de negocio. No uses artículos un/una. No saludes a ninguna persona concreta. Ejemplo de estilo: Te escribimos con cariño para cuidar de tu apartado. / Nos encantará verte por la tienda. No añadas información ni promesas.';
return { json: { ...base, prompt_ia } };
