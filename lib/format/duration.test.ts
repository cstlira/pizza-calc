import { describe, expect, it } from 'vitest';
import { formatHoursMinutes } from './duration';

describe('formatHoursMinutes', () => {
  it('arredonda pro múltiplo de 10 minutos mais próximo', () => {
    expect(formatHoursMinutes(3 + 54 / 60)).toBe('3h50min'); // 3:54 -> 3:50
    expect(formatHoursMinutes(4 + 1 / 60)).toBe('4h'); // 4:01 -> 4:00
    expect(formatHoursMinutes(4 + 26 / 60)).toBe('4h30min'); // 4:26 -> 4:30
    expect(formatHoursMinutes(5 + 39 / 60)).toBe('5h40min'); // 5:39 -> 5:40
  });

  it('sem horas: mostra só minutos', () => {
    expect(formatHoursMinutes(20 / 60)).toBe('20min');
  });

  it('minutos exatos: mostra só horas', () => {
    expect(formatHoursMinutes(6)).toBe('6h');
  });

  it('arredondamento de minutos que carrega pra próxima hora', () => {
    expect(formatHoursMinutes(4 + 59 / 60)).toBe('5h');
  });
});
