import { fermentationRateRelativeToReference } from './fermentationRate';

export interface NaturalStarterRange {
  minPercent: number;
  maxPercent: number;
}

/**
 * Heurística, não fórmula cinética validada (ver seção 3.3 do plano):
 * fermento natural não tem o mesmo modelo tempo/temperatura documentado
 * publicamente com precisão que o fermento comercial. 15-25% do peso da
 * farinha é o intervalo comum pra starter a 100% de hidratação; a faixa
 * desliza dentro (e um pouco além) desse intervalo conforme tempo/temperatura
 * se afastam da referência (18h a 22°C).
 */
const REFERENCE_HOURS = 18;
const REFERENCE_TEMP_C = 22;
const BASE_CENTER_PERCENT = 20;
const HOURS_SENSITIVITY = 0.4; // pontos percentuais por hora de desvio
const TEMP_SENSITIVITY = 0.5; // pontos percentuais por °C de desvio
const SPREAD_PERCENT = 3;
const MIN_CLAMP = 10;
const MAX_CLAMP = 35;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * `roomHours`/`ambientTempC` alimentam os dois eixos originais, intocados
 * (garante que com coldRetardHours=0 o resultado é idêntico ao modelo
 * anterior, pra qualquer ambientTempC). O retard entra como um terceiro
 * termo aditivo independente: `coldRetardHours * taxa(fridgeTempC)` é
 * tratado como "horas efetivas extras" na mesma escala de HOURS_SENSITIVITY
 * — mais horas de geladeira (ou geladeira mais quente) reduz o starter
 * necessário, já que mais progresso de fermentação já aconteceu no total.
 */
export function naturalStarterRange(
  roomHours: number,
  ambientTempC: number,
  coldRetardHours: number,
  fridgeTempC: number
): NaturalStarterRange {
  // tempo curto ou temp baixa → mais starter; tempo longo/temp alta → menos
  const hoursAdjustment = (REFERENCE_HOURS - roomHours) * HOURS_SENSITIVITY;
  const tempAdjustment = (REFERENCE_TEMP_C - ambientTempC) * TEMP_SENSITIVITY;
  const coldRetardAdjustment =
    -coldRetardHours * fermentationRateRelativeToReference(fridgeTempC) * HOURS_SENSITIVITY;
  const center = clamp(
    BASE_CENTER_PERCENT + hoursAdjustment + tempAdjustment + coldRetardAdjustment,
    MIN_CLAMP,
    MAX_CLAMP
  );

  return {
    minPercent: clamp(center - SPREAD_PERCENT, MIN_CLAMP, MAX_CLAMP),
    maxPercent: clamp(center + SPREAD_PERCENT, MIN_CLAMP, MAX_CLAMP),
  };
}
