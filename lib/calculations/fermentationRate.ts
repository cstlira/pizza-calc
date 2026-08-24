export const REFERENCE_TEMP_C = 22;
export const RATE_TEMP_SPAN_C = 9; // regra de Hamelman: atividade do fermento triplica a cada 9°C

export interface FermentationPhase {
  hours: number;
  tempC: number;
}

/**
 * Taxa de fermentação numa temperatura, relativa à taxa em 22°C (referência).
 * Compartilhada por yeastModel.ts e naturalStarter.ts pra não duplicar a lei
 * de Hamelman em dois lugares com risco de divergir.
 */
export function fermentationRateRelativeToReference(tempC: number): number {
  return Math.pow(3, (tempC - REFERENCE_TEMP_C) / RATE_TEMP_SPAN_C);
}

/**
 * Soma fases com temperaturas diferentes (ex: bulk em temperatura ambiente +
 * retard na geladeira) num único número de "horas efetivas" — o equivalente
 * em horas de fermentação à taxa de referência (22°C). Isso permite que o
 * resto do motor de cálculo continue trabalhando com um único número de
 * horas, sem precisar saber que o processo teve fases em temperaturas
 * diferentes.
 */
export function calculateEffectiveFermentationHours(phases: FermentationPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.hours * fermentationRateRelativeToReference(phase.tempC), 0);
}
