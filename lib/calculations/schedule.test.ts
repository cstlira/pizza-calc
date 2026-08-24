import { describe, expect, it } from 'vitest';
import { buildSchedule } from './schedule';
import { buildTimeline } from './timeline';
import type { TimelineStep } from './types';

describe('buildSchedule', () => {
  it('timeline vazia: retorna startAt igual ao horário desejado e nenhum passo', () => {
    const desiredServeAt = new Date('2026-08-22T19:00:00');
    const schedule = buildSchedule([], desiredServeAt);

    expect(schedule.startAt.getTime()).toBe(desiredServeAt.getTime());
    expect(schedule.steps).toEqual([]);
  });

  it('timeline de um único passo (offsetHours: 0): startAt e o passo coincidem com o horário desejado', () => {
    const desiredServeAt = new Date('2026-08-22T19:00:00');
    const timeline: TimelineStep[] = [{ label: 'Abrir e assar', offsetHours: 0 }];

    const schedule = buildSchedule(timeline, desiredServeAt);

    expect(schedule.startAt.getTime()).toBe(desiredServeAt.getTime());
    expect(schedule.steps).toHaveLength(1);
    expect(schedule.steps[0].at.getTime()).toBe(desiredServeAt.getTime());
  });

  it('timeline com múltiplos passos: âncora o último passo exatamente no horário desejado', () => {
    const desiredServeAt = new Date('2026-08-22T19:00:00');
    const timeline = buildTimeline('direct', 24, 0, 4);

    const schedule = buildSchedule(timeline, desiredServeAt);

    const lastStep = timeline[timeline.length - 1];
    const expectedStartAtMs = desiredServeAt.getTime() - lastStep.offsetHours * 60 * 60 * 1000;
    expect(schedule.startAt.getTime()).toBe(expectedStartAtMs);

    schedule.steps.forEach((step, i) => {
      const expectedAtMs = schedule.startAt.getTime() + timeline[i].offsetHours * 60 * 60 * 1000;
      expect(step.at.getTime()).toBe(expectedAtMs);
    });

    const lastScheduledStep = schedule.steps[schedule.steps.length - 1];
    expect(lastScheduledStep.at.getTime()).toBe(desiredServeAt.getTime());
  });

  it('os horários dos passos nunca retrocedem ao longo da timeline', () => {
    const desiredServeAt = new Date('2026-08-22T19:00:00');
    const timeline = buildTimeline('biga', 30, 10, 4);

    const schedule = buildSchedule(timeline, desiredServeAt);

    for (let i = 0; i < schedule.steps.length - 1; i++) {
      expect(schedule.steps[i].at.getTime()).toBeLessThanOrEqual(schedule.steps[i + 1].at.getTime());
    }
  });

  it('horas fracionárias (2.5h) resultam em 2h30min após o início', () => {
    const desiredServeAt = new Date('2026-08-22T19:00:00');
    const timeline: TimelineStep[] = [
      { label: 'Sova da massa', offsetHours: 0 },
      { label: 'Bolear', offsetHours: 2.5 },
    ];

    const schedule = buildSchedule(timeline, desiredServeAt);

    const expectedAtMs = schedule.startAt.getTime() + 2.5 * 60 * 60 * 1000;
    expect(schedule.steps[1].at.getTime()).toBe(expectedAtMs);
    expect(schedule.steps[1].at.getTime() - schedule.startAt.getTime()).toBe(2 * 60 * 60 * 1000 + 30 * 60 * 1000);
  });
});
