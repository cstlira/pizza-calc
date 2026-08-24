import type { DoughComponent, PizzaStyle } from './types';
import { STYLE_DEFAULTS } from '@/lib/presets/styleDefaults';

export interface BakersPercentageInput {
  totalDoughWeightG: number;
  hydrationPercent: number;
  saltPercent: number;
  pizzaStyle: PizzaStyle;
}

export function styleDerivedPercents(pizzaStyle: PizzaStyle): {
  oilPercent: number;
  sugarPercent: number;
} {
  const defaults = STYLE_DEFAULTS[pizzaStyle];
  return { oilPercent: defaults.oilPercent, sugarPercent: defaults.sugarPercent };
}

export function calculateTotals({
  totalDoughWeightG,
  hydrationPercent,
  saltPercent,
  pizzaStyle,
}: BakersPercentageInput): DoughComponent {
  const { oilPercent, sugarPercent } = styleDerivedPercents(pizzaStyle);

  const totalPercent = 100 + hydrationPercent + saltPercent + oilPercent + sugarPercent;
  const flourG = totalDoughWeightG / (totalPercent / 100);
  const waterG = (flourG * hydrationPercent) / 100;
  const saltG = (flourG * saltPercent) / 100;
  const oilG = (flourG * oilPercent) / 100;
  const sugarG = (flourG * sugarPercent) / 100;

  return { flourG, waterG, saltG, oilG, sugarG };
}
