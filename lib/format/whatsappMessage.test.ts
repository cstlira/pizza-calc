import { describe, expect, it } from 'vitest';
import { buildWhatsAppMessage } from './whatsappMessage';
import { calculateRecipe } from '@/lib/calculations/calculateRecipe';
import { buildSchedule } from '@/lib/calculations/schedule';
import type { CalculatorInput, PrefermentMethod, YeastType } from '@/lib/calculations/types';

const baseInput: CalculatorInput = {
  ballWeightG: 250,
  numberOfBalls: 4,
  pizzaStyle: 'neapolitan',
  hydrationPercent: 62,
  saltPercent: 2.5,
  ambientTempC: 22,
  fermentationHours: 24,
  coldRetardHours: 0,
  fridgeTempC: 4,
  yeastType: 'dry',
  prefermentMethod: 'direct',
};

describe('buildWhatsAppMessage', () => {
  it('receita direct + fermento comercial: contém cabeçalhos, peso total, farinha/água/sal/fermento com percentual e cronograma numerado', () => {
    const output = calculateRecipe(baseInput);
    const message = buildWhatsAppMessage(output);

    expect(message).toContain('*Totais da receita*');
    expect(message).toContain('*Massa final (mix)*');
    expect(message).toContain('*Cronograma*');

    expect(message).toContain(`${Math.round(output.totalDoughWeightG * 10) / 10}g`);
    expect(message).toContain(`${Math.round(output.totals.flourG * 10) / 10}g`);
    expect(message).toContain(`${Math.round(output.totals.waterG * 10) / 10}g`);
    expect(message).toContain(`${Math.round(output.totals.saltG! * 10) / 10}g`);

    const yeastPercent = (output.finalDough.yeastG! / output.totals.flourG) * 100;
    expect(message).toContain(`${Math.round(output.finalDough.yeastG! * 10) / 10}g`);
    expect(message).toContain(`${yeastPercent.toFixed(2)}%`);

    output.timeline.forEach((step, index) => {
      expect(message).toContain(`${index + 1}. `);
      expect(message).toContain(step.label);
    });

    // sem preferments especiais nem starter nesse caso
    expect(message).not.toContain('*Biga*');
    expect(message).not.toContain('*Poolish*');
    expect(message).not.toContain('*Fermento natural (starter)*');
  });

  it('inclui a hidratação geral da massa', () => {
    const output = calculateRecipe(baseInput); // hydrationPercent: 62
    const message = buildWhatsAppMessage(output);
    const expectedHydration = Math.round((output.totals.waterG / output.totals.flourG) * 100);
    expect(message).toContain(`Hidratação: *${expectedHydration}%*`);
  });

  it('inclui a quantidade de pizzas e o peso da bola (plural)', () => {
    const output = calculateRecipe(baseInput); // numberOfBalls: 4, ballWeightG: 250
    const message = buildWhatsAppMessage(output);
    expect(message).toContain('Rende: *4 pizzas* (bolas de 250g cada)');
  });

  it('quantidade de pizzas no singular quando numberOfBalls é 1', () => {
    const output = calculateRecipe({ ...baseInput, numberOfBalls: 1 });
    const message = buildWhatsAppMessage(output);
    expect(message).toContain('Rende: *1 pizza* (bola de 250g)');
  });

  it('prefermentMethod biga: inclui seção "Biga" com percentual de hidratação', () => {
    const output = calculateRecipe({ ...baseInput, prefermentMethod: 'biga' });
    const message = buildWhatsAppMessage(output);

    expect(message).toContain('*Biga*');
    const expectedHydration = Math.round((output.preferments.biga!.waterG / output.preferments.biga!.flourG) * 100);
    expect(message).toContain(`${expectedHydration}% hidratação`);
    expect(message).not.toContain('*Poolish*');
  });

  it('prefermentMethod combined: inclui seções "Biga" e "Poolish", ambas com hidratação', () => {
    const output = calculateRecipe({ ...baseInput, prefermentMethod: 'combined' });
    const message = buildWhatsAppMessage(output);

    expect(message).toContain('*Biga*');
    expect(message).toContain('*Poolish*');
    expect(message).toMatch(/\*Biga\*.*hidratação/);
    expect(message).toMatch(/\*Poolish\*.*hidratação/);
  });

  it('yeastType natural: inclui seção de fermento natural com farinha/água/starter, sem linha "Fermento" comercial', () => {
    const output = calculateRecipe({ ...baseInput, yeastType: 'natural' });
    const message = buildWhatsAppMessage(output);

    expect(output.finalDough.yeastG).toBeUndefined();
    expect(message).toContain('*Fermento natural (starter)*');
    expect(message).toContain('Farinha no starter');
    expect(message).toContain('Água no starter');
    expect(message).toContain('Starter ativo a adicionar');

    const { naturalStarter } = output.preferments;
    expect(message).toContain(`${Math.round(naturalStarter!.flourG * 10) / 10}g`);
    expect(message).toContain(`${Math.round(naturalStarter!.waterG * 10) / 10}g`);
    expect(message).toContain(`${Math.round(naturalStarter!.starterG * 10) / 10}g`);
  });

  it('receita com avisos: inclui seção "Avisos" listando cada aviso com prefixo ⚠️', () => {
    const output = calculateRecipe({ ...baseInput, hydrationPercent: 78 });
    expect(output.warnings.length).toBeGreaterThan(0);

    const message = buildWhatsAppMessage(output);
    expect(message).toContain('*Avisos*');
    output.warnings.forEach((warning) => {
      expect(message).toContain(`⚠️ ${warning}`);
    });
  });

  it('sem schedule: cronograma mostra offsets relativos (Xh/Ymin) e não há linha "Começar em"', () => {
    const output = calculateRecipe(baseInput);
    const message = buildWhatsAppMessage(output);

    expect(message).not.toContain('Começar em');

    const firstStep = output.timeline[0];
    const totalMinutes = Math.round((firstStep.offsetHours * 60) / 10) * 10;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const expectedOffset = hours === 0 ? `${minutes}min` : minutes === 0 ? `${hours}h` : `${hours}h${minutes}min`;
    expect(message).toContain(expectedOffset);
  });

  it('com schedule: mostra "Começar em" e horários absolutos formatados em vez de offsets', () => {
    const output = calculateRecipe(baseInput);
    const desiredServeAt = new Date('2026-08-22T19:00:00');
    const schedule = buildSchedule(output.timeline, desiredServeAt);

    const message = buildWhatsAppMessage(output, schedule);

    expect(message).toContain('Começar em');

    const formatter = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    expect(message).toContain(formatter.format(schedule.startAt));
    schedule.steps.forEach((step) => {
      expect(message).toContain(formatter.format(step.at));
    });
  });

  it('nunca lança exceção e sempre retorna string não vazia, para uma variedade de combinações de método/tipo de fermento, com e sem schedule', () => {
    const methods: PrefermentMethod[] = ['direct', 'biga', 'poolish', 'combined', 'auto'];
    const yeastTypes: YeastType[] = ['instant', 'dry', 'fresh', 'natural'];

    for (const prefermentMethod of methods) {
      for (const yeastType of yeastTypes) {
        const input: CalculatorInput = {
          ...baseInput,
          prefermentMethod,
          yeastType,
          desiredOutcome: prefermentMethod === 'auto' ? 'balanced' : undefined,
        };

        const output = calculateRecipe(input);

        expect(() => buildWhatsAppMessage(output)).not.toThrow();
        expect(buildWhatsAppMessage(output).length).toBeGreaterThan(0);

        const schedule = buildSchedule(output.timeline, new Date('2026-08-22T19:00:00'));
        expect(() => buildWhatsAppMessage(output, schedule)).not.toThrow();
        expect(buildWhatsAppMessage(output, schedule).length).toBeGreaterThan(0);

        expect(buildWhatsAppMessage(output, null).length).toBeGreaterThan(0);
      }
    }
  });
});
