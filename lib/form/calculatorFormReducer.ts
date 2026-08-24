import type {
  CalculatorInput,
  DesiredOutcome,
  PizzaStyle,
  PrefermentMethod,
  YeastType,
} from '@/lib/calculations/types';
import { SALT_PRESETS, STYLE_DEFAULTS } from '@/lib/presets/styleDefaults';

export type CalculatorFormState = CalculatorInput;

const DEFAULT_DESIRED_OUTCOME: DesiredOutcome = 'balanced';

export function createInitialState(pizzaStyle: PizzaStyle = 'neapolitan'): CalculatorFormState {
  const defaults = STYLE_DEFAULTS[pizzaStyle];
  return {
    ballWeightG: 280,
    numberOfBalls: 2,
    pizzaStyle,
    hydrationPercent: defaults.hydrationDefault,
    saltPercent: SALT_PRESETS[1],
    ambientTempC: 22,
    fermentationHours: 24,
    coldRetardHours: 0,
    fridgeTempC: 4,
    yeastType: 'dry',
    prefermentMethod: 'direct',
    desiredOutcome: undefined,
  };
}

export type CalculatorFormAction =
  | { type: 'SET_PIZZA_STYLE'; pizzaStyle: PizzaStyle }
  | { type: 'SET_BALL_WEIGHT'; ballWeightG: number }
  | { type: 'SET_NUMBER_OF_BALLS'; numberOfBalls: number }
  | { type: 'SET_HYDRATION'; hydrationPercent: number }
  | { type: 'SET_SALT'; saltPercent: number }
  | { type: 'SET_AMBIENT_TEMP'; ambientTempC: number }
  | { type: 'SET_FERMENTATION_HOURS'; fermentationHours: number }
  | { type: 'SET_COLD_RETARD_HOURS'; coldRetardHours: number }
  | { type: 'SET_FRIDGE_TEMP'; fridgeTempC: number }
  | { type: 'SET_YEAST_TYPE'; yeastType: YeastType }
  | { type: 'SET_PREFERMENT_METHOD'; prefermentMethod: PrefermentMethod }
  | { type: 'SET_DESIRED_OUTCOME'; desiredOutcome: DesiredOutcome }
  | { type: 'RESET'; pizzaStyle?: PizzaStyle };

export function calculatorFormReducer(
  state: CalculatorFormState,
  action: CalculatorFormAction
): CalculatorFormState {
  switch (action.type) {
    case 'SET_PIZZA_STYLE':
      return { ...state, pizzaStyle: action.pizzaStyle };
    case 'SET_BALL_WEIGHT':
      return { ...state, ballWeightG: action.ballWeightG };
    case 'SET_NUMBER_OF_BALLS':
      return { ...state, numberOfBalls: action.numberOfBalls };
    case 'SET_HYDRATION':
      return { ...state, hydrationPercent: action.hydrationPercent };
    case 'SET_SALT':
      return { ...state, saltPercent: action.saltPercent };
    case 'SET_AMBIENT_TEMP':
      return { ...state, ambientTempC: action.ambientTempC };
    case 'SET_FERMENTATION_HOURS': {
      // Reduzir o total abaixo do retard atual arrasta o retard junto — não
      // pode passar do total.
      const fermentationHours = action.fermentationHours;
      const coldRetardHours = Math.min(state.coldRetardHours, fermentationHours);
      return { ...state, fermentationHours, coldRetardHours };
    }
    case 'SET_COLD_RETARD_HOURS': {
      const coldRetardHours = Math.min(Math.max(action.coldRetardHours, 0), state.fermentationHours);
      return { ...state, coldRetardHours };
    }
    case 'SET_FRIDGE_TEMP':
      return { ...state, fridgeTempC: action.fridgeTempC };
    case 'SET_YEAST_TYPE':
      return { ...state, yeastType: action.yeastType };
    case 'SET_PREFERMENT_METHOD': {
      // "auto" precisa de um desiredOutcome pra resolver o método; ao sair de
      // "auto" o outcome escolhido deixa de fazer sentido e é limpo.
      const desiredOutcome =
        action.prefermentMethod === 'auto' ? state.desiredOutcome ?? DEFAULT_DESIRED_OUTCOME : undefined;
      return { ...state, prefermentMethod: action.prefermentMethod, desiredOutcome };
    }
    case 'SET_DESIRED_OUTCOME':
      return { ...state, desiredOutcome: action.desiredOutcome };
    case 'RESET':
      return createInitialState(action.pizzaStyle ?? state.pizzaStyle);
    default:
      return state;
  }
}
