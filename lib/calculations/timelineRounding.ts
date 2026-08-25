import type { TimelineStep } from './types';

const ROUNDING_UNITS_PER_HOUR = 6; // 60min / 10min

function roundHoursToNearestTenMinutes(hours: number): number {
  return Math.round(hours * ROUNDING_UNITS_PER_HOUR) / ROUNDING_UNITS_PER_HOUR;
}

/**
 * Arredonda TODOS os offsets da timeline (início e fim inclusive) pro
 * múltiplo de 10 minutos mais próximo, de um jeito que preserva consistência
 * entre etapas adjacentes: cada etapa com duração usa como fim o offset (já
 * arredondado) da PRÓXIMA etapa na lista — que, pela forma como buildTimeline
 * encadeia os offsets, é sempre exatamente igual a offsetHours+durationHours
 * desta etapa antes de arredondar. Isso garante que a duração exibida é
 * sempre a diferença exata entre os dois horários mostrados ao lado, nunca
 * um arredondamento independente que poderia não bater com eles.
 *
 * Isso inclui arredondar o primeiro e o último offset — na prática, o
 * horário de início/servir mostrado pode "escorregar" até ~5min do que foi
 * digitado, uma troca que vale a pena: sem isso, a ÚLTIMA etapa (ancorada
 * exatamente no horário de servir) acabava com uma duração "torta" em
 * relação às etapas arredondadas ao lado dela, reintroduzindo a mesma
 * inconsistência que este arredondamento existe pra resolver.
 */
export function roundTimelineForDisplay(timeline: TimelineStep[]): TimelineStep[] {
  if (timeline.length === 0) return [];

  const roundedOffsets = timeline.map((step) => roundHoursToNearestTenMinutes(step.offsetHours));

  return timeline.map((step, index) => {
    const offsetHours = roundedOffsets[index];
    if (step.durationHours === undefined) {
      return { ...step, offsetHours };
    }
    const endOffsetHours = roundedOffsets[index + 1];
    return { ...step, offsetHours, durationHours: endOffsetHours - offsetHours };
  });
}
