import { describe, expect, it } from 'vitest';
import { getPrefermentFlourPercents, splitPreferments } from './prefermentSplit';

describe('getPrefermentFlourPercents', () => {
  it('direct: 0% em pré-fermento', () => {
    expect(getPrefermentFlourPercents('direct')).toEqual({ biga: 0, poolish: 0 });
  });

  it('biga: 60% default, poolish 0%', () => {
    expect(getPrefermentFlourPercents('biga')).toEqual({ biga: 60, poolish: 0 });
  });

  it('poolish: 30% default, biga 0%', () => {
    expect(getPrefermentFlourPercents('poolish')).toEqual({ biga: 0, poolish: 30 });
  });

  it('combined: soma (60+40=100%) dividida 50/50', () => {
    expect(getPrefermentFlourPercents('combined')).toEqual({ biga: 50, poolish: 50 });
  });
});

describe('splitPreferments', () => {
  it('direct: toda a farinha/água/fermento fica na massa final', () => {
    const result = splitPreferments({
      method: 'direct',
      totalFlourG: 1000,
      totalWaterG: 620,
      totalYeastG: 2,
    });

    expect(result.biga).toBeUndefined();
    expect(result.poolish).toBeUndefined();
    expect(result.finalDough).toEqual({ flourG: 1000, waterG: 620, yeastG: 2 });
  });

  it('biga: separa 60% da farinha a 48% de hidratação e o restante vai pra massa final', () => {
    const result = splitPreferments({
      method: 'biga',
      totalFlourG: 1000,
      totalWaterG: 620,
      totalYeastG: 2,
    });

    expect(result.biga).toBeDefined();
    expect(result.biga!.flourG).toBeCloseTo(600, 6);
    expect(result.biga!.waterG).toBeCloseTo(600 * 0.48, 6);
    expect(result.biga!.yeastG).toBeCloseTo(1.2, 6);
    expect(result.poolish).toBeUndefined();

    expect(result.finalDough.flourG).toBeCloseTo(400, 6);
    expect(result.finalDough.waterG).toBeCloseTo(620 - 600 * 0.48, 6);
    expect(result.finalDough.yeastG).toBeCloseTo(0.8, 6);
  });

  it('poolish: separa 30% da farinha a 100% de hidratação', () => {
    const result = splitPreferments({
      method: 'poolish',
      totalFlourG: 1000,
      totalWaterG: 620,
      totalYeastG: 2,
    });

    expect(result.poolish!.flourG).toBeCloseTo(300, 6);
    expect(result.poolish!.waterG).toBeCloseTo(300, 6);
    expect(result.poolish!.yeastG).toBeCloseTo(0.6, 6);
  });

  it('combined: biga e poolish somam 100% da farinha, nada sobra pra massa final', () => {
    const result = splitPreferments({
      method: 'combined',
      totalFlourG: 1000,
      totalWaterG: 620,
      totalYeastG: 2,
    });

    expect(result.biga!.flourG).toBeCloseTo(500, 6);
    expect(result.poolish!.flourG).toBeCloseTo(500, 6);
    expect(result.finalDough.flourG).toBeCloseTo(0, 6);

    // 620g de água não cobre a hidratação "de livro-texto" de biga (48%) +
    // poolish (100%) sobre 500g de farinha cada (240g + 500g = 740g) —
    // então ambas são escaladas proporcionalmente pra caber em 620g.
    expect(result.prefermentHydrationScaledDown).toBe(true);
    expect(result.biga!.waterG + result.poolish!.waterG).toBeCloseTo(620, 6);
    expect(result.finalDough.waterG).toBeCloseTo(0, 6);
    // proporção relativa entre as duas hidratações é preservada (240:500)
    expect(result.biga!.waterG / result.poolish!.waterG).toBeCloseTo(240 / 500, 6);
  });

  it('não escala quando a água da receita comporta as hidratações padrão', () => {
    const result = splitPreferments({
      method: 'biga',
      totalFlourG: 1000,
      totalWaterG: 620,
      totalYeastG: 2,
    });

    expect(result.prefermentHydrationScaledDown).toBe(false);
    expect(result.biga!.waterG).toBeCloseTo(600 * 0.48, 6);
  });

  it('sem fermento total (fermento natural), yeastG dos componentes fica indefinido', () => {
    const result = splitPreferments({
      method: 'biga',
      totalFlourG: 1000,
      totalWaterG: 620,
    });

    expect(result.biga!.yeastG).toBeUndefined();
    expect(result.finalDough.yeastG).toBeUndefined();
  });
});
