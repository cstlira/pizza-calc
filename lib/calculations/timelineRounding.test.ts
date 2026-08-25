import { describe, expect, it } from 'vitest';
import { roundTimelineForDisplay } from './timelineRounding';
import { buildTimeline } from './timeline';
import type { TimelineStep } from './types';

describe('roundTimelineForDisplay', () => {
  it('timeline vazia retorna vazia', () => {
    expect(roundTimelineForDisplay([])).toEqual([]);
  });

  it('primeiro offset sempre fica em 0 (0 já é múltiplo de 10min)', () => {
    const timeline = buildTimeline('poolish', 31 + 11 / 60, 23 + 10 / 60, 4);
    const rounded = roundTimelineForDisplay(timeline);
    expect(rounded[0].offsetHours).toBe(0);
  });

  it('o último offset TAMBÉM é arredondado (pode escorregar até 5min do total original) — isso é intencional, ver docstring', () => {
    // 31h11min: de propósito NÃO é múltiplo de 10min, pra forçar arredondamento no fim
    const timeline = buildTimeline('poolish', 31 + 11 / 60, 23 + 10 / 60, 4);
    const rounded = roundTimelineForDisplay(timeline);
    const lastMinutes = rounded[rounded.length - 1].offsetHours * 60;
    expect(lastMinutes % 10).toBeCloseTo(0, 6);
    // 31h11min arredonda pra 31h10min (1min de diferença, dentro do esperado)
    expect(lastMinutes).toBeCloseTo(31 * 60 + 10, 6);
  });

  it('todos os offsets (incluindo o último) caem em múltiplos de 10 minutos', () => {
    const timeline = buildTimeline('poolish', 31 + 11 / 60, 23 + 10 / 60, 4);
    const rounded = roundTimelineForDisplay(timeline);

    for (const step of rounded) {
      const totalMinutes = step.offsetHours * 60;
      expect(totalMinutes % 10).toBeCloseTo(0, 6);
    }
  });

  it('mesmo quando o total já é múltiplo de 10min, arredondar não muda nada', () => {
    const timeline = buildTimeline('direct', 24, 0, 4); // 24h é múltiplo de 10min
    const rounded = roundTimelineForDisplay(timeline);
    expect(rounded[rounded.length - 1].offsetHours).toBeCloseTo(24, 6);
  });

  it('duração de cada etapa é exatamente a diferença entre o início dela e o início da próxima', () => {
    const timeline = buildTimeline('biga', 24, 0, 4);
    const rounded = roundTimelineForDisplay(timeline);

    for (let i = 0; i < rounded.length - 1; i++) {
      if (rounded[i].durationHours === undefined) continue;
      expect(rounded[i].offsetHours + rounded[i].durationHours!).toBeCloseTo(rounded[i + 1].offsetHours, 10);
    }
  });

  it('os offsets continuam não decrescendo depois de arredondar', () => {
    const timeline = buildTimeline('combined', 31 + 7 / 60, 12 + 3 / 60, 4);
    const rounded = roundTimelineForDisplay(timeline);

    for (let i = 1; i < rounded.length; i++) {
      expect(rounded[i].offsetHours).toBeGreaterThanOrEqual(rounded[i - 1].offsetHours);
    }
  });

  it('etapas instantâneas (sem durationHours) só têm o offset arredondado, sem ganhar duração', () => {
    const timeline: TimelineStep[] = [
      { label: 'A', offsetHours: 0 },
      { label: 'B', offsetHours: 1.234, durationHours: 2.111 },
      { label: 'C', offsetHours: 3.345 },
    ];
    const rounded = roundTimelineForDisplay(timeline);
    expect(rounded[0].durationHours).toBeUndefined();
    expect(rounded[2].durationHours).toBeUndefined();
  });

  it('rótulos e notas não são alterados', () => {
    const timeline = buildTimeline('direct', 24, 8, 4);
    const rounded = roundTimelineForDisplay(timeline);
    expect(rounded.map((s) => s.label)).toEqual(timeline.map((s) => s.label));
    expect(rounded.find((s) => s.label === 'Retard na geladeira')?.note).toContain('4°C');
  });
});
