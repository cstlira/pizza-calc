import { describe, expect, it } from 'vitest';
import { naturalStarterRange } from './naturalStarter';

describe('naturalStarterRange', () => {
  it('na referência (18h, 22°C, sem retard) fica centrada em ~20%', () => {
    const range = naturalStarterRange(18, 22, 0, 4);
    expect((range.minPercent + range.maxPercent) / 2).toBeCloseTo(20, 4);
    expect(range.maxPercent - range.minPercent).toBeCloseTo(6, 4);
  });

  it('tempo mais curto aumenta a faixa de starter', () => {
    const short = naturalStarterRange(6, 22, 0, 4);
    const long = naturalStarterRange(18, 22, 0, 4);
    expect(short.minPercent).toBeGreaterThan(long.minPercent);
  });

  it('temperatura mais baixa aumenta a faixa de starter', () => {
    const cold = naturalStarterRange(18, 16, 0, 4);
    const warm = naturalStarterRange(18, 22, 0, 4);
    expect(cold.minPercent).toBeGreaterThan(warm.minPercent);
  });

  it('mantém min <= max e dentro dos limites de sanidade', () => {
    const range = naturalStarterRange(4, 14, 0, 4);
    expect(range.minPercent).toBeLessThanOrEqual(range.maxPercent);
    expect(range.minPercent).toBeGreaterThanOrEqual(10);
    expect(range.maxPercent).toBeLessThanOrEqual(35);
  });

  it('retard na geladeira reduz o centro da faixa (menos starter necessário)', () => {
    const withoutRetard = naturalStarterRange(18, 22, 0, 4);
    const withRetard = naturalStarterRange(18, 22, 12, 4);
    const center = (r: { minPercent: number; maxPercent: number }) => (r.minPercent + r.maxPercent) / 2;
    expect(center(withRetard)).toBeLessThan(center(withoutRetard));
  });

  it('geladeira mais quente reduz o centro menos que geladeira mais fria (mesmas horas)', () => {
    const coldFridge = naturalStarterRange(18, 22, 12, 2);
    const warmFridge = naturalStarterRange(18, 22, 12, 8);
    const center = (r: { minPercent: number; maxPercent: number }) => (r.minPercent + r.maxPercent) / 2;
    // geladeira mais quente (8°C) = taxa mais alta = mais progresso efetivo = reduz mais o centro
    expect(center(warmFridge)).toBeLessThan(center(coldFridge));
  });

  it('coldRetardHours=0 é idêntico ao modelo anterior pra qualquer ambientTempC', () => {
    for (const ambientTempC of [16, 18, 22, 26, 30]) {
      const withZeroRetard = naturalStarterRange(18, ambientTempC, 0, 4);
      const legacyEquivalent = naturalStarterRange(18, ambientTempC, 0, 100); // fridgeTempC irrelevante quando coldRetardHours=0
      expect(withZeroRetard).toEqual(legacyEquivalent);
    }
  });
});
