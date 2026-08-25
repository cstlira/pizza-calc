'use client';

import type { Dispatch } from 'react';
import type { CalculatorFormAction, CalculatorFormState } from '@/lib/form/calculatorFormReducer';
import type { DesiredOutcome, PizzaStyle, PrefermentMethod, YeastType } from '@/lib/calculations/types';
import { HYDRATION_SLIDER_RANGE, SALT_PRESETS, STYLE_DEFAULTS } from '@/lib/presets/styleDefaults';
import { METHOD_JUSTIFICATION } from '@/lib/presets/outcomeSuggestions';
import { formatHoursMinutes } from '@/lib/format/duration';

export interface CalculatorFormProps {
  state: CalculatorFormState;
  dispatch: Dispatch<CalculatorFormAction>;
  /** Horário desejado pra começar a receita, formato datetime-local ("" = não definido). Junto com desiredServeAt, substitui o "Tempo de fermentação (h)" digitado por um valor calculado — ver app/page.tsx. Fora do reducer pelo mesmo motivo de desiredServeAt. */
  desiredStartAt: string;
  onDesiredStartAtChange: (value: string) => void;
  /** Horário desejado pra servir, formato datetime-local ("" = não definido). Não faz parte de CalculatorInput — é puramente de exibição (ver lib/calculations/schedule.ts), então fica fora do reducer. */
  desiredServeAt: string;
  onDesiredServeAtChange: (value: string) => void;
  /** Calculado em app/page.tsx a partir de desiredStartAt/desiredServeAt; null quando um dos dois falta ou o intervalo é inválido (início não antes de servir). */
  computedFermentationHours: number | null;
}

/** Formata uma Date no formato que <input type="datetime-local"> espera, em horário local (não UTC). */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Campos numéricos de texto livre podem ser esvaziados ou zerados pelo
 * usuário mesmo com `min` no input (o atributo não bloqueia digitação) —
 * isso alimentaria o motor de cálculo com 0, o que gera divisão por zero
 * (Infinity) em fermentationHours. Limite no boundary da UI.
 */
function toPositiveNumber(rawValue: string, min: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, parsed);
}

/** Como toPositiveNumber, mas com teto também — usado pro retard na geladeira, que não pode passar do tempo total. */
function toClampedNumber(rawValue: string, min: number, max: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

const PIZZA_STYLE_LABELS: Record<PizzaStyle, string> = {
  neapolitan: 'Napolitana',
  ny: 'Nova York',
};

const YEAST_TYPE_LABELS: Record<YeastType, string> = {
  natural: 'Natural (levain)',
  instant: 'Seco instantâneo',
  dry: 'Seco ativo',
  fresh: 'Fresco',
};

const PREFERMENT_METHOD_LABELS: Record<PrefermentMethod, string> = {
  direct: 'Direto',
  biga: 'Biga',
  poolish: 'Poolish',
  combined: 'Combinado (biga + poolish)',
  auto: 'Sugerir automaticamente',
};

const DESIRED_OUTCOME_LABELS: Record<DesiredOutcome, string> = {
  lightness: 'Leveza',
  flavor: 'Sabor',
  balanced: 'Equilíbrio',
  simplicity: 'Simplicidade',
};

const OUTCOME_TO_METHOD_FOR_JUSTIFICATION: Record<DesiredOutcome, Exclude<PrefermentMethod, 'auto'>> = {
  lightness: 'biga',
  flavor: 'poolish',
  balanced: 'combined',
  simplicity: 'direct',
};

const LEGEND = 'font-display text-lg text-semola-gold';
const LABEL = 'block text-xs font-semibold uppercase tracking-widest text-flour-dust/60 mb-1.5';
const FIELD_WRAPPER = 'block';
const NUMBER_INPUT =
  'w-full bg-char-black border border-crust-brown/60 rounded-sm px-3 py-2 font-data text-flour-dust focus:outline-none focus:border-semola-gold focus:ring-1 focus:ring-semola-gold transition-colors';
const SELECT_INPUT =
  'w-full bg-char-black border border-crust-brown/60 rounded-sm px-3 py-2 text-flour-dust focus:outline-none focus:border-semola-gold focus:ring-1 focus:ring-semola-gold transition-colors';
const HINT = 'mt-1 text-xs text-flour-dust/45';
const NOTE = 'mt-1.5 text-xs italic text-flour-dust/70';
const WARNING_NOTE = 'mt-1.5 text-xs text-semola-gold';
const FIELDSET = 'mb-8 border-t border-crust-brown/40 pt-5';

export function CalculatorForm({
  state,
  dispatch,
  desiredStartAt,
  onDesiredStartAtChange,
  desiredServeAt,
  onDesiredServeAtChange,
  computedFermentationHours,
}: CalculatorFormProps) {
  const styleDefaults = STYLE_DEFAULTS[state.pizzaStyle];
  const [hydrationMin, hydrationMax] = HYDRATION_SLIDER_RANGE;
  const isHydrationOutsideStyle =
    state.hydrationPercent < styleDefaults.hydrationRange[0] ||
    state.hydrationPercent > styleDefaults.hydrationRange[1];

  const hasFermentationDateRangeError =
    desiredStartAt !== '' && desiredServeAt !== '' && computedFermentationHours === null;
  const effectiveFermentationHours = computedFermentationHours ?? state.fermentationHours;
  const roomHours = effectiveFermentationHours - state.coldRetardHours;

  return (
    <form aria-label="Calculadora de massa de pizza" className="font-sans">
      <fieldset className="border-t-0 pt-0">
        <legend className={LEGEND}>Estilo</legend>
        <label className={FIELD_WRAPPER}>
          <span className={LABEL}>Estilo de pizza</span>
          <select
            className={SELECT_INPUT}
            value={state.pizzaStyle}
            onChange={(e) =>
              dispatch({ type: 'SET_PIZZA_STYLE', pizzaStyle: e.target.value as PizzaStyle })
            }
          >
            {Object.entries(PIZZA_STYLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className={FIELDSET}>
        <legend className={LEGEND}>Massa</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>Peso da bola (g)</span>
            <input
              className={NUMBER_INPUT}
              type="number"
              min={styleDefaults.ballWeightRange[0]}
              max={styleDefaults.ballWeightRange[1]}
              value={state.ballWeightG}
              onChange={(e) =>
                dispatch({ type: 'SET_BALL_WEIGHT', ballWeightG: toPositiveNumber(e.target.value, 50) })
              }
            />
            <p className={HINT}>
              sugerido: {styleDefaults.ballWeightRange[0]}–{styleDefaults.ballWeightRange[1]}g
            </p>
          </label>

          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>Número de bolas</span>
            <input
              className={NUMBER_INPUT}
              type="number"
              min={1}
              value={state.numberOfBalls}
              onChange={(e) =>
                dispatch({ type: 'SET_NUMBER_OF_BALLS', numberOfBalls: toPositiveNumber(e.target.value, 1) })
              }
            />
          </label>
        </div>

        <label className={`${FIELD_WRAPPER} mt-4`}>
          <span className={LABEL}>
            Hidratação <span className="font-data text-flour-dust">{state.hydrationPercent}%</span>
          </span>
          <input
            className="w-full accent-san-marzano"
            type="range"
            min={hydrationMin}
            max={hydrationMax}
            value={state.hydrationPercent}
            onChange={(e) => dispatch({ type: 'SET_HYDRATION', hydrationPercent: Number(e.target.value) })}
          />
          <p className={HINT}>
            sugerido pro estilo: {styleDefaults.hydrationRange[0]}–{styleDefaults.hydrationRange[1]}%
          </p>
          {isHydrationOutsideStyle && (
            <p role="note" className={WARNING_NOTE}>
              Fora da faixa tradicional do estilo — não é errado, só foge do tradicional.
            </p>
          )}
        </label>

        <label className={`${FIELD_WRAPPER} mt-4`}>
          <span className={LABEL}>Sal</span>
          <select
            className={SELECT_INPUT}
            value={state.saltPercent}
            onChange={(e) => dispatch({ type: 'SET_SALT', saltPercent: Number(e.target.value) })}
          >
            {SALT_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}%
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className={FIELDSET}>
        <legend className={LEGEND}>Fermentação</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>Temperatura ambiente (°C)</span>
            <input
              className={NUMBER_INPUT}
              type="number"
              value={state.ambientTempC}
              onChange={(e) => dispatch({ type: 'SET_AMBIENT_TEMP', ambientTempC: Number(e.target.value) })}
            />
          </label>

          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>Tempo de fermentação (h)</span>
            <input
              className={`${NUMBER_INPUT} ${computedFermentationHours !== null ? 'opacity-60' : ''}`}
              type="number"
              min={1}
              disabled={computedFermentationHours !== null}
              value={
                computedFermentationHours !== null
                  ? Math.round(computedFermentationHours * 10) / 10
                  : state.fermentationHours
              }
              onChange={(e) =>
                dispatch({
                  type: 'SET_FERMENTATION_HOURS',
                  fermentationHours: toPositiveNumber(e.target.value, 1),
                })
              }
            />
            <p className={HINT}>
              {computedFermentationHours !== null
                ? `calculado: ${formatHoursMinutes(computedFermentationHours)} (a partir do início e do horário de servir)`
                : 'ou informe início + horário de servir abaixo'}
            </p>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>
              Fermentação em temperatura ambiente{' '}
              <span className="font-data text-flour-dust">{formatHoursMinutes(roomHours)}</span>
            </span>
            <input
              className="w-full accent-san-marzano"
              type="range"
              min={0}
              max={effectiveFermentationHours}
              step={0.5}
              value={roomHours}
              onChange={(e) => {
                const newRoomHours = toClampedNumber(e.target.value, 0, effectiveFermentationHours);
                dispatch({
                  type: 'SET_COLD_RETARD_HOURS',
                  coldRetardHours: effectiveFermentationHours - newRoomHours,
                });
              }}
            />
            <p className={HINT}>bulk + descanso de bancada, fora da geladeira</p>
          </label>

          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>
              Retard na geladeira{' '}
              <span className="font-data text-flour-dust">{formatHoursMinutes(state.coldRetardHours)}</span>
            </span>
            <input
              className="w-full accent-san-marzano"
              type="range"
              min={0}
              max={effectiveFermentationHours}
              step={0.5}
              value={state.coldRetardHours}
              onChange={(e) =>
                dispatch({
                  type: 'SET_COLD_RETARD_HOURS',
                  coldRetardHours: toClampedNumber(e.target.value, 0, effectiveFermentationHours),
                })
              }
            />
            <p className={HINT}>0 = sem retard na geladeira</p>
          </label>
        </div>

        <label
          className={`${FIELD_WRAPPER} mt-4 ${state.coldRetardHours === 0 ? 'opacity-50' : ''}`}
        >
          <span className={LABEL}>Temperatura da geladeira (°C)</span>
          <input
            className={NUMBER_INPUT}
            type="number"
            value={state.fridgeTempC}
            onChange={(e) => dispatch({ type: 'SET_FRIDGE_TEMP', fridgeTempC: Number(e.target.value) })}
          />
          <p className={HINT}>geladeira doméstica típica: 2–6°C</p>
        </label>

        <label className={`${FIELD_WRAPPER} mt-4`}>
          <span className={LABEL}>Tipo de fermento</span>
          <select
            className={SELECT_INPUT}
            value={state.yeastType}
            onChange={(e) => dispatch({ type: 'SET_YEAST_TYPE', yeastType: e.target.value as YeastType })}
          >
            {Object.entries(YEAST_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className={FIELDSET}>
        <legend className={LEGEND}>Método de pré-fermento</legend>
        <label className={FIELD_WRAPPER}>
          <span className={LABEL}>Método</span>
          <select
            className={SELECT_INPUT}
            value={state.prefermentMethod}
            onChange={(e) =>
              dispatch({
                type: 'SET_PREFERMENT_METHOD',
                prefermentMethod: e.target.value as PrefermentMethod,
              })
            }
          >
            {Object.entries(PREFERMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {state.prefermentMethod === 'auto' && (
          <label className={`${FIELD_WRAPPER} mt-4`}>
            <span className={LABEL}>O que você quer priorizar?</span>
            <select
              className={SELECT_INPUT}
              value={state.desiredOutcome}
              onChange={(e) =>
                dispatch({
                  type: 'SET_DESIRED_OUTCOME',
                  desiredOutcome: e.target.value as DesiredOutcome,
                })
              }
            >
              {Object.entries(DESIRED_OUTCOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {state.desiredOutcome && (
              <p role="note" className={NOTE}>
                {METHOD_JUSTIFICATION[OUTCOME_TO_METHOD_FOR_JUSTIFICATION[state.desiredOutcome]]}
              </p>
            )}
          </label>
        )}

        {state.prefermentMethod !== 'auto' && state.prefermentMethod !== 'direct' && (
          <p role="note" className={NOTE}>
            {METHOD_JUSTIFICATION[state.prefermentMethod]}
          </p>
        )}
      </fieldset>

      <fieldset className={FIELDSET}>
        <legend className={LEGEND}>Horário</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>Quando quer começar?</span>
            <div className="flex gap-2">
              <input
                className={NUMBER_INPUT.replace('w-full', 'min-w-0 flex-1')}
                type="datetime-local"
                value={desiredStartAt}
                onChange={(e) => onDesiredStartAtChange(e.target.value)}
              />
              <button
                type="button"
                onClick={() => onDesiredStartAtChange(toDatetimeLocalValue(new Date()))}
                className="shrink-0 rounded-sm border border-crust-brown/60 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-flour-dust/70 transition-colors hover:border-semola-gold hover:text-semola-gold focus:outline-none focus:border-semola-gold focus:ring-1 focus:ring-semola-gold"
              >
                Agora
              </button>
            </div>
            <p className={HINT}>opcional — junto com “servir quando”, calcula o tempo de fermentação</p>
          </label>

          <label className={FIELD_WRAPPER}>
            <span className={LABEL}>Quer servir quando?</span>
            <input
              className={NUMBER_INPUT}
              type="datetime-local"
              value={desiredServeAt}
              onChange={(e) => onDesiredServeAtChange(e.target.value)}
            />
            <p className={HINT}>opcional — mostra o horário exato de cada etapa</p>
          </label>
        </div>

        {hasFermentationDateRangeError && (
          <p role="note" className={WARNING_NOTE}>
            O início precisa ser antes do horário de servir — ajuste as datas pra eu calcular o tempo de
            fermentação. Por enquanto, “Tempo de fermentação (h)” continua manual.
          </p>
        )}
      </fieldset>
    </form>
  );
}
