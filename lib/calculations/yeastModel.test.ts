import { describe, expect, it } from 'vitest';
import {
  calculateCommercialYeastPercent,
  calculateInstantYeastPercent,
  convertInstantYeastPercent,
  shortFermentationCorrection,
} from './yeastModel';

describe('calculateInstantYeastPercent', () => {
  it('referência: 24h efetivas → 0.1% de fermento instantâneo', () => {
    expect(calculateInstantYeastPercent(24)).toBeCloseTo(0.1, 4);
  });

  it('menos horas efetivas exige mais fermento', () => {
    const base = calculateInstantYeastPercent(24);
    const shorter = calculateInstantYeastPercent(12);
    expect(shorter).toBeGreaterThan(base);
  });
});

describe('shortFermentationCorrection', () => {
  it('aplica os multiplicadores por faixa de horas efetivas', () => {
    expect(shortFermentationCorrection(4)).toBe(1.6);
    expect(shortFermentationCorrection(8)).toBe(1.3);
    expect(shortFermentationCorrection(12)).toBe(1.1);
    expect(shortFermentationCorrection(24)).toBe(1.0);
  });
});

describe('convertInstantYeastPercent', () => {
  it('instantâneo → instantâneo é identidade (×1.0, é a própria referência)', () => {
    expect(convertInstantYeastPercent(0.1, 'instant')).toBeCloseTo(0.1, 4);
  });

  it('converte instantâneo → seco ativo (×1.25)', () => {
    expect(convertInstantYeastPercent(0.1, 'dry')).toBeCloseTo(0.125, 4);
  });

  it('converte instantâneo → fresco (×3.0, dentro da faixa de 2.5x-3x de potência do instantâneo sobre o fresco)', () => {
    expect(convertInstantYeastPercent(0.1, 'fresh')).toBeCloseTo(0.3, 4);
  });

  it('fresco pede mais que seco ativo, que pede mais que instantâneo, pro mesmo poder de fermentação', () => {
    const instant = convertInstantYeastPercent(0.1, 'instant');
    const dry = convertInstantYeastPercent(0.1, 'dry');
    const fresh = convertInstantYeastPercent(0.1, 'fresh');
    expect(instant).toBeLessThan(dry);
    expect(dry).toBeLessThan(fresh);
  });
});

describe('calculateCommercialYeastPercent', () => {
  // Valores de referência verificados independentemente (ver plano/README da
  // sessão): a correção de fermentação curta usa horas EFETIVAS, não o total
  // bruto de horas de relógio das fases — importa porque um retard longo e
  // frio pode somar muitas horas de relógio mas poucas horas efetivas.
  const TOLERANCE_FRACTION = 0.1; // ±10%: os multiplicadores de correção são heurísticos

  function expectWithinTolerance(actual: number, expected: number) {
    expect(actual).toBeGreaterThanOrEqual(expected * (1 - TOLERANCE_FRACTION));
    expect(actual).toBeLessThanOrEqual(expected * (1 + TOLERANCE_FRACTION));
  }

  it('sanidade: 24h a 22°C → 0.1% (mesmo valor de referência do modelo de fase única)', () => {
    const percent = calculateCommercialYeastPercent([{ hours: 24, tempC: 22 }], 'fresh');
    // instant=0.1%, sem correção (>=16h efetivas), ×3.0 (fresco) = 0.3%
    expectWithinTolerance(percent, 0.1 * 3.0);
  });

  it('curto, fase única: 8h a 21°C', () => {
    const percent = calculateCommercialYeastPercent([{ hours: 8, tempC: 21 }], 'dry');
    // instant≈0.339%, ×1.3 (6-10h efetivas), ×1.25 (seco) ≈ 0.4406% → ×1.25 ≈ 0.5508%
    expectWithinTolerance(percent, 0.4406 * 1.25);
  });

  it('multi-fase: 4h a 21°C + 18h a 4°C — retard longo e frio ainda cai na correção curta', () => {
    const phases = [
      { hours: 4, tempC: 21 },
      { hours: 18, tempC: 4 },
    ];
    // horas efetivas ≈ 5.54 (<6h!) apesar de 22h de relógio → ×1.6
    const percentDry = calculateCommercialYeastPercent(phases, 'dry');
    expectWithinTolerance(percentDry / 1.25, 0.6931); // instant×correção, antes da conversão de tipo
  });

  it('multi-fase, geladeira dominante: 2h a 22°C + 48h a 4°C', () => {
    const phases = [
      { hours: 2, tempC: 22 },
      { hours: 48, tempC: 4 },
    ];
    // horas efetivas ≈ 7.33 → ×1.3
    const percentDry = calculateCommercialYeastPercent(phases, 'dry');
    expectWithinTolerance(percentDry / 1.25, 0.4255);
  });

  it('mesmo total de horas de relógio: com retard gera % maior do que sem (menos progresso efetivo)', () => {
    const withoutRetard = calculateCommercialYeastPercent([{ hours: 24, tempC: 22 }], 'dry');
    const withRetard = calculateCommercialYeastPercent(
      [
        { hours: 12, tempC: 22 },
        { hours: 12, tempC: 4 },
      ],
      'dry'
    );
    expect(withRetard).toBeGreaterThan(withoutRetard);
  });

  it('funciona com N fases (não hardcoded pra 2)', () => {
    const percent = calculateCommercialYeastPercent(
      [
        { hours: 2, tempC: 24 },
        { hours: 1, tempC: 22 },
        { hours: 16, tempC: 4 },
        { hours: 3, tempC: 20 },
      ],
      'dry'
    );
    expect(percent).toBeGreaterThan(0);
    expect(Number.isFinite(percent)).toBe(true);
  });
});
