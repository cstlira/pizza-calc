import { describe, expect, it } from 'vitest';
import { buildFermentationCurvePoints } from './fermentationCurve';
import { buildTimeline } from './timeline';

describe('buildFermentationCurvePoints', () => {
  it('gera um ponto por etapa da timeline', () => {
    const timeline = buildTimeline('direct', 24, 0, 4);
    const points = buildFermentationCurvePoints(timeline);
    expect(points).toHaveLength(timeline.length);
  });

  it('a altura sobe durante o bulk e cai ao bolear (direct)', () => {
    const timeline = buildTimeline('direct', 24, 0, 4);
    const points = buildFermentationCurvePoints(timeline);

    const afterBulk = points.find((p) => p.label === 'Fermentação em bloco (bulk)')!;
    const afterBolear = points.find((p) => p.label === 'Bolear')!;
    const start = points[0];

    expect(afterBulk.height).toBeGreaterThan(start.height);
    expect(afterBolear.height).toBeLessThan(afterBulk.height);
  });

  it('sobe de novo, mais suavemente, durante o descanso de bancada', () => {
    const timeline = buildTimeline('direct', 24, 0, 4);
    const points = buildFermentationCurvePoints(timeline);

    const afterBolear = points.find((p) => p.label === 'Bolear')!;
    const afterBench = points.find((p) => p.label === 'Descanso de bancada')!;

    expect(afterBench.height).toBeGreaterThan(afterBolear.height);
  });

  it('as horas decorridas nunca decrescem ao longo dos pontos', () => {
    const timeline = buildTimeline('biga', 20, 0, 4);
    const points = buildFermentationCurvePoints(timeline);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].hoursElapsed).toBeGreaterThanOrEqual(points[i - 1].hoursElapsed);
    }
  });

  it('timeline vazia gera nenhum ponto', () => {
    expect(buildFermentationCurvePoints([])).toEqual([]);
  });

  it('sem retard, nenhum ponto tem o rótulo de retard', () => {
    const timeline = buildTimeline('direct', 24, 0, 4);
    const points = buildFermentationCurvePoints(timeline);
    expect(points.some((p) => p.label === 'Retard na geladeira')).toBe(false);
  });

  it('a subida por hora durante o retard é bem menor do que durante o bulk ("estabiliza")', () => {
    const timeline = buildTimeline('direct', 24, 12, 4);
    const points = buildFermentationCurvePoints(timeline);

    const start = points[0];
    const afterBulk = points.find((p) => p.label === 'Fermentação em bloco (bulk)')!;
    // "Bolear" deságua entre o fim do bulk e o início do retard — a base do
    // retard é o ponto depois da deflação, não afterBulk diretamente.
    const afterBolear = points.find((p) => p.label === 'Bolear')!;
    const afterRetard = points.find((p) => p.label === 'Retard na geladeira')!;
    const bulkStep = timeline.find((s) => s.label === 'Fermentação em bloco (bulk)')!;
    const retardStep = timeline.find((s) => s.label === 'Retard na geladeira')!;

    const bulkRisePerHour = (afterBulk.height - start.height) / bulkStep.durationHours!;
    const retardRisePerHour = (afterRetard.height - afterBolear.height) / retardStep.durationHours!;

    expect(retardRisePerHour).toBeGreaterThan(0); // ainda fermenta, só que devagar
    expect(retardRisePerHour).toBeLessThan(bulkRisePerHour);
  });
});
