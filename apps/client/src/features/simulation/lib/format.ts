export function formatMoney(num: number, digits = 0): string {
  if (!isFinite(num)) return '-';
  const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(digits)}K`;
  return `$${nf.format(num)}`;
}
