import type { TimelineStep } from '@/lib/calculations/types';
import { buildFermentationCurvePoints } from '@/lib/calculations/fermentationCurve';

export interface FermentationCurveProps {
  timeline: TimelineStep[];
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 120;
const PADDING = 12;

/**
 * Spline Catmull-Rom convertida em curvas de Bézier cúbicas: ao contrário de
 * uma suavização por ponto médio, a curva passa exatamente por cada ponto —
 * importante aqui porque os marcadores de evento (bolear, mix, etc.) são
 * desenhados nas coordenadas originais e precisam cair em cima da linha.
 */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return path;
}

export function FermentationCurve({ timeline }: FermentationCurveProps) {
  const curvePoints = buildFermentationCurvePoints(timeline);
  if (curvePoints.length === 0) return null;

  const maxHours = curvePoints[curvePoints.length - 1].hoursElapsed || 1;
  const heights = curvePoints.map((p) => p.height);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
  const heightRange = maxHeight - minHeight || 1;

  const plotWidth = VIEWBOX_WIDTH - PADDING * 2;
  const plotHeight = VIEWBOX_HEIGHT - PADDING * 2;

  const screenPoints = curvePoints.map((p) => ({
    x: PADDING + (p.hoursElapsed / maxHours) * plotWidth,
    y: PADDING + plotHeight - ((p.height - minHeight) / heightRange) * plotHeight,
    label: p.label,
    hoursElapsed: p.hoursElapsed,
  }));

  const pathD = buildSmoothPath(screenPoints);

  return (
    <figure aria-label="Curva de fermentação" className="my-6">
      <figcaption className="font-display text-base uppercase tracking-wide text-crust-brown">
        Curva de fermentação
      </figcaption>
      <p className="mb-2 text-xs text-crust-brown/60">
        Ilustra como a massa cresce ao longo do cronograma — sem escala física real, o formato é o que
        importa.
      </p>

      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-label="Gráfico ilustrativo da curva de fermentação ao longo do cronograma"
        className="w-full"
      >
        <line
          x1={PADDING}
          y1={VIEWBOX_HEIGHT - PADDING}
          x2={VIEWBOX_WIDTH - PADDING}
          y2={VIEWBOX_HEIGHT - PADDING}
          stroke="var(--crust-brown)"
          strokeOpacity={0.25}
        />
        <path d={pathD} fill="none" stroke="var(--san-marzano)" strokeWidth={2.5} strokeLinecap="round" />
        {screenPoints.map((p) => (
          <circle
            key={`${p.label}-${p.hoursElapsed}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--semola-gold)"
          />
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-crust-brown/70">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded-full bg-san-marzano" />
          Volume da massa (ilustrativo)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-semola-gold" />
          Etapas do cronograma
        </span>
        <span>· eixo horizontal: tempo, início à esquerda</span>
      </div>
    </figure>
  );
}
