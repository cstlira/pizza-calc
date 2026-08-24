import type { CalculatorOutput, DoughComponent, TimelineStep } from '@/lib/calculations/types';
import type { Schedule } from '@/lib/calculations/schedule';
import { formatHoursMinutes } from './duration';

/** Mesma lógica de RecipeTicket.tsx — arredonda pra 1 casa decimal, "—" se undefined. */
function formatGrams(value: number | undefined): string {
  if (value === undefined) return '—';
  return `${Math.round(value * 10) / 10}g`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Mesma lógica de RecipeTicket.tsx (formatHydration). */
function formatHydration(component: DoughComponent): string {
  return `${Math.round((component.waterG / component.flourG) * 100)}%`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** Alinha pares label/valor em colunas monoespaçadas, pra renderizar dentro
 * de um bloco ```fenced``` no WhatsApp. */
function buildAlignedRows(pairs: Array<[string, string]>): string {
  const maxLabelLen = Math.max(...pairs.map(([label]) => label.length));
  const maxValueLen = Math.max(...pairs.map(([, value]) => value.length));
  return pairs
    .map(([label, value]) => `${label.padEnd(maxLabelLen, ' ')}  ${value.padStart(maxValueLen, ' ')}`)
    .join('\n');
}

function fence(content: string): string {
  return '```\n' + content + '\n```';
}

/** Mesmas linhas/ordem/condicionais de DoughComponentTable em RecipeTicket.tsx.
 * A linha "Fermento" mostra o percentual sobre a farinha TOTAL da receita
 * (totalFlourG), não a farinha local do componente. */
function buildComponentTable(component: DoughComponent, totalFlourG: number): string {
  const rows: [string, number | undefined][] = [
    ['Farinha', component.flourG],
    ['Água', component.waterG],
    ['Sal', component.saltG],
    ['Fermento', component.yeastG],
    ['Óleo', component.oilG],
    ['Açúcar', component.sugarG],
  ];

  const visibleRows = rows.filter((row): row is [string, number] => row[1] !== undefined);

  const pairs: Array<[string, string]> = visibleRows.map(([label, value]) => {
    const grams = formatGrams(value);
    const suffix = label === 'Fermento' ? ` (${formatPercent((value / totalFlourG) * 100)})` : '';
    return [label, `${grams}${suffix}`];
  });

  return buildAlignedRows(pairs);
}

function timelineLine(step: TimelineStep, index: number, at: Date | undefined): string {
  const timeStr = at ? dateTimeFormatter.format(at) : formatHoursMinutes(step.offsetHours);
  const duration = step.durationHours !== undefined ? ` (dura ${formatHoursMinutes(step.durationHours)})` : '';
  const noteLine = step.note ? `\n   ${step.note}` : '';
  return `${index + 1}. ${timeStr} — ${step.label}${duration}${noteLine}`;
}

/**
 * Formata o resultado do cálculo como uma mensagem de texto simples, pronta
 * pra ser usada em `https://wa.me/?text=<encodeURIComponent(message)>`.
 *
 * Espelha as mesmas seções/condicionais/ordem de RecipeTicket.tsx: Totais →
 * Biga (se houver) → Poolish (se houver) → Fermento natural (se houver) →
 * Massa final → Cronograma → Avisos (se houver).
 *
 * Função pura: sem acesso a DOM/window, sem efeitos colaterais.
 */
// String.fromCodePoint em vez do emoji literal no código-fonte: caracteres
// fora do plano básico (como 🍕, que precisa de par substituto UTF-16)
// aparecem corrompidos (�) depois do build — algo na cadeia de transpilação
// não preserva o byte cru corretamente. Construir em runtime a partir do
// code point evita isso por completo.
const PIZZA_EMOJI = String.fromCodePoint(0x1f355);

export function buildWhatsAppMessage(output: CalculatorOutput, schedule?: Schedule | null): string {
  const { biga, poolish, naturalStarter } = output.preferments;
  const totalFlourG = output.totals.flourG;

  const lines: string[] = [];

  lines.push(`${PIZZA_EMOJI} *Receita de pizza*`);
  lines.push('');
  lines.push(`Peso total da massa: *${formatGrams(output.totalDoughWeightG)}*`);
  lines.push(`Hidratação: *${formatHydration(output.totals)}*`);
  lines.push(
    output.numberOfBalls === 1
      ? `Rende: *1 pizza* (bola de ${formatGrams(output.ballWeightG)})`
      : `Rende: *${output.numberOfBalls} pizzas* (bolas de ${formatGrams(output.ballWeightG)} cada)`
  );

  if (schedule) {
    lines.push(`Começar em: *${dateTimeFormatter.format(schedule.startAt)}*`);
  }

  lines.push('');
  lines.push('*Totais da receita*');
  lines.push(fence(buildComponentTable(output.totals, totalFlourG)));

  if (biga) {
    lines.push('');
    lines.push(`*Biga* — ${formatHydration(biga)} hidratação`);
    lines.push(fence(buildComponentTable(biga, totalFlourG)));
  }

  if (poolish) {
    lines.push('');
    lines.push(`*Poolish* — ${formatHydration(poolish)} hidratação`);
    lines.push(fence(buildComponentTable(poolish, totalFlourG)));
  }

  if (naturalStarter) {
    lines.push('');
    lines.push('*Fermento natural (starter)*');
    lines.push(
      fence(
        buildAlignedRows([
          ['Farinha no starter', formatGrams(naturalStarter.flourG)],
          ['Água no starter', formatGrams(naturalStarter.waterG)],
          ['Starter ativo a adicionar', formatGrams(naturalStarter.starterG)],
        ])
      )
    );
  }

  lines.push('');
  lines.push('*Massa final (mix)*');
  lines.push(fence(buildComponentTable(output.finalDough, totalFlourG)));

  lines.push('');
  lines.push('*Cronograma*');
  output.timeline.forEach((step, index) => {
    const at = schedule?.steps[index]?.at;
    lines.push(timelineLine(step, index, at));
  });

  if (output.warnings.length > 0) {
    lines.push('');
    lines.push('*Avisos*');
    output.warnings.forEach((warning) => lines.push(`⚠️ ${warning}`));
  }

  return lines.join('\n');
}
