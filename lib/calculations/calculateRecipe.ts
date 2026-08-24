import type { CalculatorInput, CalculatorOutput, DoughComponent } from './types';
import { calculateTotals } from './bakersPercentage';
import { calculateCommercialYeastPercent } from './yeastModel';
import { naturalStarterRange } from './naturalStarter';
import { splitPreferments } from './prefermentSplit';
import { buildTimeline } from './timeline';
import { resolvePrefermentMethod } from '@/lib/presets/outcomeSuggestions';
import { STYLE_DEFAULTS } from '@/lib/presets/styleDefaults';

const HIGH_YEAST_WARNING_THRESHOLD_PERCENT = 2;
const SHORT_NATURAL_FERMENTATION_HOURS = 8;
const MIN_ROOM_HOURS_BEFORE_RETARD = 1;

export function calculateRecipe(input: CalculatorInput): CalculatorOutput {
  const totalDoughWeightG = input.ballWeightG * input.numberOfBalls;
  const totals = calculateTotals({
    totalDoughWeightG,
    hydrationPercent: input.hydrationPercent,
    saltPercent: input.saltPercent,
    pizzaStyle: input.pizzaStyle,
  });
  const resolvedMethod = resolvePrefermentMethod(input.prefermentMethod, input.desiredOutcome);
  const warnings: string[] = [];

  // O retard nunca pode exceder o tempo total — clampa localmente (defesa
  // extra além do clamp já feito no reducer do formulário, já que esta
  // função pura pode ser chamada fora do form, ex: testes).
  if (input.coldRetardHours > input.fermentationHours) {
    warnings.push(
      'Horas de retard maiores que o tempo total de fermentação — ajustado para não ultrapassar o total.'
    );
  }
  const coldRetardHours = Math.min(Math.max(input.coldRetardHours, 0), input.fermentationHours);
  const roomHours = input.fermentationHours - coldRetardHours;

  if (coldRetardHours > 0 && roomHours < MIN_ROOM_HOURS_BEFORE_RETARD) {
    warnings.push(
      'Menos de 1h em temperatura ambiente antes da geladeira — a massa pode entrar no retard pouco desenvolvida. Não é necessariamente um erro, mas é incomum.'
    );
  }

  let totalYeastG: number | undefined;
  let naturalStarter: CalculatorOutput['preferments']['naturalStarter'];
  // Farinha/água disponíveis pra dividir entre pré-fermentos e massa final.
  // Com fermento natural, o starter é retirado daqui ANTES do split — assim
  // biga/poolish/massa final nunca ficam negativos mesmo quando consomem
  // 100% da farinha (ex: método "combined").
  let flourAvailableForSplit = totals.flourG;
  let waterAvailableForSplit = totals.waterG;

  if (input.yeastType === 'natural') {
    const range = naturalStarterRange(roomHours, input.ambientTempC, coldRetardHours, input.fridgeTempC);
    const midpointPercent = (range.minPercent + range.maxPercent) / 2;
    const starterFlourG = (totals.flourG * midpointPercent) / 100;
    const starterWaterG = starterFlourG; // starter a 100% de hidratação

    naturalStarter = {
      flourG: starterFlourG,
      waterG: starterWaterG,
      starterG: starterFlourG + starterWaterG,
    };
    flourAvailableForSplit -= starterFlourG;
    waterAvailableForSplit -= starterWaterG;

    warnings.push(
      `Fermento natural: faixa estimada de ${range.minPercent.toFixed(0)}–${range.maxPercent.toFixed(0)}% de starter ativo sobre o peso da farinha. É uma estimativa empírica — calibre pelo comportamento do seu starter.`
    );

    if (roomHours < SHORT_NATURAL_FERMENTATION_HOURS) {
      warnings.push(
        'Tempo de fermentação muito curto para fermento natural — o starter pode não desenvolver a tempo.'
      );
    }
  } else {
    const yeastPercent = calculateCommercialYeastPercent(
      [
        { hours: roomHours, tempC: input.ambientTempC },
        { hours: coldRetardHours, tempC: input.fridgeTempC },
      ],
      input.yeastType
    );
    totalYeastG = (totals.flourG * yeastPercent) / 100;

    if (yeastPercent > HIGH_YEAST_WARNING_THRESHOLD_PERCENT) {
      warnings.push(
        'Percentual de fermento calculado acima de 2% da farinha — combinação incomum de tempo/temperatura, revise os valores.'
      );
    }
  }

  const split = splitPreferments({
    method: resolvedMethod,
    totalFlourG: flourAvailableForSplit,
    totalWaterG: waterAvailableForSplit,
    totalYeastG,
  });

  if (split.prefermentHydrationScaledDown) {
    warnings.push(
      'Hidratação alvo baixa para o método de pré-fermento escolhido: a hidratação de biga/poolish foi ajustada proporcionalmente pra caber no total de água da receita.'
    );
  }

  const finalDough: DoughComponent = {
    flourG: split.finalDough.flourG,
    waterG: split.finalDough.waterG,
    saltG: totals.saltG,
    yeastG: split.finalDough.yeastG,
    oilG: totals.oilG,
    sugarG: totals.sugarG,
  };

  const [hydrationMin, hydrationMax] = STYLE_DEFAULTS[input.pizzaStyle].hydrationRange;
  if (input.hydrationPercent < hydrationMin || input.hydrationPercent > hydrationMax) {
    warnings.push(
      `Hidratação de ${input.hydrationPercent}% foge da faixa tradicional do estilo (${hydrationMin}–${hydrationMax}%). Não é um erro, só foge do tradicional.`
    );
  }

  return {
    totalDoughWeightG,
    numberOfBalls: input.numberOfBalls,
    ballWeightG: input.ballWeightG,
    totals,
    preferments: { biga: split.biga, poolish: split.poolish, naturalStarter },
    finalDough,
    timeline: buildTimeline(resolvedMethod, input.fermentationHours, coldRetardHours, input.fridgeTempC),
    warnings,
  };
}
