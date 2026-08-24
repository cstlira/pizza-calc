import type { PrefermentMethod, TimelineStep } from './types';

/**
 * Frações heurísticas do tempo em temperatura ambiente (exclui o retard na
 * geladeira, que entra à parte com a duração exata que o usuário pediu).
 * Ponto de partida razoável, não derivado de dados — ajustar quando houver
 * calibração real.
 */
const DIRECT_FRACTIONS = { bulk: 0.65, bench: 0.35 } as const;
const PREFERMENT_FRACTIONS = { prefermentFerment: 0.5, bulk: 0.3, bench: 0.2 } as const;

const COLD_RETARD_LABEL = 'Retard na geladeira';

const PREFERMENT_MIX_LABEL: Record<Exclude<PrefermentMethod, 'auto' | 'direct'>, string> = {
  biga: 'Mix da biga',
  poolish: 'Mix do poolish',
  combined: 'Mix dos pré-fermentos (biga + poolish)',
};

export function buildTimeline(
  method: Exclude<PrefermentMethod, 'auto'>,
  fermentationHours: number,
  coldRetardHours: number,
  fridgeTempC: number
): TimelineStep[] {
  const roomHours = fermentationHours - coldRetardHours;

  const retardStep: TimelineStep[] =
    coldRetardHours > 0
      ? [
          {
            label: COLD_RETARD_LABEL,
            offsetHours: 0, // sobrescrito abaixo, com o offset real de cada branch
            durationHours: coldRetardHours,
            note: `Geladeira a ${fridgeTempC}°C`,
          },
        ]
      : [];

  if (method === 'direct') {
    const bulkHours = roomHours * DIRECT_FRACTIONS.bulk;
    const benchHours = roomHours * DIRECT_FRACTIONS.bench;
    const bolearOffset = bulkHours;
    const benchOffset = bolearOffset + coldRetardHours;

    return [
      { label: 'Sova da massa', offsetHours: 0 },
      { label: 'Fermentação em bloco (bulk)', offsetHours: 0, durationHours: bulkHours },
      { label: 'Bolear', offsetHours: bolearOffset },
      ...retardStep.map((step) => ({ ...step, offsetHours: bolearOffset })),
      { label: 'Descanso de bancada', offsetHours: benchOffset, durationHours: benchHours },
      { label: 'Abrir e assar', offsetHours: benchOffset + benchHours },
    ];
  }

  const prefermentHours = roomHours * PREFERMENT_FRACTIONS.prefermentFerment;
  const bulkHours = roomHours * PREFERMENT_FRACTIONS.bulk;
  const benchHours = roomHours * PREFERMENT_FRACTIONS.bench;
  const bolearOffset = prefermentHours + bulkHours;
  const benchOffset = bolearOffset + coldRetardHours;

  return [
    { label: PREFERMENT_MIX_LABEL[method], offsetHours: 0 },
    { label: 'Maturação do pré-fermento', offsetHours: 0, durationHours: prefermentHours },
    { label: 'Mix da massa final (incorpora o pré-fermento)', offsetHours: prefermentHours },
    { label: 'Fermentação em bloco (bulk)', offsetHours: prefermentHours, durationHours: bulkHours },
    { label: 'Bolear', offsetHours: bolearOffset },
    ...retardStep.map((step) => ({ ...step, offsetHours: bolearOffset })),
    { label: 'Descanso de bancada', offsetHours: benchOffset, durationHours: benchHours },
    { label: 'Abrir e assar', offsetHours: benchOffset + benchHours },
  ];
}
