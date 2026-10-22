export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}

export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat('ar-EG').format(value)} ج.م`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}
