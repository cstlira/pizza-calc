import type { CalculatorOutput, DoughComponent, TimelineStep } from '@/lib/calculations/types';
import type { Schedule } from '@/lib/calculations/schedule';
import { roundTimelineForDisplay } from '@/lib/calculations/timelineRounding';
import { buildWhatsAppMessage } from '@/lib/format/whatsappMessage';
import { formatHoursMinutes } from '@/lib/format/duration';
import { FermentationCurve } from './FermentationCurve';
import { TimelineIcon } from './TimelineIcon';

export interface RecipeTicketProps {
  output: CalculatorOutput;
  schedule?: Schedule | null;
}

function formatGrams(value: number | undefined): string {
  if (value === undefined) return '—';
  return `${Math.round(value * 10) / 10}g`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Hidratação real do componente (água/farinha) — reflete qualquer ajuste
 * proporcional feito em splitPreferments quando a água da receita não
 * comportava a hidratação "de livro-texto" de biga/poolish. */
function formatHydration(component: DoughComponent): string {
  return `${Math.round((component.waterG / component.flourG) * 100)}%`;
}

const SCHEDULED_AT_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatScheduledAt(date: Date): string {
  return SCHEDULED_AT_FORMATTER.format(date);
}

const SECTION_HEADING =
  'font-display text-base uppercase tracking-wide text-crust-brown border-b border-dashed border-crust-brown/30 pb-1 mb-2 mt-6 first:mt-0';
const ROW = 'flex justify-between border-b border-dashed border-crust-brown/20 py-1 text-sm last:border-0';
const ROW_LABEL = 'text-crust-brown/80';
const ROW_VALUE = 'font-data tabular-nums font-semibold text-char-black';

function DoughComponentTable({ component, totalFlourG }: { component: DoughComponent; totalFlourG: number }) {
  const rows: [string, number | undefined][] = [
    ['Farinha', component.flourG],
    ['Água', component.waterG],
    ['Sal', component.saltG],
    ['Fermento', component.yeastG],
    ['Óleo', component.oilG],
    ['Açúcar', component.sugarG],
  ];

  return (
    <dl>
      {rows
        .filter(([, value]) => value !== undefined)
        .map(([label, value]) => (
          <div key={label} className={ROW}>
            <dt className={ROW_LABEL}>{label}</dt>
            <dd className={ROW_VALUE}>
              {formatGrams(value)}
              {label === 'Fermento' && (
                <span className="ml-1.5 font-normal text-crust-brown/60">
                  ({formatPercent((value! / totalFlourG) * 100)})
                </span>
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}

function TimelineList({ timeline, schedule }: { timeline: TimelineStep[]; schedule?: Schedule | null }) {
  return (
    <div className="relative">
      <div className="absolute bottom-1 left-4 top-1 w-px bg-crust-brown/25" aria-hidden="true" />
      <ol className="relative flex flex-col gap-5">
        {timeline.map((step, index) => {
          const scheduledAt = schedule?.steps[index]?.at;
          return (
            <li key={`${step.label}-${step.offsetHours}`} className="relative flex gap-4">
              <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-crust-brown/40 bg-flour-dust text-san-marzano">
                <TimelineIcon label={step.label} className="h-4 w-4" />
              </div>
              <div className="flex-1 pt-1 text-sm">
                <p>
                  <span className="font-data tabular-nums text-crust-brown/70">
                    {scheduledAt ? formatScheduledAt(scheduledAt) : formatHoursMinutes(step.offsetHours)}
                  </span>{' '}
                  — {step.label}
                  {step.durationHours !== undefined && (
                    <span className="text-crust-brown/60"> (dura {formatHoursMinutes(step.durationHours)})</span>
                  )}
                </p>
                {scheduledAt && (
                  <p className="mt-0.5 text-xs text-crust-brown/50">
                    {formatHoursMinutes(step.offsetHours)} desde o início
                  </p>
                )}
                {step.note && <p className="mt-0.5 text-xs text-crust-brown/70">{step.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.2.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.2 0-.3 0-.4 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.4.6.2 1 .4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.5-.6 1.6-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

export function RecipeTicket({ output, schedule }: RecipeTicketProps) {
  const { biga, poolish, naturalStarter } = output.preferments;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(output, schedule))}`;
  // Arredondado separadamente do timeline "cru" usado na curva ilustrativa —
  // ver comentário em roundTimelineForDisplay.
  const displayTimeline = roundTimelineForDisplay(output.timeline);

  return (
    <section
      aria-label="Receita calculada"
      className="rounded-2xl bg-flour-dust p-6 font-sans text-char-black shadow-2xl shadow-black/40 sm:p-8"
    >
      <h2 className="font-display text-2xl text-san-marzano">Comanda</h2>
      <p className="mt-1 font-data text-sm text-crust-brown">
        Peso total da massa: <span className="font-semibold text-char-black">{formatGrams(output.totalDoughWeightG)}</span>
      </p>
      {schedule && (
        <p className="mt-1 font-data text-sm text-crust-brown">
          Começar em:{' '}
          <span className="font-semibold text-char-black">{formatScheduledAt(schedule.startAt)}</span>
        </p>
      )}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-basil px-4 py-2 text-sm font-semibold text-flour-dust transition-opacity hover:opacity-90"
      >
        <WhatsAppIcon className="h-4 w-4" />
        Enviar pro WhatsApp
      </a>

      <FermentationCurve timeline={output.timeline} />

      <h3 className={SECTION_HEADING}>Totais da receita</h3>
      <DoughComponentTable component={output.totals} totalFlourG={output.totals.flourG} />

      {biga && (
        <>
          <h3 className={SECTION_HEADING}>
            Biga <span className="normal-case text-crust-brown/60">— {formatHydration(biga)} hidratação</span>
          </h3>
          <DoughComponentTable component={biga} totalFlourG={output.totals.flourG} />
        </>
      )}

      {poolish && (
        <>
          <h3 className={SECTION_HEADING}>
            Poolish{' '}
            <span className="normal-case text-crust-brown/60">— {formatHydration(poolish)} hidratação</span>
          </h3>
          <DoughComponentTable component={poolish} totalFlourG={output.totals.flourG} />
        </>
      )}

      {naturalStarter && (
        <>
          <h3 className={SECTION_HEADING}>Fermento natural (starter)</h3>
          <dl>
            <div className={ROW}>
              <dt className={ROW_LABEL}>Farinha no starter</dt>
              <dd className={ROW_VALUE}>{formatGrams(naturalStarter.flourG)}</dd>
            </div>
            <div className={ROW}>
              <dt className={ROW_LABEL}>Água no starter</dt>
              <dd className={ROW_VALUE}>{formatGrams(naturalStarter.waterG)}</dd>
            </div>
            <div className={ROW}>
              <dt className={ROW_LABEL}>Starter ativo a adicionar</dt>
              <dd className={ROW_VALUE}>{formatGrams(naturalStarter.starterG)}</dd>
            </div>
          </dl>
        </>
      )}

      <h3 className={SECTION_HEADING}>Massa final (mix)</h3>
      <DoughComponentTable component={output.finalDough} totalFlourG={output.totals.flourG} />

      <h3 className={SECTION_HEADING}>Cronograma</h3>
      <TimelineList timeline={displayTimeline} schedule={schedule} />

      {output.warnings.length > 0 && (
        <>
          <h3 className={SECTION_HEADING}>Avisos</h3>
          <ul className="flex list-none flex-col gap-2 pl-0">
            {output.warnings.map((warning) => (
              <li
                key={warning}
                role="note"
                className="rounded-r-sm border-l-4 border-semola-gold bg-semola-gold/15 p-3 text-sm text-crust-brown"
              >
                {warning}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
