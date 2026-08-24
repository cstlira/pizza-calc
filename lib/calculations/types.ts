export type PizzaStyle = 'neapolitan' | 'ny';
export type YeastType = 'natural' | 'instant' | 'dry' | 'fresh';
export type PrefermentMethod = 'direct' | 'biga' | 'poolish' | 'combined' | 'auto';
export type DesiredOutcome = 'lightness' | 'flavor' | 'balanced' | 'simplicity';

export interface CalculatorInput {
  ballWeightG: number;
  numberOfBalls: number;
  pizzaStyle: PizzaStyle;
  hydrationPercent: number; // 60-80, faixa validada na UI
  saltPercent: number; // presets: 2 / 2.5 / 3
  ambientTempC: number;
  fermentationHours: number; // total, inclui coldRetardHours
  coldRetardHours: number; // parte de fermentationHours passada na geladeira; 0 = sem retard
  fridgeTempC: number;
  yeastType: YeastType;
  prefermentMethod: PrefermentMethod;
  desiredOutcome?: DesiredOutcome; // obrigatório só se prefermentMethod === 'auto'
}

export interface DoughComponent {
  flourG: number;
  waterG: number;
  saltG?: number;
  yeastG?: number;
  oilG?: number;
  sugarG?: number;
}

export interface CalculatorOutput {
  totalDoughWeightG: number;
  numberOfBalls: number;
  ballWeightG: number;
  totals: DoughComponent; // farinha/água/sal/óleo/açúcar consolidados
  preferments: {
    biga?: DoughComponent;
    poolish?: DoughComponent;
    naturalStarter?: { flourG: number; waterG: number; starterG: number };
  };
  finalDough: DoughComponent; // o que entra na mistura final
  timeline: TimelineStep[];
  warnings: string[]; // ex: hidratação fora do padrão do estilo
}

export interface TimelineStep {
  label: string;
  offsetHours: number; // relativo ao início do processo
  durationHours?: number;
  note?: string;
}
