/** Arredonda pro múltiplo de 10 minutos mais próximo, carregando a hora quando passa de 60. */
export function formatHoursMinutes(value: number): string {
  const totalMinutes = Math.round((value * 60) / 10) * 10;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}min`;
}
