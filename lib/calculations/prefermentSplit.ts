import type { DoughComponent, PrefermentMethod } from './types';

export const PREFERMENT_DEFAULTS = {
  biga: { flourPercentOfTotal: 60, hydrationPercent: 48 },
  // 30% quando poolish é usado sozinho (extremo baixo da faixa 30-50% do
  // plano). Independente do split do método "combined" abaixo — mudar este
  // valor não afeta o "combined".
  poolish: { flourPercentOfTotal: 30, hydrationPercent: 100 },
} as const;

// "combined" usa sua própria soma histórica (60% biga + 40% poolish = 100%
// da farinha), dividida 50/50 — não deriva de PREFERMENT_DEFAULTS.poolish,
// que agora é específico do método "poolish" sozinho.
const COMBINED_FLOUR_PERCENT_EACH = 50;

export interface PrefermentFlourPercents {
  biga: number;
  poolish: number;
}

export function getPrefermentFlourPercents(
  method: Exclude<PrefermentMethod, 'auto'>
): PrefermentFlourPercents {
  switch (method) {
    case 'direct':
      return { biga: 0, poolish: 0 };
    case 'biga':
      return { biga: PREFERMENT_DEFAULTS.biga.flourPercentOfTotal, poolish: 0 };
    case 'poolish':
      return { biga: 0, poolish: PREFERMENT_DEFAULTS.poolish.flourPercentOfTotal };
    case 'combined':
      return { biga: COMBINED_FLOUR_PERCENT_EACH, poolish: COMBINED_FLOUR_PERCENT_EACH };
  }
}

export interface PrefermentSplitInput {
  method: Exclude<PrefermentMethod, 'auto'>;
  totalFlourG: number;
  totalWaterG: number;
  /** Omitir para fermento natural — o starter é tratado à parte (ver naturalStarter.ts). */
  totalYeastG?: number;
}

export interface PrefermentSplitResult {
  biga?: DoughComponent;
  poolish?: DoughComponent;
  finalDough: Pick<DoughComponent, 'flourG' | 'waterG' | 'yeastG'>;
  /**
   * true quando a hidratação-alvo da receita não comportava a água que
   * biga (48%) + poolish (100%) pediriam nas hidratações padrão — a água de
   * ambos foi escalada proporcionalmente pra caber no orçamento total (ver
   * comentário em splitPreferments). Mais comum no método "combined", que
   * consome 100% da farinha e não deixa massa final pra absorver a diferença.
   */
  prefermentHydrationScaledDown: boolean;
}

/**
 * Divide farinha/água/fermento entre biga, poolish e massa final. O fermento
 * total é distribuído proporcionalmente à mesma fração de farinha de cada
 * pré-fermento (ver seção 3.4 do plano).
 *
 * As hidratações de biga (48%) e poolish (100%) são valores de referência,
 * não garantias: se a soma da água que elas pedem excede o total de água da
 * receita (ex: "combined" com uma hidratação-alvo baixa, tipo Neapolitan a
 * 62%), as duas são escaladas proporcionalmente pra caber no orçamento —
 * preserva a proporção relativa entre elas e a conservação de massa, ao
 * custo de afastar a hidratação de cada uma do valor "de livro-texto".
 */
export function splitPreferments({
  method,
  totalFlourG,
  totalWaterG,
  totalYeastG,
}: PrefermentSplitInput): PrefermentSplitResult {
  const flourPercents = getPrefermentFlourPercents(method);

  const bigaFlourG = (totalFlourG * flourPercents.biga) / 100;
  const poolishFlourG = (totalFlourG * flourPercents.poolish) / 100;
  const bigaWaterRawG = (bigaFlourG * PREFERMENT_DEFAULTS.biga.hydrationPercent) / 100;
  const poolishWaterRawG = (poolishFlourG * PREFERMENT_DEFAULTS.poolish.hydrationPercent) / 100;
  const rawPrefermentWaterG = bigaWaterRawG + poolishWaterRawG;

  const prefermentHydrationScaledDown = rawPrefermentWaterG > totalWaterG && rawPrefermentWaterG > 0;
  const waterScaleFactor = prefermentHydrationScaledDown ? totalWaterG / rawPrefermentWaterG : 1;

  let biga: DoughComponent | undefined;
  let poolish: DoughComponent | undefined;
  let remainingFlourG = totalFlourG;
  let remainingWaterG = totalWaterG;
  let remainingYeastG = totalYeastG;

  if (bigaFlourG > 0) {
    const waterG = bigaWaterRawG * waterScaleFactor;
    const yeastG = totalYeastG !== undefined ? (totalYeastG * flourPercents.biga) / 100 : undefined;
    biga = { flourG: bigaFlourG, waterG, yeastG };
    remainingFlourG -= bigaFlourG;
    remainingWaterG -= waterG;
    if (remainingYeastG !== undefined && yeastG !== undefined) remainingYeastG -= yeastG;
  }

  if (poolishFlourG > 0) {
    const waterG = poolishWaterRawG * waterScaleFactor;
    const yeastG = totalYeastG !== undefined ? (totalYeastG * flourPercents.poolish) / 100 : undefined;
    poolish = { flourG: poolishFlourG, waterG, yeastG };
    remainingFlourG -= poolishFlourG;
    remainingWaterG -= waterG;
    if (remainingYeastG !== undefined && yeastG !== undefined) remainingYeastG -= yeastG;
  }

  return {
    biga,
    poolish,
    finalDough: { flourG: remainingFlourG, waterG: remainingWaterG, yeastG: remainingYeastG },
    prefermentHydrationScaledDown,
  };
}
