import type { TimelineStep } from './types';

export interface ScheduledStep extends TimelineStep {
  at: Date;
}

export interface Schedule {
  startAt: Date;
  steps: ScheduledStep[];
}

/**
 * Ancora a timeline (horas relativas ao início) numa data/hora real, a
 * partir de quando o usuário quer servir a pizza — a última etapa ("Abrir e
 * assar"). Não muda nenhuma proporção da timeline, só traduz offsetHours em
 * datas reais.
 */
export function buildSchedule(timeline: TimelineStep[], desiredServeAt: Date): Schedule {
  if (timeline.length === 0) {
    return { startAt: desiredServeAt, steps: [] };
  }

  const totalHours = timeline[timeline.length - 1].offsetHours;
  const startAt = new Date(desiredServeAt.getTime() - totalHours * 60 * 60 * 1000);

  const steps = timeline.map((step) => ({
    ...step,
    at: new Date(startAt.getTime() + step.offsetHours * 60 * 60 * 1000),
  }));

  return { startAt, steps };
}
