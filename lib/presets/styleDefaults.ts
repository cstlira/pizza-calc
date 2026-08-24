import type { PizzaStyle } from '@/lib/calculations/types';

export const STYLE_DEFAULTS = {
  neapolitan: {
    ballWeightRange: [220, 280],
    ballWeightDefault: 250,
    hydrationRange: [58, 65],
    hydrationDefault: 62,
    oilPercent: 0,
    sugarPercent: 0,
  },
  ny: {
    ballWeightRange: [260, 300],
    ballWeightDefault: 280,
    hydrationRange: [60, 70],
    hydrationDefault: 63,
    oilPercent: 2.5,
    sugarPercent: 1.5,
  },
} as const satisfies Record<
  PizzaStyle,
  {
    ballWeightRange: readonly [number, number];
    ballWeightDefault: number;
    hydrationRange: readonly [number, number];
    hydrationDefault: number;
    oilPercent: number;
    sugarPercent: number;
  }
>;

export const HYDRATION_SLIDER_RANGE = [60, 80] as const;

export const SALT_PRESETS = [2, 2.5, 3] as const;
