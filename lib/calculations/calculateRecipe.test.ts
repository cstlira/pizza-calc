import { describe, expect, it } from 'vitest';
import { calculateRecipe } from './calculateRecipe';
import type { CalculatorInput } from './types';

const baseInput: CalculatorInput = {
  ballWeightG: 250,
  numberOfBalls: 4,
  pizzaStyle: 'neapolitan',
  hydrationPercent: 62,
  saltPercent: 2.5,
  ambientTempC: 22,
  fermentationHours: 24,
  coldRetardHours: 0,
  fridgeTempC: 4,
  yeastType: 'dry',
  prefermentMethod: 'direct',
};

describe('calculateRecipe', () => {
  it('peso total é ballWeightG × numberOfBalls', () => {
    const output = calculateRecipe(baseInput);
    expect(output.totalDoughWeightG).toBe(1000);
  });

  it('ecoa numberOfBalls e ballWeightG no output', () => {
    const output = calculateRecipe(baseInput);
    expect(output.numberOfBalls).toBe(baseInput.numberOfBalls);
    expect(output.ballWeightG).toBe(baseInput.ballWeightG);
  });

  it('massa final reconstitui o peso total (fermento fica fora do baker\'s percentage) quando o método é direct', () => {
    const output = calculateRecipe(baseInput);
    const { flourG, waterG, saltG = 0, yeastG = 0, oilG = 0, sugarG = 0 } = output.finalDough;
    // Por design (seção 3.1), o fermento não entra no totalPercent — o peso
    // final da massa fica ligeiramente acima do alvo pela massa do fermento.
    expect(flourG + waterG + saltG + oilG + sugarG).toBeCloseTo(1000, 4);
    expect(yeastG).toBeGreaterThan(0);
    expect(yeastG).toBeLessThan(5);
    expect(output.preferments.biga).toBeUndefined();
    expect(output.preferments.poolish).toBeUndefined();
  });

  it('biga: farinha total (pré-fermento + massa final) bate com o total calculado', () => {
    const output = calculateRecipe({ ...baseInput, prefermentMethod: 'biga' });
    const flourInPreferments = output.preferments.biga?.flourG ?? 0;
    expect(flourInPreferments + output.finalDough.flourG).toBeCloseTo(output.totals.flourG, 4);
  });

  it('auto + desiredOutcome=flavor resolve para poolish na timeline', () => {
    const output = calculateRecipe({
      ...baseInput,
      prefermentMethod: 'auto',
      desiredOutcome: 'flavor',
    });
    expect(output.timeline[0].label).toBe('Mix do poolish');
    expect(output.preferments.poolish).toBeDefined();
  });

  it('fermento natural: preenche naturalStarter e emite aviso, sem yeastG comercial', () => {
    const output = calculateRecipe({ ...baseInput, yeastType: 'natural' });
    expect(output.preferments.naturalStarter).toBeDefined();
    expect(output.finalDough.yeastG).toBeUndefined();
    expect(output.warnings.some((w) => w.includes('Fermento natural'))).toBe(true);
  });

  it('fermento natural + fermentação curta emite aviso adicional', () => {
    const output = calculateRecipe({ ...baseInput, yeastType: 'natural', fermentationHours: 4 });
    expect(output.warnings.some((w) => w.includes('muito curto'))).toBe(true);
  });

  it('hidratação fora da faixa do estilo gera aviso', () => {
    const output = calculateRecipe({ ...baseInput, hydrationPercent: 78 });
    expect(output.warnings.some((w) => w.includes('foge da faixa tradicional'))).toBe(true);
  });

  it('hidratação dentro da faixa não gera aviso de hidratação', () => {
    const output = calculateRecipe(baseInput);
    expect(output.warnings.some((w) => w.includes('foge da faixa tradicional'))).toBe(false);
  });

  it('combined + fermento natural: starter sai do total antes do split, nada fica negativo', () => {
    const output = calculateRecipe({
      ...baseInput,
      yeastType: 'natural',
      prefermentMethod: 'combined',
    });

    expect(output.finalDough.flourG).toBeGreaterThanOrEqual(-1e-9);
    expect(output.finalDough.waterG).toBeGreaterThanOrEqual(-1e-9);
    expect(output.preferments.biga!.flourG).toBeGreaterThan(0);
    expect(output.preferments.poolish!.flourG).toBeGreaterThan(0);

    // farinha do starter + farinha dos pré-fermentos + massa final = total
    const flourAccountedFor =
      (output.preferments.naturalStarter?.flourG ?? 0) +
      (output.preferments.biga?.flourG ?? 0) +
      (output.preferments.poolish?.flourG ?? 0) +
      output.finalDough.flourG;
    expect(flourAccountedFor).toBeCloseTo(output.totals.flourG, 4);
  });

  it('combined + comercial (sem fermento natural): já basta a hidratação padrão do estilo pra estourar a água, e ainda assim nada fica negativo', () => {
    const output = calculateRecipe({ ...baseInput, prefermentMethod: 'combined' });

    expect(output.finalDough.flourG).toBeGreaterThanOrEqual(0);
    expect(output.finalDough.waterG).toBeGreaterThanOrEqual(0);
    expect(output.preferments.biga!.waterG).toBeGreaterThanOrEqual(0);
    expect(output.preferments.poolish!.waterG).toBeGreaterThanOrEqual(0);
    expect(output.warnings.some((w) => w.includes('ajustada proporcionalmente'))).toBe(true);
  });

  it.each(['direct', 'biga', 'poolish', 'combined'] as const)(
    'método %s nunca produz flourG/waterG negativos, com ou sem fermento natural',
    (prefermentMethod) => {
      for (const yeastType of ['instant', 'dry', 'fresh', 'natural'] as const) {
        const output = calculateRecipe({ ...baseInput, prefermentMethod, yeastType });
        for (const component of [output.finalDough, output.preferments.biga, output.preferments.poolish]) {
          if (!component) continue;
          expect(component.flourG).toBeGreaterThanOrEqual(-1e-9);
          expect(component.waterG).toBeGreaterThanOrEqual(-1e-9);
        }
      }
    }
  );

  describe('retard na geladeira', () => {
    it('aparece na timeline entre Bolear e Descanso de bancada, com a duração pedida', () => {
      const output = calculateRecipe({ ...baseInput, coldRetardHours: 12, fridgeTempC: 4 });
      const bolearIndex = output.timeline.findIndex((s) => s.label === 'Bolear');
      const retardIndex = output.timeline.findIndex((s) => s.label === 'Retard na geladeira');
      const benchIndex = output.timeline.findIndex((s) => s.label === 'Descanso de bancada');

      expect(retardIndex).toBe(bolearIndex + 1);
      expect(benchIndex).toBe(retardIndex + 1);
      expect(output.timeline[retardIndex].durationHours).toBeCloseTo(12, 6);
      expect(output.timeline[retardIndex].note).toContain('4°C');
    });

    it('mesmo total de fermentationHours: com retard, o fermento (g) é maior do que sem', () => {
      const withoutRetard = calculateRecipe(baseInput);
      const withRetard = calculateRecipe({ ...baseInput, coldRetardHours: 12, fridgeTempC: 4 });
      expect(withRetard.finalDough.yeastG!).toBeGreaterThan(withoutRetard.finalDough.yeastG!);
    });

    it('fermento natural: pouco tempo em temperatura ambiente antes de um retard longo ainda avisa "muito curto"', () => {
      const output = calculateRecipe({
        ...baseInput,
        yeastType: 'natural',
        fermentationHours: 30,
        coldRetardHours: 28,
      });
      expect(output.warnings.some((w) => w.includes('muito curto'))).toBe(true);
    });

    it('coldRetardHours maior que fermentationHours é clampado e emite aviso, sem quebrar', () => {
      const output = calculateRecipe({ ...baseInput, fermentationHours: 10, coldRetardHours: 50 });
      const last = output.timeline[output.timeline.length - 1];
      expect(last.offsetHours).toBeCloseTo(10, 6);
      expect(output.warnings.some((w) => w.includes('ajustado para não ultrapassar'))).toBe(true);
    });

    it('menos de 1h em temperatura ambiente antes da geladeira emite aviso', () => {
      const output = calculateRecipe({ ...baseInput, fermentationHours: 24, coldRetardHours: 23.7 });
      expect(output.warnings.some((w) => w.includes('Menos de 1h em temperatura ambiente'))).toBe(true);
    });

    it('coldRetardHours=0 não emite nenhum aviso relacionado a retard', () => {
      const output = calculateRecipe(baseInput);
      expect(output.warnings.some((w) => w.includes('retard') || w.includes('geladeira'))).toBe(false);
    });
  });
});
