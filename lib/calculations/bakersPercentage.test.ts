import { describe, expect, it } from 'vitest';
import { calculateTotals, styleDerivedPercents } from './bakersPercentage';

describe('styleDerivedPercents', () => {
  it('neapolitan: sem óleo nem açúcar', () => {
    expect(styleDerivedPercents('neapolitan')).toEqual({ oilPercent: 0, sugarPercent: 0 });
  });

  it('ny: óleo 2.5% e açúcar 1.5%', () => {
    expect(styleDerivedPercents('ny')).toEqual({ oilPercent: 2.5, sugarPercent: 1.5 });
  });
});

describe('calculateTotals', () => {
  it('neapolitan: 1000g de massa, 62% hidratação, 2.5% sal', () => {
    const totals = calculateTotals({
      totalDoughWeightG: 1000,
      hydrationPercent: 62,
      saltPercent: 2.5,
      pizzaStyle: 'neapolitan',
    });

    // totalPercent = 100 + 62 + 2.5 + 0 + 0 = 164.5
    const expectedFlour = 1000 / 1.645;
    expect(totals.flourG).toBeCloseTo(expectedFlour, 4);
    expect(totals.waterG).toBeCloseTo((expectedFlour * 62) / 100, 4);
    expect(totals.saltG).toBeCloseTo((expectedFlour * 2.5) / 100, 4);
    expect(totals.oilG).toBe(0);
    expect(totals.sugarG).toBe(0);

    // a soma dos componentes deve reconstituir o peso total da massa
    const sum = totals.flourG + totals.waterG + (totals.saltG ?? 0) + (totals.oilG ?? 0) + (totals.sugarG ?? 0);
    expect(sum).toBeCloseTo(1000, 6);
  });

  it('ny: inclui óleo e açúcar derivados do estilo e ainda soma o peso total', () => {
    const totals = calculateTotals({
      totalDoughWeightG: 2000,
      hydrationPercent: 63,
      saltPercent: 2,
      pizzaStyle: 'ny',
    });

    const sum = totals.flourG + totals.waterG + (totals.saltG ?? 0) + (totals.oilG ?? 0) + (totals.sugarG ?? 0);
    expect(sum).toBeCloseTo(2000, 6);
    expect(totals.oilG).toBeGreaterThan(0);
    expect(totals.sugarG).toBeGreaterThan(0);
  });
});
