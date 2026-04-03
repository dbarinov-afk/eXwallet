import type {
  AlertPreferences,
  PortfolioEntry,
  SupportedAsset,
  TargetOrder,
  TriggerAlert,
} from "../types";

const STORAGE_KEY = "exwallet.target-orders";
const ASSET_CACHE_KEY = "exwallet.cached-assets";
const PORTFOLIO_CACHE_PREFIX = "exwallet.cached-portfolio";
const ALERT_SETTINGS_KEY = "exwallet.alert-settings";
const ALERT_HISTORY_KEY = "exwallet.alert-history";

const DEFAULT_ALERT_SETTINGS: AlertPreferences = {
  browser: true,
  sound: true,
  vibration: true,
  spotlight: true,
};

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

function portfolioCacheKey(address: string) {
  return `${PORTFOLIO_CACHE_PREFIX}:${address}`;
}

export function loadCachedPortfolio(address: string): {
  entries: PortfolioEntry[];
  savedAt?: number;
} {
  if (typeof window === "undefined") {
    return { entries: [] };
  }

  try {
    const raw = window.localStorage.getItem(portfolioCacheKey(address));
    if (!raw) {
      return { entries: [] };
    }

    const parsed = JSON.parse(raw) as { entries?: PortfolioEntry[]; savedAt?: number } | PortfolioEntry[];
    if (Array.isArray(parsed)) {
      return { entries: parsed };
    }

    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      savedAt: parsed.savedAt,
    };
  } catch {
    return { entries: [] };
  }
}

export function saveCachedPortfolio(address: string, entries: PortfolioEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    portfolioCacheKey(address),
    JSON.stringify({
      savedAt: Date.now(),
      entries,
    }),
  );
}

export function loadAlertSettings(): AlertPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_ALERT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(ALERT_SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_ALERT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<AlertPreferences>;
    return {
      browser: parsed.browser ?? DEFAULT_ALERT_SETTINGS.browser,
      sound: parsed.sound ?? DEFAULT_ALERT_SETTINGS.sound,
      vibration: parsed.vibration ?? DEFAULT_ALERT_SETTINGS.vibration,
      spotlight: parsed.spotlight ?? DEFAULT_ALERT_SETTINGS.spotlight,
    };
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

export function saveAlertSettings(settings: AlertPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadAlertHistory(): TriggerAlert[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ALERT_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as TriggerAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlertHistory(alerts: TriggerAlert[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(alerts.slice(0, 12)));
}
