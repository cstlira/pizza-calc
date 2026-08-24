import { describe, expect, it } from 'vitest';
import { buildTimeline } from './timeline';

describe('buildTimeline', () => {
  it('direct: bulk + descanso de bancada somam o total de horas (sem retard)', () => {
    const steps = buildTimeline('direct', 10, 0, 4);
    const last = steps[steps.length - 1];
    expect(last.label).toBe('Abrir e assar');
    expect(last.offsetHours).toBeCloseTo(10, 6);
    expect(steps[0].offsetHours).toBe(0);
  });

  it('biga: inclui etapa de maturação do pré-fermento antes do mix final', () => {
    const steps = buildTimeline('biga', 20, 0, 4);
    expect(steps[0].label).toBe('Mix da biga');
    const mixFinal = steps.find((s) => s.label.startsWith('Mix da massa final'));
    expect(mixFinal).toBeDefined();
    expect(mixFinal!.offsetHours).toBeGreaterThan(0);

    const last = steps[steps.length - 1];
    expect(last.offsetHours).toBeCloseTo(20, 6);
  });

  it('poolish: usa o rótulo correto de mix', () => {
    const steps = buildTimeline('poolish', 16, 0, 4);
    expect(steps[0].label).toBe('Mix do poolish');
  });

  it('combined: usa o rótulo combinado', () => {
    const steps = buildTimeline('combined', 24, 0, 4);
    expect(steps[0].label).toBe('Mix dos pré-fermentos (biga + poolish)');
  });

  it('os offsets nunca decrescem ao longo da timeline', () => {
    const steps = buildTimeline('biga', 18, 0, 4);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].offsetHours).toBeGreaterThanOrEqual(steps[i - 1].offsetHours);
    }
  });

  it('coldRetardHours=0 não inclui o passo de retard', () => {
    const steps = buildTimeline('direct', 24, 0, 4);
    expect(steps.some((s) => s.label === 'Retard na geladeira')).toBe(false);
  });

  describe('com retard na geladeira', () => {
    it('direct: retard aparece entre Bolear e Descanso de bancada, com duração e nota corretas', () => {
      const steps = buildTimeline('direct', 24, 8, 4);
      const bolearIndex = steps.findIndex((s) => s.label === 'Bolear');
      const retardIndex = steps.findIndex((s) => s.label === 'Retard na geladeira');
      const benchIndex = steps.findIndex((s) => s.label === 'Descanso de bancada');

      expect(retardIndex).toBe(bolearIndex + 1);
      expect(benchIndex).toBe(retardIndex + 1);

      const retard = steps[retardIndex];
      expect(retard.durationHours).toBeCloseTo(8, 6);
      expect(retard.offsetHours).toBeCloseTo(steps[bolearIndex].offsetHours, 6);
      expect(retard.note).toContain('4°C');

      const last = steps[steps.length - 1];
      expect(last.offsetHours).toBeCloseTo(24, 6);
    });

    it('biga: retard aparece entre Bolear e Descanso de bancada', () => {
      const steps = buildTimeline('biga', 24, 8, 4);
      const bolearIndex = steps.findIndex((s) => s.label === 'Bolear');
      const retardIndex = steps.findIndex((s) => s.label === 'Retard na geladeira');
      const benchIndex = steps.findIndex((s) => s.label === 'Descanso de bancada');

      expect(retardIndex).toBe(bolearIndex + 1);
      expect(benchIndex).toBe(retardIndex + 1);

      const last = steps[steps.length - 1];
      expect(last.offsetHours).toBeCloseTo(24, 6);
    });

    it.each(['direct', 'biga', 'poolish', 'combined'] as const)(
      'método %s: soma das durações bate com fermentationHours quando há retard',
      (method) => {
        const steps = buildTimeline(method, 30, 10, 4);
        const last = steps[steps.length - 1];
        expect(last.offsetHours).toBeCloseTo(30, 6);
      }
    );

    it('offsets continuam não decrescendo com retard ativo', () => {
      const steps = buildTimeline('biga', 30, 10, 4);
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].offsetHours).toBeGreaterThanOrEqual(steps[i - 1].offsetHours);
      }
    });
  });
});
