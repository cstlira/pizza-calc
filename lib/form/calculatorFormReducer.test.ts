import { describe, expect, it } from 'vitest';
import { calculatorFormReducer, createInitialState } from './calculatorFormReducer';

describe('createInitialState', () => {
  it('usa os defaults do estilo neapolitan por padrão', () => {
    const state = createInitialState();
    expect(state.pizzaStyle).toBe('neapolitan');
    expect(state.ballWeightG).toBe(280);
    expect(state.numberOfBalls).toBe(2);
    expect(state.hydrationPercent).toBe(62);
    expect(state.coldRetardHours).toBe(0);
    expect(state.fridgeTempC).toBe(4);
    expect(state.desiredOutcome).toBeUndefined();
  });

  it('peso da bola e número de bolas são fixos, independentes do estilo', () => {
    const state = createInitialState('ny');
    expect(state.ballWeightG).toBe(280);
    expect(state.numberOfBalls).toBe(2);
  });

  it('hidratação continua derivada do estilo', () => {
    const state = createInitialState('ny');
    expect(state.hydrationPercent).toBe(63);
  });
});

describe('calculatorFormReducer', () => {
  it('SET_PIZZA_STYLE só muda o estilo, não força os outros campos', () => {
    const state = createInitialState('neapolitan');
    const next = calculatorFormReducer(state, { type: 'SET_PIZZA_STYLE', pizzaStyle: 'ny' });
    expect(next.pizzaStyle).toBe('ny');
    expect(next.hydrationPercent).toBe(state.hydrationPercent);
    expect(next.ballWeightG).toBe(state.ballWeightG);
  });

  it('SET_PREFERMENT_METHOD para "auto" preenche desiredOutcome com um default', () => {
    const state = createInitialState();
    const next = calculatorFormReducer(state, { type: 'SET_PREFERMENT_METHOD', prefermentMethod: 'auto' });
    expect(next.prefermentMethod).toBe('auto');
    expect(next.desiredOutcome).toBe('balanced');
  });

  it('SET_PREFERMENT_METHOD saindo de "auto" limpa o desiredOutcome', () => {
    const state = calculatorFormReducer(createInitialState(), {
      type: 'SET_PREFERMENT_METHOD',
      prefermentMethod: 'auto',
    });
    const next = calculatorFormReducer(state, { type: 'SET_PREFERMENT_METHOD', prefermentMethod: 'biga' });
    expect(next.prefermentMethod).toBe('biga');
    expect(next.desiredOutcome).toBeUndefined();
  });

  it('SET_PREFERMENT_METHOD reafirmando "auto" preserva o desiredOutcome já escolhido', () => {
    let state = calculatorFormReducer(createInitialState(), {
      type: 'SET_PREFERMENT_METHOD',
      prefermentMethod: 'auto',
    });
    state = calculatorFormReducer(state, { type: 'SET_DESIRED_OUTCOME', desiredOutcome: 'flavor' });
    const next = calculatorFormReducer(state, { type: 'SET_PREFERMENT_METHOD', prefermentMethod: 'auto' });
    expect(next.desiredOutcome).toBe('flavor');
  });

  it('RESET volta ao estado inicial, opcionalmente com outro estilo', () => {
    let state = createInitialState();
    state = calculatorFormReducer(state, { type: 'SET_FERMENTATION_HOURS', fermentationHours: 6 });
    const reset = calculatorFormReducer(state, { type: 'RESET', pizzaStyle: 'ny' });
    expect(reset).toEqual(createInitialState('ny'));
  });

  it('campos numéricos simples são atualizados diretamente', () => {
    const state = createInitialState();
    expect(calculatorFormReducer(state, { type: 'SET_BALL_WEIGHT', ballWeightG: 300 }).ballWeightG).toBe(300);
    expect(
      calculatorFormReducer(state, { type: 'SET_NUMBER_OF_BALLS', numberOfBalls: 6 }).numberOfBalls
    ).toBe(6);
    expect(calculatorFormReducer(state, { type: 'SET_HYDRATION', hydrationPercent: 70 }).hydrationPercent).toBe(
      70
    );
    expect(calculatorFormReducer(state, { type: 'SET_SALT', saltPercent: 3 }).saltPercent).toBe(3);
    expect(calculatorFormReducer(state, { type: 'SET_AMBIENT_TEMP', ambientTempC: 28 }).ambientTempC).toBe(
      28
    );
    expect(calculatorFormReducer(state, { type: 'SET_YEAST_TYPE', yeastType: 'natural' }).yeastType).toBe(
      'natural'
    );
  });

  describe('SET_COLD_RETARD_HOURS', () => {
    it('define o valor dentro da faixa', () => {
      const state = createInitialState();
      const next = calculatorFormReducer(state, { type: 'SET_COLD_RETARD_HOURS', coldRetardHours: 12 });
      expect(next.coldRetardHours).toBe(12);
    });

    it('clampa valores negativos pra 0', () => {
      const state = createInitialState();
      const next = calculatorFormReducer(state, { type: 'SET_COLD_RETARD_HOURS', coldRetardHours: -5 });
      expect(next.coldRetardHours).toBe(0);
    });

    it('não clampa contra fermentationHours — o teto é responsabilidade de quem despacha (form) e de calculateRecipe', () => {
      // Motivo: quando início+servir calculam o tempo de fermentação
      // efetivo, state.fermentationHours (o campo manual) fica desatualizado
      // e não é mais o teto correto. Ver CalculatorForm.tsx.
      const state = createInitialState(); // fermentationHours: 24
      const next = calculatorFormReducer(state, { type: 'SET_COLD_RETARD_HOURS', coldRetardHours: 100 });
      expect(next.coldRetardHours).toBe(100);
    });
  });

  describe('SET_FRIDGE_TEMP', () => {
    it('define o valor diretamente', () => {
      const state = createInitialState();
      const next = calculatorFormReducer(state, { type: 'SET_FRIDGE_TEMP', fridgeTempC: 2 });
      expect(next.fridgeTempC).toBe(2);
    });
  });

  describe('SET_FERMENTATION_HOURS e o retard', () => {
    it('reduzir o total abaixo do retard atual arrasta o retard pra baixo junto', () => {
      let state = createInitialState();
      state = calculatorFormReducer(state, { type: 'SET_COLD_RETARD_HOURS', coldRetardHours: 20 });
      const next = calculatorFormReducer(state, { type: 'SET_FERMENTATION_HOURS', fermentationHours: 10 });
      expect(next.fermentationHours).toBe(10);
      expect(next.coldRetardHours).toBe(10);
    });

    it('aumentar o total não mexe num retard que já cabia', () => {
      let state = createInitialState();
      state = calculatorFormReducer(state, { type: 'SET_COLD_RETARD_HOURS', coldRetardHours: 8 });
      const next = calculatorFormReducer(state, { type: 'SET_FERMENTATION_HOURS', fermentationHours: 30 });
      expect(next.fermentationHours).toBe(30);
      expect(next.coldRetardHours).toBe(8);
    });
  });
});
