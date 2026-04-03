import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { Hero } from "./components/Hero";
import { MarketPulse } from "./components/MarketPulse";
import { OrderBoard } from "./components/OrderBoard";
import { OrderComposer } from "./components/OrderComposer";
import { PortfolioPanel } from "./components/PortfolioPanel";
import { SwapWidgetModal } from "./components/SwapWidgetModal";
import { formatNumber, formatRelativeTime, truncateAddress } from "./lib/format";
import {
  getDefaultAssetAddress,
  getAssetSymbol,
  getLiquidAssets,
} from "./lib/ston";
import { getPortfolio } from "./lib/tonapi";
import {
  loadAlertHistory,
  loadAlertSettings,
  loadCachedAssets,
  loadCachedPortfolio,
  loadOrders,
  saveAlertHistory,
  saveAlertSettings,
  saveCachedAssets,
  saveCachedPortfolio,
  saveOrders,
} from "./lib/storage";
import type {
  AlertPreferences,
  PortfolioEntry,
  OrderSide,
  QuoteSnapshot,
  SupportedAsset,
  TargetOrder,
  TriggerAlert,
} from "./types";

function playAlertCue(settings: AlertPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (settings.vibration && "vibrate" in navigator) {
      navigator.vibrate([180, 120, 220]);
    }

    if (!settings.sound) {
      return;
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const context = new AudioContextCtor();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(740, now);
    oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.24);
    oscillator.frequency.exponentialRampToValueAtTime(680, now + 0.48);
    oscillator.frequency.exponentialRampToValueAtTime(1040, now + 0.82);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + 0.9);

    oscillator.onended = () => {
      void context.close();
    };
  } catch (error) {
    console.error("Failed to play alert cue", error);
  }
}

function deriveStatus(side: OrderSide, livePrice: number, targetPrice: number) {
  const isTriggered = side === "buy" ? livePrice <= targetPrice : livePrice >= targetPrice;
  if (isTriggered) {
    return "triggered" as const;
  }

  const near =
    side === "buy"
      ? livePrice <= targetPrice * 1.03
      : livePrice >= targetPrice * 0.97;
  if (near) {
    return "near" as const;
  }

  return "watching" as const;
}

function buildSpotQuoteSnapshot(asset: SupportedAsset, tonUsdPrice: number): QuoteSnapshot | undefined {
  const livePriceUsd =
    Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) || 0;
  if (!livePriceUsd) {
    return undefined;
  }

  return {
    createdAt: new Date().toISOString(),
    priceTonPerToken: tonUsdPrice > 0 ? livePriceUsd / tonUsdPrice : 0,
    priceUsdPerToken: livePriceUsd,
  };
}

function createAlertOrder(params: {
  asset: SupportedAsset;
  side: OrderSide;
  targetPrice: number;
  tonUsdPrice: number;
}) {
  const { asset, side, targetPrice, tonUsdPrice } = params;
  const livePriceUsd = Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) || 0;
  const quote = buildSpotQuoteSnapshot(asset, tonUsdPrice || 0);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    side,
    asset,
    targetPrice,
    livePriceUsd: livePriceUsd || undefined,
    quote,
    status: livePriceUsd ? deriveStatus(side, livePriceUsd, targetPrice) : "watching",
    note:
      side === "buy"
        ? `Alert armed: ${getAssetSymbol(asset)} at or below $${formatNumber(targetPrice)}.`
        : `Alert armed: ${getAssetSymbol(asset)} at or above $${formatNumber(targetPrice)}.`,
  } satisfies TargetOrder;
}

export default function App() {
  const PORTFOLIO_CACHE_TTL_MS = 2 * 60 * 1000;
  const [activeView, setActiveView] = useState<"home" | "alerts" | "swap" | "settings">("home");
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string>();
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [orderSide, setOrderSide] = useState<OrderSide>("sell");
  const [selectedAssetAddress, setSelectedAssetAddress] = useState("");
  const [swapSide] = useState<OrderSide>("buy");
  const [swapAssetAddress, setSwapAssetAddress] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [orders, setOrders] = useState<TargetOrder[]>(() => loadOrders());
  const [currentQuote, setCurrentQuote] = useState<QuoteSnapshot>();
  const [quoteError, setQuoteError] = useState<string>();
  const [alarmSuccessMessage, setAlarmSuccessMessage] = useState<string>();
  const [executionMessage, setExecutionMessage] = useState<string>();
  const [widgetOrder, setWidgetOrder] = useState<TargetOrder | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [tonUsdPrice, setTonUsdPrice] = useState<number>(0);
  const [alerts, setAlerts] = useState<TriggerAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<TriggerAlert[]>(() => loadAlertHistory());
  const [alertSettings, setAlertSettings] = useState<AlertPreferences>(() => loadAlertSettings());
  const [networkWarning, setNetworkWarning] = useState<string>();
  const [spotlightAlert, setSpotlightAlert] = useState<TriggerAlert | null>(null);

  const connected = Boolean(address);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.contractAddress === selectedAssetAddress),
    [assets, selectedAssetAddress],
  );
  const selectedSwapAsset = useMemo(
    () => assets.find((asset) => asset.contractAddress === swapAssetAddress),
    [assets, swapAssetAddress],
  );
  const liveSpotPriceUsd = useMemo(
    () =>
      selectedAsset
        ? Number(selectedAsset.dexPriceUsd || selectedAsset.thirdPartyPriceUsd || 0) || undefined
        : undefined,
    [selectedAsset],
  );
  const pricedAssets = useMemo(
    () =>
      assets.filter(
        (asset) => Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) > 0,
      ),
    [assets],
  );
  const targetWarning = useMemo(() => {
    const target = Number(targetPrice);
    if (!liveSpotPriceUsd || !Number.isFinite(target) || target <= 0) {
      return undefined;
    }

    const tolerance = liveSpotPriceUsd * 0.001;

    if (orderSide === "sell" && target < liveSpotPriceUsd - tolerance) {
      return "Warning: this sell target is below the current market price, so it may trigger immediately.";
    }

    if (orderSide === "buy" && target > liveSpotPriceUsd + tolerance) {
      return "Warning: this buy target is above the current market price, so it may trigger immediately.";
    }

    return undefined;
  }, [liveSpotPriceUsd, orderSide, targetPrice]);

  useEffect(() => {
    let mounted = true;

    const loadAssets = async () => {
      setAssetsLoading(true);
      try {
        const result = await getLiquidAssets();
        if (!mounted) {
          return;
        }

        setAssets(result.jettons);
        saveCachedAssets(result.jettons);
        setNetworkWarning(undefined);
        const tonUsd =
          Number(result.ton?.dexPriceUsd || result.ton?.thirdPartyPriceUsd || 0) || 0;
        if (tonUsd > 0) {
          setTonUsdPrice(tonUsd);
        }
        const defaultAddress = getDefaultAssetAddress(
          result.jettons.filter(
            (asset) => Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) > 0,
          ),
        );
        if (defaultAddress) {
          setSelectedAssetAddress(defaultAddress);
          setSwapAssetAddress(defaultAddress);
        } else {
          setQuoteError("No supported tokens with live USD pricing are available right now.");
        }
      } catch (error) {
        console.error("Failed to load STON.fi assets", error);
        const cachedAssets = loadCachedAssets();
        if (cachedAssets.length > 0) {
          setAssets(cachedAssets);
          const defaultAddress = getDefaultAssetAddress(cachedAssets);
          if (defaultAddress) {
            setSelectedAssetAddress(defaultAddress);
            setSwapAssetAddress(defaultAddress);
          }
          setNetworkWarning("STON.fi is unreachable right now. Showing cached market data.");
        } else {
          setNetworkWarning("STON.fi is unreachable right now. Check your network or DNS settings.");
        }
      } finally {
        if (mounted) {
          setAssetsLoading(false);
        }
      }
    };

    loadAssets();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveAlertSettings(alertSettings);
  }, [alertSettings]);

  useEffect(() => {
    saveAlertHistory(alertHistory);
  }, [alertHistory]);

  useEffect(() => {
    if (!connected) {
      setPortfolio([]);
      setPortfolioError(undefined);
      return;
    }

    void refreshPortfolio(address);
  }, [address, connected]);

  useEffect(() => {
    setCurrentQuote(selectedAsset ? buildSpotQuoteSnapshot(selectedAsset, tonUsdPrice) : undefined);
    setQuoteError(undefined);
    if (liveSpotPriceUsd && !targetPrice) {
      setTargetPrice(liveSpotPriceUsd.toFixed(4));
    }
  }, [selectedAsset, orderSide, liveSpotPriceUsd, targetPrice, tonUsdPrice]);

  useEffect(() => {
    if (orders.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshAllOrders();
    }, 20_000);

    return () => window.clearInterval(timer);
  }, [orders]);

  async function refreshPortfolio(walletAddress = address, force = false) {
    if (!walletAddress) {
      return;
    }

    const cachedPortfolio = loadCachedPortfolio(walletAddress);
    const cacheIsFresh =
      !force &&
      cachedPortfolio.savedAt &&
      Date.now() - cachedPortfolio.savedAt < PORTFOLIO_CACHE_TTL_MS;

    if (cachedPortfolio.entries.length > 0) {
      setPortfolio(cachedPortfolio.entries);
      if (cacheIsFresh) {
        setPortfolioError(undefined);
        setPortfolioLoading(false);
        return;
      }
    }

    setPortfolioLoading(true);
    setPortfolioError(undefined);

    try {
      const entries = await getPortfolio(walletAddress);
      const priceByAddress = new Map(
        assets.map((asset) => [
          asset.contractAddress,
          Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) || undefined,
        ]),
      );
      const priceBySymbol = new Map(
        assets.map((asset) => [
          getAssetSymbol(asset),
          Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) || undefined,
        ]),
      );
      if (tonUsdPrice > 0) {
        priceBySymbol.set("TON", tonUsdPrice);
      }
      const enriched = entries.map((entry) => {
        const fallbackPrice = priceByAddress.get(entry.address || "") || priceBySymbol.get(entry.symbol);
        return {
          ...entry,
          usdValue:
            entry.usdValue ??
            (fallbackPrice ? entry.balance * fallbackPrice : undefined),
        };
      });
      setPortfolio(enriched);
      saveCachedPortfolio(walletAddress, enriched);
      setNetworkWarning(undefined);
      if (enriched.length === 0) {
        setPortfolioError("No balances found for this wallet yet.");
      }
    } catch (error) {
      console.error("Failed to load portfolio", error);
      if (cachedPortfolio.entries.length > 0) {
        setPortfolio(cachedPortfolio.entries);
        setPortfolioError("TonAPI is unreachable. Showing your last cached balances.");
        setNetworkWarning("Some TON services are unreachable right now. Cached data is shown.");
      } else {
        setPortfolio([]);
        setPortfolioError("Could not load balances from TonAPI. Check your network or DNS settings.");
        setNetworkWarning("TON services are unreachable right now. Check your network or DNS settings.");
      }
    } finally {
      setPortfolioLoading(false);
    }
  }

  async function refreshAllOrders() {
    if (orders.length === 0) {
      return;
    }

    setSyncingOrders(true);

    try {
      const market = await getLiquidAssets();
      setAssets(market.jettons);
      saveCachedAssets(market.jettons);
      setNetworkWarning(undefined);
      const nextTonUsd =
        Number(market.ton?.dexPriceUsd || market.ton?.thirdPartyPriceUsd || 0) || tonUsdPrice;
      if (nextTonUsd > 0) {
        setTonUsdPrice(nextTonUsd);
      }
      const assetMap = new Map(
        market.jettons.map((asset) => [asset.contractAddress, asset]),
      );

      const nextAlerts: TriggerAlert[] = [];
      const nextOrders = await Promise.all(
        orders.map(async (order) => {
          if (order.status === "executed") {
            return order;
          }

          try {
            const liveAsset = assetMap.get(order.asset.contractAddress) || order.asset;
            const livePriceUsd =
              Number(liveAsset.dexPriceUsd || liveAsset.thirdPartyPriceUsd || 0) || order.livePriceUsd || 0;
            const nextStatus = livePriceUsd
              ? deriveStatus(order.side, livePriceUsd, order.targetPrice)
              : order.status;
            if (nextStatus === "triggered" && order.status !== "triggered") {
              nextAlerts.push({
                id: crypto.randomUUID(),
                orderId: order.id,
                title: `${order.side === "buy" ? "Buy" : "Sell"} trigger hit`,
                body: `${getAssetSymbol(liveAsset)} is now $${formatNumber(livePriceUsd)} against your target of $${formatNumber(order.targetPrice)}.`,
                createdAt: new Date().toISOString(),
              });
            }
            return {
              ...order,
              asset: liveAsset,
              livePriceUsd,
              quote: livePriceUsd
                ? {
                    createdAt: new Date().toISOString(),
                    priceTonPerToken: nextTonUsd > 0 ? livePriceUsd / nextTonUsd : 0,
                    priceUsdPerToken: livePriceUsd,
                  }
                : order.quote,
              simulation: nextStatus === "triggered" ? order.simulation : undefined,
              status: nextStatus,
              note:
                nextStatus === "triggered"
                  ? `${order.side === "buy" ? "Buy" : "Sell"} trigger hit. ${getAssetSymbol(liveAsset)} is now at $${formatNumber(livePriceUsd)}.`
                  : order.side === "buy"
                    ? `Watching ${getAssetSymbol(liveAsset)} until it falls to $${formatNumber(order.targetPrice)}.`
                    : `Watching ${getAssetSymbol(liveAsset)} until it rises to $${formatNumber(order.targetPrice)}.`,
            };
          } catch (error) {
            console.error("Failed to refresh order", error);
            return {
              ...order,
              note: "Price refresh failed. The last known quote is kept locally.",
            };
          }
        }),
      );

      startTransition(() => {
        setOrders(nextOrders);
        if (nextAlerts.length > 0) {
          setAlerts((current) => [...nextAlerts, ...current].slice(0, 6));
          setAlertHistory((current) => [...nextAlerts, ...current].slice(0, 12));
        }
      });
      if (nextAlerts.length > 0) {
        setExecutionMessage(nextAlerts[0].body);
        if (alertSettings.spotlight) {
          setSpotlightAlert(nextAlerts[0]);
        }
        playAlertCue(alertSettings);
        if (alertSettings.browser && typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            nextAlerts.forEach((alert) => new Notification(alert.title, { body: alert.body }));
          } else if (Notification.permission === "default") {
            void Notification.requestPermission();
          }
        }
      }
    } finally {
      setSyncingOrders(false);
    }
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAsset) {
      setQuoteError("Choose a supported token before saving an order.");
      return;
    }

    const target = Number(targetPrice);

    if (!Number.isFinite(target) || target <= 0) {
      setQuoteError("Target price must be greater than zero.");
      return;
    }

    const quote = buildSpotQuoteSnapshot(selectedAsset, tonUsdPrice || 0);
    setCurrentQuote(quote);
    setQuoteError(undefined);

    const newOrder = createAlertOrder({
      asset: selectedAsset,
      side: orderSide,
      targetPrice: target,
      tonUsdPrice,
    });

    startTransition(() => {
      setOrders((current) => [newOrder, ...current]);
    });
    setAlarmSuccessMessage(`${getAssetSymbol(selectedAsset)} alarm set.`);
    setExecutionMessage(
      `${orderSide === "buy" ? "Buy-below" : "Sell-above"} alert armed for ${getAssetSymbol(selectedAsset)}.`,
    );
  }

  function handleQuickAlert(
    asset: SupportedAsset,
    side: OrderSide,
    target: number,
    sourceLabel: string,
  ) {
    const newOrder = createAlertOrder({
      asset,
      side,
      targetPrice: target,
      tonUsdPrice,
    });

    setSelectedAssetAddress(asset.contractAddress);
    setOrderSide(side);
    setTargetPrice(target.toFixed(4));
    setCurrentQuote(buildSpotQuoteSnapshot(asset, tonUsdPrice));
    setQuoteError(undefined);
    setAlarmSuccessMessage(`${getAssetSymbol(asset)} alarm set.`);
    startTransition(() => {
      setOrders((current) => [newOrder, ...current]);
    });
    setExecutionMessage(
      `${sourceLabel} alert armed for ${getAssetSymbol(asset)} at $${formatNumber(target)}.`,
    );
  }

  async function handleExecute(order: TargetOrder) {
    if (!address) {
      setExecutionMessage("Connect Tonkeeper before executing an armed order.");
      return;
    }

    try {
      setWidgetOrder(order);
      setExecutionMessage(
        `Opening STON execution for ${getAssetSymbol(order.asset)}…`,
      );
    } catch (error) {
      console.error("Execution failed", error);
      setExecutionMessage("Could not open STON execution. Please try again.");
    }
  }

  function handleOpenSwap(asset: SupportedAsset, side: OrderSide) {
    setWidgetOrder(
      createAlertOrder({
        asset,
        side,
        targetPrice:
          Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) || 0,
        tonUsdPrice,
      }),
    );
    setExecutionMessage(`Opening ${side === "buy" ? "buy" : "sell"} swap for ${getAssetSymbol(asset)}…`);
  }

  function handleRemoveOrder(orderId: string) {
    setOrders((current) => current.filter((order) => order.id !== orderId));
    setAlerts((current) => current.filter((alert) => alert.orderId !== orderId));
    if (widgetOrder?.id === orderId) {
      setWidgetOrder(null);
    }
  }

  function dismissAlert(alertId: string) {
    setAlerts((current) => current.filter((alert) => alert.id !== alertId));
    setSpotlightAlert((current) => (current?.id === alertId ? null : current));
  }

  function clearNotifications() {
    setAlerts([]);
    setAlertHistory([]);
    setSpotlightAlert(null);
    setExecutionMessage("Notifications cleared.");
  }

  function updateAlertSetting<K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) {
    setAlertSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function enableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setExecutionMessage("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      updateAlertSetting("browser", true);
      setExecutionMessage("Browser alerts enabled.");
    } else {
      updateAlertSetting("browser", false);
      setExecutionMessage("Browser alerts were not allowed.");
    }
  }

  function runTestAlert() {
    const alert: TriggerAlert = {
      id: crypto.randomUUID(),
      orderId: "demo-alert",
      title: "Test alert",
      body: "eXwallet alert systems are armed and ready.",
      createdAt: new Date().toISOString(),
    };

    setAlerts((current) => [alert, ...current].slice(0, 6));
    setAlertHistory((current) => [alert, ...current].slice(0, 12));
    if (alertSettings.spotlight) {
      setSpotlightAlert(alert);
    }
    playAlertCue(alertSettings);
    if (alertSettings.browser && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        void new Notification(alert.title, { body: alert.body });
      }
    }
    setExecutionMessage(alert.body);
  }

  const heroOrders = orders.filter((order) => order.status !== "executed").length;
  const triggeredCount = orders.filter((order) => order.status === "triggered").length;
  const trackedTokens = pricedAssets.length;
  const spotlightOrder = spotlightAlert
    ? orders.find((order) => order.id === spotlightAlert.orderId)
    : undefined;

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <main className="layout">
        <Hero activeOrders={heroOrders} />

        <section className="meta-bar">
          <div>
            <span className="meta-label">Wallet</span>
            <strong>{connected ? truncateAddress(address) : "Wallet not connected"}</strong>
          </div>
          <div>
            <span className="meta-label">Tracked tokens</span>
            <strong>{trackedTokens}</strong>
          </div>
          <div>
            <span className="meta-label">Triggered alerts</span>
            <strong>{triggeredCount}</strong>
          </div>
          <div>
            <span className="meta-label">TON / USD</span>
            <strong>{tonUsdPrice ? `$${formatNumber(tonUsdPrice)}` : "Loading USD..."}</strong>
          </div>
        </section>

        <section className="view-tabs">
          <button
            className={activeView === "home" ? "tab-active" : "tab-button"}
            type="button"
            onClick={() => setActiveView("home")}
          >
            Home
          </button>
          <button
            className={activeView === "alerts" ? "tab-active" : "tab-button"}
            type="button"
            onClick={() => setActiveView("alerts")}
          >
            Alerts
          </button>
          <button
            className={activeView === "swap" ? "tab-active" : "tab-button"}
            type="button"
            onClick={() => setActiveView("swap")}
          >
            Swap
          </button>
          <button
            className={activeView === "settings" ? "tab-active" : "tab-button"}
            type="button"
            onClick={() => setActiveView("settings")}
          >
            Settings
          </button>
        </section>

        {executionMessage && <div className="banner">{executionMessage}</div>}
        {networkWarning ? <div className="banner">{networkWarning}</div> : null}
        {spotlightAlert && spotlightOrder ? (
          <section className="spotlight-alert">
            <div className="spotlight-copy">
              <p className="section-label">Triggered Alert</p>
              <h2>
                {getAssetSymbol(spotlightOrder.asset)} hit your {spotlightOrder.side === "buy" ? "buy-below" : "sell-above"} level
              </h2>
              <p>{spotlightAlert.body}</p>
            </div>
            <div className="spotlight-actions">
              <button className="primary-button" type="button" onClick={() => void handleExecute(spotlightOrder)}>
                Execute now
              </button>
              <button className="ghost-button" type="button" onClick={() => dismissAlert(spotlightAlert.id)}>
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        {activeView === "home" ? (
          <>
            <div className="dashboard-grid">
              <PortfolioPanel
                connected={connected}
                portfolio={portfolio}
                loading={portfolioLoading}
                error={portfolioError}
                onRefresh={() => void refreshPortfolio(address, true)}
              />
              <OrderComposer
                assets={pricedAssets}
                orderSide={orderSide}
                setOrderSide={setOrderSide}
                selectedAssetAddress={selectedAssetAddress}
                setSelectedAssetAddress={setSelectedAssetAddress}
                targetPrice={targetPrice}
                setTargetPrice={setTargetPrice}
                spotPriceUsd={liveSpotPriceUsd}
                targetWarning={targetWarning}
                currentQuote={currentQuote}
                quoteError={quoteError}
                successMessage={alarmSuccessMessage}
                onOpenAlerts={() => setActiveView("alerts")}
                onSubmit={handleCreateOrder}
              />
            </div>
            <MarketPulse
              assets={assetsLoading ? [] : pricedAssets}
              orders={orders}
              onQuickAlert={handleQuickAlert}
            />
          </>
        ) : null}

        {activeView === "alerts" ? (
          <>
            {alerts.length > 0 ? (
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <p className="section-label">Alerts</p>
                    <h2>Triggered alerts</h2>
                  </div>
                  <span className="section-note">These alerts are ready for execution</span>
                </div>
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <article className="alert-card" key={alert.id}>
                      <div>
                        <strong>{alert.title}</strong>
                        <p>{alert.body}</p>
                        <span className="alert-time">{formatRelativeTime(alert.createdAt)}</span>
                      </div>
                      <div className="alert-actions">
                        {orders.find((order) => order.id === alert.orderId)?.status === "triggered" ? (
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => {
                              const order = orders.find((item) => item.id === alert.orderId);
                              if (order) {
                                void handleExecute(order);
                              }
                            }}
                          >
                            Execute
                          </button>
                        ) : null}
                        <button className="ghost-button" type="button" onClick={() => dismissAlert(alert.id)}>
                          Dismiss
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            <OrderBoard
              connected={connected}
              orders={orders}
              refreshing={syncingOrders}
              onExecute={(order) => void handleExecute(order)}
              onRemove={handleRemoveOrder}
            />
          </>
        ) : null}

        {activeView === "swap" ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Swap</p>
                <h2>Open the STON widget</h2>
              </div>
              <span className="section-note">Direct swap flow without setting an alert</span>
            </div>
            <div className="swap-cta">
              <div className="composer-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!selectedSwapAsset}
                  onClick={() => selectedSwapAsset && handleOpenSwap(selectedSwapAsset, swapSide)}
                >
                  Open STON widget
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeView === "settings" ? (
          <section className="panel footer-panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Settings</p>
                <h2>Notifications and reference links</h2>
              </div>
              <div className="order-actions">
                <button className="ghost-button" type="button" onClick={clearNotifications}>
                  Clear notifications
                </button>
                <button className="primary-button" type="button" onClick={runTestAlert}>
                  Test alert
                </button>
              </div>
            </div>
            <details className="hint-card">
              <summary>Alarm settings</summary>
              <div className="hint-copy">
                <div className="alert-settings-grid">
                  <label className="toggle-card">
                    <div>
                      <strong>Browser alerts</strong>
                      <span>Show native browser notifications when a price is hit.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertSettings.browser}
                      onChange={(event) => updateAlertSetting("browser", event.target.checked)}
                    />
                  </label>
                  <label className="toggle-card">
                    <div>
                      <strong>Sound cue</strong>
                      <span>Play a short alert tone when a trigger fires.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertSettings.sound}
                      onChange={(event) => updateAlertSetting("sound", event.target.checked)}
                    />
                  </label>
                  <label className="toggle-card">
                    <div>
                      <strong>Vibration</strong>
                      <span>Use device vibration when supported.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertSettings.vibration}
                      onChange={(event) => updateAlertSetting("vibration", event.target.checked)}
                    />
                  </label>
                  <label className="toggle-card">
                    <div>
                      <strong>Spotlight mode</strong>
                      <span>Show a full in-app trigger panel that is hard to miss.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertSettings.spotlight}
                      onChange={(event) => updateAlertSetting("spotlight", event.target.checked)}
                    />
                  </label>
                </div>
                <div className="alert-center-actions">
                  <button className="ghost-button" type="button" onClick={() => void enableBrowserAlerts()}>
                    Request browser permission
                  </button>
                  <span className="section-note">
                    Recent triggers are stored locally so the demo still feels alive after refresh.
                  </span>
                </div>
              </div>
            </details>
            {alertHistory.length > 0 ? (
              <div className="alert-history">
                {alertHistory.slice(0, 4).map((alert) => (
                  <div className="alert-history-row" key={alert.id}>
                    <div>
                      <strong>{alert.title}</strong>
                      <span>{alert.body}</span>
                    </div>
                    <small>{formatRelativeTime(alert.createdAt)}</small>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="notes-grid">
              <div>
                <strong>STON.fi</strong>
                <p>Routing, asset data, widget execution, and swap infrastructure.</p>
                <a className="text-link" href="https://docs.ston.fi/" target="_blank" rel="noreferrer">Open docs</a>
              </div>
              <div>
                <strong>TON AppKit</strong>
                <p>Wallet connection, Tonkeeper integration, and TON app UX primitives.</p>
                <a className="text-link" href="https://docs.ton.org/ecosystem/appkit/overview" target="_blank" rel="noreferrer">Open docs</a>
              </div>
              <div>
                <strong>Contest framing</strong>
                <p>This MVP is positioned as a trading alert assistant with user-signed execution.</p>
                <a className="text-link" href="https://docs.privy.io/recipes/use-tier-2#ton" target="_blank" rel="noreferrer">Privy TON recipe</a>
              </div>
            </div>
          </section>
        ) : null}

        {widgetOrder ? (
          <SwapWidgetModal
            open={Boolean(widgetOrder)}
            asset={widgetOrder.asset}
            side={widgetOrder.side}
            tonConnectUI={tonConnectUI}
            onClose={() => setWidgetOrder(null)}
          />
        ) : null}
      </main>
    </div>
  );
}
