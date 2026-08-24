import type { DesiredOutcome, PrefermentMethod } from '@/lib/calculations/types';

export const OUTCOME_TO_METHOD: Record<DesiredOutcome, Exclude<PrefermentMethod, 'auto'>> = {
  lightness: 'biga',
  flavor: 'poolish',
  balanced: 'combined',
  simplicity: 'direct',
};

export const METHOD_JUSTIFICATION: Record<Exclude<PrefermentMethod, 'auto'>, string> = {
  biga: 'mais estrutura e força, fermentação previsível',
  poolish: 'mais sabor e douramento, massa mais macia de manusear',
  combined: 'equilíbrio entre estrutura e sabor',
  direct: 'mais simples e rápido, menos etapas',
};

export function resolvePrefermentMethod(
  method: PrefermentMethod,
  desiredOutcome?: DesiredOutcome
): Exclude<PrefermentMethod, 'auto'> {
  if (method !== 'auto') return method;
  if (!desiredOutcome) {
    throw new Error('desiredOutcome é obrigatório quando prefermentMethod === "auto"');
  }
  return OUTCOME_TO_METHOD[desiredOutcome];
}
