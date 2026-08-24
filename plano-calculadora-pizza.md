# Plano: Calculadora de Massa de Pizza (Next.js)

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS. Client-side only, sem persistência, sem backend.

---

## 1. Decisões de arquitetura (ler antes de codar)

1. **Motor de cálculo separado da UI.** Toda a lógica de fórmula vive em `lib/calculations/*.ts` como funções puras (sem `useState`, sem JSX). A UI só chama essas funções e renderiza o resultado. Isso importa porque o risco real do produto não está no layout — está em errar uma fórmula e a pessoa jogar fora uma fornada de massa. Funções puras = testáveis com Vitest sem precisar de DOM.
2. **Estado do formulário em `useReducer`, não em vários `useState`.** Você tem campos condicionais (o método de pré-fermento muda quais campos aparecem; "auto" esconde a escolha manual; "natural" muda o comportamento do fermento). Um reducer com actions tipadas deixa essas transições explícitas e testáveis, em vez de um emaranhado de `if` espalhado em `onChange` handlers.
3. **"Tipo de fermento" e "método de pré-fermento" são eixos independentes.** Decisão de design que estou tomando aqui (documentando o porquê, porque não é óbvio): tecnicamente, biga e poolish são definidos pela estrutura (hidratação do pré-fermento) e podem ser levedados tanto por fermento comercial quanto por fermento natural ("biga naturale" existe e é comum). Então o formulário permite qualquer combinação de `yeastType` × `prefermentMethod`, em vez de travar "Natural" para excluir biga/poolish. Se isso não for o que você quer, é uma troca de uma condicional no reducer.
4. **Cálculo de fermento natural é tratado à parte, com faixas, não fórmula fechada.** Fermento comercial (seco/fresco) usa o modelo tempo/temperatura abaixo. Fermento natural (levain) não tem esse mesmo comportamento cinético documentado publicamente com a mesma precisão — o output pra esse caso é uma faixa (ex: "15–25% de farinha em fermento natural ativo") com aviso na UI de que é mais empírico.

---

## 2. Modelo de domínio (TypeScript)

```typescript
// lib/calculations/types.ts

export type PizzaStyle = 'neapolitan' | 'ny';
export type YeastType = 'natural' | 'dry' | 'fresh';
export type PrefermentMethod = 'direct' | 'biga' | 'poolish' | 'combined' | 'auto';
export type DesiredOutcome = 'lightness' | 'flavor' | 'balanced' | 'simplicity';

export interface CalculatorInput {
  ballWeightG: number;
  numberOfBalls: number;
  pizzaStyle: PizzaStyle;
  hydrationPercent: number;   // 60-80, faixa validada na UI
  saltPercent: number;        // presets: 2 / 2.5 / 3
  ambientTempC: number;
  fermentationHours: number;
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
  totals: DoughComponent;                 // farinha/água/sal/óleo/açúcar consolidados
  preferments: {
    biga?: DoughComponent;
    poolish?: DoughComponent;
    naturalStarter?: { flourG: number; waterG: number; starterG: number };
  };
  finalDough: DoughComponent;              // o que entra na mistura final
  timeline: TimelineStep[];
  warnings: string[];                      // ex: hidratação fora do padrão do estilo
}

export interface TimelineStep {
  label: string;
  offsetHours: number;   // relativo ao início do processo
  durationHours?: number;
  note?: string;
}
```

---

## 3. Fórmulas do motor de cálculo

### 3.1 Peso total e split de padeiro (baker's percentage)

```
totalDoughWeightG = ballWeightG × numberOfBalls

totalPercent = 100 + hydrationPercent + saltPercent + oilPercent + sugarPercent
flourG = totalDoughWeightG / (totalPercent / 100)
waterG = flourG × hydrationPercent / 100
saltG  = flourG × saltPercent / 100
oilG   = flourG × oilPercent / 100
sugarG = flourG × sugarPercent / 100
```

`oilPercent`/`sugarPercent` **não são inputs do usuário** — são derivados do `pizzaStyle`:
- `neapolitan`: oil = 0%, sugar = 0% (disciplinare tradicional não permite)
- `ny`: oil ≈ 2.5%, sugar ≈ 1.5% (defaults; deixe como constante ajustável em `styleDefaults.ts`, não hardcoded no meio da função)

### 3.2 Fermento comercial (seco/fresco) — modelo tempo/temperatura

Referência empírica validada: **0.1% de fermento instantâneo para 24h a 22°C** (padrão usado por calculadoras de pizza especializadas).

```
yeastPercentInstant = 0.1 × (24 / fermentationHours) × 3^((ambientTempC - 22) / 9)
```

A constante `3^(Δ/9)` vem da regra de Hamelman (atividade do fermento triplica a cada 9°C). Conversão pro tipo escolhido:

```
instant → seco (ativo):  × 1.25
instant → fresco:        × 3.0
```

**Aviso obrigatório de calibração:** esse modelo é uma aproximação inverso-linear no tempo, e ela **subestima** a necessidade de fermento em janelas curtas (<10h) por causa da fase de lag da levedura (tempo pra colônia atingir massa crítica antes de acelerar a produção de CO2). Não tente consertar isso com uma constante mágica — implemente como uma correção por faixa:

```typescript
// lib/calculations/yeastModel.ts
function shortFermentationCorrection(hours: number): number {
  if (hours < 6) return 1.6;
  if (hours < 10) return 1.3;
  if (hours < 16) return 1.1;
  return 1.0; // fermentação longa: fórmula pura já é razoável
}
```

Esses multiplicadores são pontos de partida grosseiros (calibrados contra a referência de "6-8h → ~0.5%" vs. o que a fórmula pura prevê, ~0.3%) — deixe como constantes nomeadas e explicite no código que são heurísticas, não valores derivados, para quem for mexer depois saber que pode/deve recalibrar com dados reais.

### 3.3 Fermento natural (levain) — faixas, não fórmula

```typescript
// Não modele como % com precisão de casas decimais — dê uma faixa e deixe explícito na UI.
function naturalStarterRange(hours: number, tempC: number): { minPercent: number; maxPercent: number } {
  // heurística: tempo curto ou temp baixa → mais starter; tempo longo/temp alta → menos
  // 15-25% do peso da farinha é o intervalo comum pra starter a 100% de hidratação
  ...
}
```

### 3.4 Split de pré-fermento

| Método | % da farinha total no pré-fermento | Hidratação do pré-fermento | Observação |
|---|---|---|---|
| `direct` | 0% | — | tudo na mistura final |
| `biga` | 50–100% (default 60%) | ~45–50% | fermentação mais fria/lenta, dá estrutura |
| `poolish` | 30–50% (default 40%) | 100% | fermentação mais rápida, dá sabor/douramento |
| `combined` | soma dos dois, dividido 50/50 entre biga e poolish | conforme acima, cada um | o que você já validou manualmente na conversa anterior |

O fermento total calculado em 3.2/3.3 é distribuído proporcionalmente entre os pré-fermentos e a massa final (biga e poolish geralmente levam uma fração pequena do fermento total, o resto — se houver — vai na massa final no rinfresco).

### 3.5 Auto-sugestão de método (`prefermentMethod === 'auto'`)

```
desiredOutcome === 'lightness'   → biga
desiredOutcome === 'flavor'      → poolish
desiredOutcome === 'balanced'    → combined
desiredOutcome === 'simplicity'  → direct
```

Mostre uma frase curta de justificativa ao lado de cada opção no seletor (não uma explicação longa — uma linha):
- Biga: "mais estrutura e força, fermentação previsível"
- Poolish: "mais sabor e douramento, massa mais macia de manusear"
- Combinado: "equilíbrio entre estrutura e sabor"
- Direto: "mais simples e rápido, menos etapas"

### 3.6 Geração da timeline

Função que pega `prefermentMethod`, `fermentationHours` e devolve uma lista ordenada de `TimelineStep` (mix do pré-fermento → mix da massa final → bulk → bolear → maturação → descanso de bancada → abrir/assar). Cada step tem `offsetHours` relativo ao início. Não precisa converter pra horário de relógio no MVP — isso é uma extensão natural de fase 2 (pedir "horário desejado de assar" e calcular pra trás), mas não estava no seu escopo original, então deixo como nice-to-have, não obrigatório.

---

## 4. Presets e sugestões (dados, não lógica)

Coloque em `lib/presets/styleDefaults.ts` como dados estáticos, não espalhado em componentes:

```typescript
export const STYLE_DEFAULTS = {
  neapolitan: {
    ballWeightRange: [220, 280], ballWeightDefault: 250,
    hydrationRange: [58, 65], hydrationDefault: 62,
    oilPercent: 0, sugarPercent: 0,
  },
  ny: {
    ballWeightRange: [260, 300], ballWeightDefault: 280,
    hydrationRange: [60, 70], hydrationDefault: 63,
    oilPercent: 2.5, sugarPercent: 1.5,
  },
} as const;

export const SALT_PRESETS = [2, 2.5, 3];
```

A UI deve deixar o range geral do slider de hidratação em 60–80% (como você pediu), mas mover o marcador de "sugerido" conforme o estilo escolhido, e mostrar um aviso sutil (não bloquear) se o usuário for além do `hydrationRange` do estilo — ex: Neapolitan a 78% não é errado, só foge do tradicional.

---

## 5. Direção visual ("pizza + Itália + moderno")

Segui o processo de design da skill de frontend antes de escrever isto — evitando os três clichês de IA mais comuns (fundo creme + acento terracota; preto + neon único; jornal com hairlines). A proposta é ancorada especificamente no forno a lenha, não em "Itália" genérica:

**Paleta** (defina como CSS custom properties, não hardcoded em classes):
- `--char-black: #1C1815` — fundo principal (interior do forno a lenha, não preto puro)
- `--flour-dust: #F2EDE4` — texto principal sobre o fundo escuro (inverte o clichê cream-as-background)
- `--san-marzano: #B23A2E` — acento primário (vermelho tomate profundo, deliberadamente mais saturado/frio que o terracota-clichê #D97757)
- `--semola-gold: #E8B94A` — acento secundário (farinha de sêmola na pá), usado em destaques e no gráfico de fermentação
- `--basil: #5B7553` — estados positivos/sucesso
- `--crust-brown: #6B4A34` — bordas, divisores, texto secundário

**Tipografia:**
- Display (títulos): uma serifa de alto contraste com caráter editorial italiano — algo como Fraunces ou similar, usada com moderação (só em títulos de seção)
- Corpo/UI: um grotesco limpo (Inter ou Manrope)
- Dados numéricos (gramas, %, horários): fonte monoespaçada/tabular (IBM Plex Mono ou JetBrains Mono) — isso não é estética, é funcional: alinhamento de números numa tabela de receita precisa de largura fixa pra ser escaneável.

**Layout:** não é um wizard multi-step com cards brancos. É uma tela única dividida em duas zonas: entrada (esquerda/topo, estilo "etiqueta de ingrediente") e saída (direita/base, estilo "comanda de pizzaria" — recibo que atualiza ao vivo conforme os inputs mudam). Em mobile, empilha verticalmente com a comanda como bottom sheet.

**Elemento de assinatura:** um SVG de "curva de fermentação" — a massa desenhada como uma curva que sobe (bulk), estabiliza (retard na geladeira) e sobe de novo levemente (descanso de bancada), no lugar de uma lista simples de etapas. Isso é funcional (comunica o cronograma) e é o único elemento "ousado" da página — o resto fica disciplinado.

**Numeração:** os passos da timeline SÃO uma sequência real (mix → fermentar → bolear → assar), então numerá-los (01/02/03) é apropriado aqui — não é decoração, é informação real de ordem.

---

## 6. Estrutura de pastas

```
/app
  page.tsx                    # client component, monta form + reducer + output
/lib
  /calculations
    types.ts
    bakersPercentage.ts
    yeastModel.ts
    naturalStarter.ts
    prefermentSplit.ts
    timeline.ts
    bakersPercentage.test.ts  # Vitest
    yeastModel.test.ts        # valida contra os pontos de referência (24h/22°C/0.1%, 8h/21°C/~0.27%)
  /presets
    styleDefaults.ts
    outcomeSuggestions.ts
/components
  CalculatorForm.tsx
  FieldHydrationSlider.tsx
  FieldPrefermentSelector.tsx
  RecipeTicket.tsx             # painel de saída
  FermentationCurve.tsx        # SVG de assinatura
```

---

## 7. Plano de execução em fases (prompts sequenciais pro Claude Code)

1. **Scaffold**: `create-next-app` com TypeScript + Tailwind, estrutura de pastas acima, sem UI ainda.
2. **Motor de cálculo puro** (`lib/calculations/*`) + testes Vitest validando os pontos de referência desta conversa. Faça isso antes de qualquer componente React — é a parte de maior risco.
3. **Reducer + formulário**: campos condicionais (auto-suggest, natural vs. comercial, biga/poolish/combined), sem estilo ainda.
4. **RecipeTicket**: renderiza `CalculatorOutput` como tabela/comanda.
5. **FermentationCurve**: SVG de assinatura consumindo `TimelineStep[]`.
6. **Passe de design**: aplicar tokens da seção 5, tipografia, responsividade, dark theme.
7. **Casos-limite**: avisos de hidratação fora da faixa do estilo, fermento calculado acima de ~2% (sinal de combinação tempo/temp incomum), natural + tempo muito curto (starter não vai render a tempo).

---

## 8. Pontos em aberto pra você decidir (não resolvi por você)

- **Peso da bola por diâmetro desejado**: não pedimos diâmetro como input, só peso direto com sugestão. Se quiser, dá pra adicionar diâmetro → peso como campo alternativo depois, é um cálculo à parte (fator de carregamento/thickness factor).
- **Óleo e açúcar (estilo NY)**: modelei como derivados automáticos do estilo, não como inputs visíveis — se você quiser controlá-los manualmente, é só expor os dois campos que já existem no motor de cálculo.
- **Horário de assar → cronograma reverso**: mencionado como extensão de fase 2, não incluído no MVP por não estar na sua lista original.
