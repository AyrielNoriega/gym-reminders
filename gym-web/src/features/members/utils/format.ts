// "en 2 días", "hoy", "hace 4 días"
export function formatDaysLeft(days: number): string {
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days < 0) return `hace ${-days} día${days === -1 ? "" : "s"}`;
  return `en ${days} días`;
}

// "2026-11-18" -> "18 nov 2026" (sin desfase de zona horaria)
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
