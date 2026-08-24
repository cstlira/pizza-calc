import type { YeastType } from './types';
import { calculateEffectiveFermentationHours, type FermentationPhase } from './fermentationRate';

/**
 * Heurísticas de calibração grosseira para a fase de lag em fermentações curtas.
 * Não são valores derivados — recalibrar com dados reais quando disponíveis.
 */
const SHORT_FERMENTATION_CORRECTION = {
  under6h: 1.6,
  under10h: 1.3,
  under16h: 1.1,
  default: 1.0,
} as const;

/**
 * Fatores relativos ao fermento seco instantâneo, que é a própria referência
 * do modelo (por isso `instant: 1.0` — ver calculateInstantYeastPercent).
 * Seco ativo precisa de ~25% a mais (menos concentrado, precisa de
 * reidratação); fresco precisa de ~3x mais — dentro da faixa de 2.5x-3x de
 * potência do instantâneo sobre o fresco que é padrão de mercado.
 */
const INSTANT_TO_TYPE_FACTOR: Record<Exclude<YeastType, 'natural'>, number> = {
  instant: 1.0,
  dry: 1.25,
  fresh: 3.0,
};

/**
 * Referência empírica: 0.1% de fermento seco instantâneo para 24h efetivas
 * (equivalente a 24h reais a 22°C — ver fermentationRate.ts). A escala por
 * temperatura já foi aplicada na conversão pra horas efetivas, então esta
 * função só cuida da lei tempo/quantidade.
 */
export function calculateInstantYeastPercent(effectiveFermentationHours: number): number {
  return 0.1 * (24 / effectiveFermentationHours);
}

/**
 * As faixas (6h/10h/16h) foram calibradas quando o modelo era de fase única,
 * onde horas reais e horas efetivas eram o mesmo número sempre que a
 * temperatura rondava a referência (22°C) — ou seja, essas faixas sempre
 * foram, implicitamente, faixas de horas EFETIVAS, não de relógio. Por isso
 * o parâmetro é `effectiveHours`, não o total bruto de horas das fases: um
 * retard longo e frio (ex: 4h quente + 18h geladeira = 22h de relógio, mas
 * só ~5.5h efetivas) ainda cai na correção de fermentação curta, porque é
 * isso que ele fisicamente é — pouco progresso de fermentação acumulado.
 */
export function shortFermentationCorrection(effectiveHours: number): number {
  if (effectiveHours < 6) return SHORT_FERMENTATION_CORRECTION.under6h;
  if (effectiveHours < 10) return SHORT_FERMENTATION_CORRECTION.under10h;
  if (effectiveHours < 16) return SHORT_FERMENTATION_CORRECTION.under16h;
  return SHORT_FERMENTATION_CORRECTION.default;
}

export function convertInstantYeastPercent(
  instantPercent: number,
  yeastType: Exclude<YeastType, 'natural'>
): number {
  return instantPercent * INSTANT_TO_TYPE_FACTOR[yeastType];
}

/**
 * `phases` permite misturar temperaturas diferentes (ex: bulk em temperatura
 * ambiente + retard na geladeira) num mesmo cálculo — funciona com 1, 2 ou N
 * fases, sem lógica hardcoded pra um número específico.
 */
export function calculateCommercialYeastPercent(
  phases: FermentationPhase[],
  yeastType: Exclude<YeastType, 'natural'>
): number {
  const effectiveHours = calculateEffectiveFermentationHours(phases);
  const instantPercent = calculateInstantYeastPercent(effectiveHours);
  const corrected = instantPercent * shortFermentationCorrection(effectiveHours);
  return convertInstantYeastPercent(corrected, yeastType);
}
