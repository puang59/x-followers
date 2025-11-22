export function parseFollowerCount(raw: string): number {
  const clean = raw.trim().toUpperCase().replace(/,/g, "");

  if (clean.endsWith("K")) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1000);
  }

  if (clean.endsWith("M")) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1_000_000);
  }

  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}
