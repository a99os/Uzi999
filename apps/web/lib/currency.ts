const formatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export function formatSom(value: number | string): string {
  return `${formatter.format(Number(value))} so'm`;
}
