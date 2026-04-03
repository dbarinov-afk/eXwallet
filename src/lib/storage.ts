import type { PortfolioEntry, SupportedAsset, TargetOrder } from "../types";

const STORAGE_KEY = "exwallet.target-orders";
const ASSET_CACHE_KEY = "exwallet.cached-assets";
const PORTFOLIO_CACHE_KEY = "exwallet.cached-portfolio";

export function loadOrders(): TargetOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as TargetOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: TargetOrder[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function loadCachedAssets(): SupportedAsset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ASSET_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SupportedAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedAssets(assets: SupportedAsset[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ASSET_CACHE_KEY, JSON.stringify(assets));
}

export function loadCachedPortfolio(): PortfolioEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PORTFOLIO_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PortfolioEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedPortfolio(entries: PortfolioEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(entries));
}
