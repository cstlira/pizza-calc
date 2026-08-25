'use client';

import { useMemo, useReducer, useState } from 'react';
import { CalculatorForm } from '@/components/CalculatorForm';
import { RecipeTicket } from '@/components/RecipeTicket';
import { calculateRecipe } from '@/lib/calculations/calculateRecipe';
import { buildSchedule } from '@/lib/calculations/schedule';
import { roundTimelineForDisplay } from '@/lib/calculations/timelineRounding';
import { calculatorFormReducer, createInitialState } from '@/lib/form/calculatorFormReducer';

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function Home() {
  const [state, dispatch] = useReducer(calculatorFormReducer, undefined, createInitialState);
  const [desiredStartAt, setDesiredStartAt] = useState('');
  const [desiredServeAt, setDesiredServeAt] = useState('');

  // Quando início E servir estão preenchidos e em ordem válida, o tempo de
  // fermentação passa a ser CALCULADO a partir da diferença entre os dois —
  // substitui o valor digitado manualmente em "Tempo de fermentação (h)"
  // (ver CalculatorForm, que desabilita esse campo nesse caso).
  const computedFermentationHours = useMemo(() => {
    const start = parseDateInput(desiredStartAt);
    const serve = parseDateInput(desiredServeAt);
    if (!start || !serve) return null;
    const hours = (serve.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours > 0 ? hours : null;
  }, [desiredStartAt, desiredServeAt]);

  const effectiveInput = useMemo(
    () => (computedFermentationHours === null ? state : { ...state, fermentationHours: computedFermentationHours }),
    [state, computedFermentationHours]
  );

  const output = useMemo(() => calculateRecipe(effectiveInput), [effectiveInput]);

  const schedule = useMemo(() => {
    const serve = parseDateInput(desiredServeAt);
    if (!serve) return null;
    // Arredonda pro múltiplo de 10 minutos antes de ancorar no horário real
    // — sem isso os horários absolutos caíam em minutos "quebrados" (ex:
    // 18:23) e as durações mostradas podiam não bater com a diferença entre
    // os horários exibidos.
    return buildSchedule(roundTimelineForDisplay(output.timeline), serve);
  }, [output.timeline, desiredServeAt]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-3xl text-flour-dust sm:text-4xl">
        Calculadora de <span className="text-san-marzano">Massa de Pizza</span>
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-12">
        <div>
          <CalculatorForm
            state={state}
            dispatch={dispatch}
            desiredStartAt={desiredStartAt}
            onDesiredStartAtChange={setDesiredStartAt}
            desiredServeAt={desiredServeAt}
            onDesiredServeAtChange={setDesiredServeAt}
            computedFermentationHours={computedFermentationHours}
          />
        </div>
        <div className="lg:sticky lg:top-8">
          <RecipeTicket output={output} schedule={schedule} />
        </div>
      </div>
    </main>
  );
}
