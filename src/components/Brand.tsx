export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand" aria-label="DataSkein">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && <span>DataSkein</span>}
    </span>
  );
}
