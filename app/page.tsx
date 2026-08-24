'use client';

import { useMemo, useReducer, useState } from 'react';
import { CalculatorForm } from '@/components/CalculatorForm';
import { RecipeTicket } from '@/components/RecipeTicket';
import { calculateRecipe } from '@/lib/calculations/calculateRecipe';
import { buildSchedule } from '@/lib/calculations/schedule';
import { calculatorFormReducer, createInitialState } from '@/lib/form/calculatorFormReducer';

export default function Home() {
  const [state, dispatch] = useReducer(calculatorFormReducer, undefined, createInitialState);
  const [desiredServeAt, setDesiredServeAt] = useState('');
  const output = useMemo(() => calculateRecipe(state), [state]);

  const schedule = useMemo(() => {
    if (!desiredServeAt) return null;
    const date = new Date(desiredServeAt);
    if (Number.isNaN(date.getTime())) return null;
    return buildSchedule(output.timeline, date);
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
            desiredServeAt={desiredServeAt}
            onDesiredServeAtChange={setDesiredServeAt}
          />
        </div>
        <div className="lg:sticky lg:top-8">
          <RecipeTicket output={output} schedule={schedule} />
        </div>
      </div>
    </main>
  );
}
