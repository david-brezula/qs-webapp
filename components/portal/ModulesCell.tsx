/**
 * Compact display of module work volume: tied count / connected count.
 * Tied is emphasised (navy), connected muted, so the pair reads as "tied /
 * connected" alongside the column header. Counts are raw module counts, not
 * money.
 */
export function ModulesCell({ tied, connected }: { tied: number; connected: number }) {
  return (
    <div className="whitespace-nowrap text-sm leading-tight">
      <span className="font-semibold text-navy">{tied}</span>
      <span className="text-muted"> / {connected}</span>
    </div>
  );
}
