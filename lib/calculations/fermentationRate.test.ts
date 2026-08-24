import { describe, expect, it } from 'vitest';
import { calculateEffectiveFermentationHours, fermentationRateRelativeToReference } from './fermentationRate';

describe('fermentationRateRelativeToReference', () => {
  it('na temperatura de referência (22°C), a taxa é 1', () => {
    expect(fermentationRateRelativeToReference(22)).toBeCloseTo(1, 6);
  });

  it('9°C mais quente triplica a taxa', () => {
    expect(fermentationRateRelativeToReference(31)).toBeCloseTo(3, 4);
  });

  it('9°C mais frio reduz a taxa a 1/3', () => {
    expect(fermentationRateRelativeToReference(13)).toBeCloseTo(1 / 3, 4);
  });

  it('geladeira típica (4°C, 18°C abaixo da referência) reduz a taxa a 1/9', () => {
    expect(fermentationRateRelativeToReference(4)).toBeCloseTo(1 / 9, 4);
  });
});

describe('calculateEffectiveFermentationHours', () => {
  it('uma fase só na referência: horas efetivas = horas reais', () => {
    expect(calculateEffectiveFermentationHours([{ hours: 24, tempC: 22 }])).toBeCloseTo(24, 6);
  });

  it('combina fases quente/fria proporcionalmente à taxa de cada uma', () => {
    // 12h a 22°C (taxa 1) + 12h a 4°C (taxa 1/9) = 12 + 12/9 ≈ 13.333
    expect(
      calculateEffectiveFermentationHours([
        { hours: 12, tempC: 22 },
        { hours: 12, tempC: 4 },
      ])
    ).toBeCloseTo(13.333, 2);
  });

  it('lista vazia dá zero', () => {
    expect(calculateEffectiveFermentationHours([])).toBe(0);
  });

  it('fase com zero horas não contribui, mesmo em temperatura extrema', () => {
    expect(calculateEffectiveFermentationHours([{ hours: 0, tempC: 100 }])).toBe(0);
  });
});
