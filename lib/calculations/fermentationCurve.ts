import type { TimelineStep } from './types';

export interface FermentationCurvePoint {
  hoursElapsed: number;
  height: number; // altura ilustrativa (sem escala física real), só pra desenhar a curva
  label: string;
}

const BASELINE_HEIGHT = 0.15;
const RISE_RATE_PER_HOUR = 0.035;
const DEFLATION_FRACTION = 0.35;
const DEFLATION_STEP_LABELS = new Set(['Bolear']);

const COLD_RETARD_STEP_LABEL = 'Retard na geladeira';
// Massa fria ainda fermenta, só que bem mais devagar — é o "estabiliza" da
// seção 5 do plano, não um platô perfeitamente reto.
const COLD_RETARD_RISE_RATE_PER_HOUR = RISE_RATE_PER_HOUR * 0.1;

/**
 * Converte a timeline em pontos (hora, altura ilustrativa) pro SVG de
 * assinatura (seção 5 do plano): sobe durante etapas de fermentação
 * (duração > 0), sobe bem mais devagar durante o retard na geladeira, cai
 * numa fração fixa ao "Bolear" (a massa perde gás ao ser dividida/moldada),
 * e fica plana nas demais etapas instantâneas.
 */
export function buildFermentationCurvePoints(timeline: TimelineStep[]): FermentationCurvePoint[] {
  const points: FermentationCurvePoint[] = [];
  let currentHeight = BASELINE_HEIGHT;

  for (const step of timeline) {
    if (step.durationHours !== undefined && step.durationHours > 0) {
      const riseRate = step.label === COLD_RETARD_STEP_LABEL ? COLD_RETARD_RISE_RATE_PER_HOUR : RISE_RATE_PER_HOUR;
      currentHeight += step.durationHours * riseRate;
      points.push({
        hoursElapsed: step.offsetHours + step.durationHours,
        height: currentHeight,
        label: step.label,
      });
    } else {
      if (DEFLATION_STEP_LABELS.has(step.label)) {
        currentHeight *= 1 - DEFLATION_FRACTION;
      }
      points.push({ hoursElapsed: step.offsetHours, height: currentHeight, label: step.label });
    }
  }

  return points;
}
