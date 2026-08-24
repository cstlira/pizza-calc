const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function MixIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} aria-hidden="true">
      <path d="M5 10h14l-1.5 7a2 2 0 0 1-2 1.6H8.5a2 2 0 0 1-2-1.6L5 10Z" />
      <path d="M12 10V4" />
      <path d="M9.5 6.5 12 4l2.5 2.5" />
    </svg>
  );
}

function RiseIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} aria-hidden="true">
      <path d="M4 18h16" />
      <path d="M6 18c0-4 2.5-7 6-7s6 3 6 7" />
      <path d="M12 8V3" />
      <path d="M9.5 5.5 12 3l2.5 2.5" />
    </svg>
  );
}

function DivideIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} aria-hidden="true">
      <circle cx="7" cy="16" r="3" />
      <circle cx="17" cy="16" r="3" />
      <circle cx="12" cy="7" r="3" />
    </svg>
  );
}

function RestIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function BakeIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} aria-hidden="true">
      <path d="M12 3c-1 3-4 4-4 8a4 4 0 0 0 8 0c0-1.5-1-2.5-1-2.5.5 2-1 3-1 3 .5-3-2-4-2-8.5Z" />
    </svg>
  );
}

function SnowflakeIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M4.5 7.5l15 9" />
      <path d="M19.5 7.5l-15 9" />
    </svg>
  );
}

function DotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TimelineIcon({ label, className }: { label: string; className?: string }) {
  if (label.includes('Mix') || label.includes('Sova')) return <MixIcon className={className} />;
  if (label.includes('Maturação') || label.includes('Fermentação')) return <RiseIcon className={className} />;
  if (label.includes('Bolear')) return <DivideIcon className={className} />;
  if (label.includes('geladeira')) return <SnowflakeIcon className={className} />;
  if (label.includes('Descanso')) return <RestIcon className={className} />;
  if (label.includes('assar')) return <BakeIcon className={className} />;
  return <DotIcon className={className} />;
}
