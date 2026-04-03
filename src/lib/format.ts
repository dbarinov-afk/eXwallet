export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
    ...options,
  }).format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function formatRelativeTime(dateLike: string) {
  const now = Date.now();
  const then = new Date(dateLike).getTime();
  const delta = Math.round((then - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const absolute = Math.abs(delta);

  if (absolute < 60) {
    return formatter.format(delta, "second");
  }

  if (absolute < 3_600) {
    return formatter.format(Math.round(delta / 60), "minute");
  }

  if (absolute < 86_400) {
    return formatter.format(Math.round(delta / 3_600), "hour");
  }

  return formatter.format(Math.round(delta / 86_400), "day");
}

export function symbolForAsset(symbol?: string, fallback = "TOKEN") {
  return symbol?.toUpperCase() || fallback;
}

export function truncateAddress(address: string) {
  if (address.length < 12) {
    return address;
  }

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function initialsForToken(symbol: string, name?: string) {
  const normalized = symbol?.trim() || name?.trim() || "TK";
  return normalized.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "TK";
}
