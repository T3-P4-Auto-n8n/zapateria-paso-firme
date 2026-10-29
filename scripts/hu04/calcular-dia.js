// Code: Run Once for All Items. La programación cierra ayer, según Madrid.
const input = $input.first().json;
let fecha;
if (Object.hasOwn(input, 'fecha')) {
  fecha = input.fecha;
} else {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date($now.toISO()));
  const value = type => parts.find(part => part.type === type).value;
  const yesterday = new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  fecha = yesterday.toISOString().slice(0, 10);
}
if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !Number.isFinite(Date.parse(fecha + 'T00:00:00Z')) ||
    new Date(fecha + 'T00:00:00Z').toISOString().slice(0, 10) !== fecha) {
  throw new Error('Fecha inválida: usa AAAA-MM-DD con un día existente');
}
return [{json: {fecha, desde: fecha, hasta: fecha}}];
