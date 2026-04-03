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
  loadCachedAssets,
  loadCachedPortfolio,
  loadOrders,
  saveCachedAssets,
  saveCachedPortfolio,
  saveOrders,
} from "./lib/storage";
import type {
  PortfolioEntry,
  OrderSide,
  QuoteSnapshot,
  SupportedAsset,
  TargetOrder,
  TriggerAlert,
} from "./types";

function playAlertCue() {
  if (typeof window === "undefined") {
    return;
  }

  try {
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

    if ("vibrate" in navigator) {
      navigator.vibrate([180, 120, 220]);
    }
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

export default function App() {
  const PORTFOLIO_CACHE_TTL_MS = 2 * 60 * 1000;
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string>();
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [orderSide, setOrderSide] = useState<OrderSide>("sell");
  const [selectedAssetAddress, setSelectedAssetAddress] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [orders, setOrders] = useState<TargetOrder[]>(() => loadOrders());
  const [currentQuote, setCurrentQuote] = useState<QuoteSnapshot>();
  const [quoteError, setQuoteError] = useState<string>();
  const [executionMessage, setExecutionMessage] = useState<string>();
  const [widgetOrder, setWidgetOrder] = useState<TargetOrder | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [tonUsdPrice, setTonUsdPrice] = useState<number>(0);
  const [alerts, setAlerts] = useState<TriggerAlert[]>([]);
  const [networkWarning, setNetworkWarning] = useState<string>();
  const [spotlightAlert, setSpotlightAlert] = useState<TriggerAlert | null>(null);

  const connected = Boolean(address);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.contractAddress === selectedAssetAddress),
    [assets, selectedAssetAddress],
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
        }
      });
      if (nextAlerts.length > 0) {
        setExecutionMessage(nextAlerts[0].body);
        setSpotlightAlert(nextAlerts[0]);
        playAlertCue();
        if (typeof window !== "undefined" && "Notification" in window) {
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

    const livePriceUsd =
      Number(selectedAsset.dexPriceUsd || selectedAsset.thirdPartyPriceUsd || 0) || 0;
    const quote = buildSpotQuoteSnapshot(selectedAsset, tonUsdPrice || 0);
    setCurrentQuote(quote);
    setQuoteError(undefined);

    const newOrder: TargetOrder = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      side: orderSide,
      asset: selectedAsset,
      targetPrice: target,
      livePriceUsd: livePriceUsd || undefined,
      quote,
      status: livePriceUsd
        ? deriveStatus(orderSide, livePriceUsd, target)
        : "watching",
      note:
        orderSide === "buy"
          ? `Alert armed: ${getAssetSymbol(selectedAsset)} at or below $${formatNumber(target)}.`
          : `Alert armed: ${getAssetSymbol(selectedAsset)} at or above $${formatNumber(target)}.`,
    };

    startTransition(() => {
      setOrders((current) => [newOrder, ...current]);
    });
    setExecutionMessage(
      `${orderSide === "buy" ? "Buy-below" : "Sell-above"} alert armed for ${getAssetSymbol(selectedAsset)}.`,
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
        <Hero trackedCount={assets.length} activeOrders={heroOrders} />

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
        {alerts.length > 0 ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Alerts</p>
                <h2>Triggered orders</h2>
              </div>
              <span className="section-note">These orders are ready for execution</span>
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
            onSubmit={handleCreateOrder}
          />
        </div>

        <MarketPulse assets={assetsLoading ? [] : pricedAssets} orders={orders} />
        <OrderBoard
          connected={connected}
          orders={orders}
          refreshing={syncingOrders}
          onExecute={(order) => void handleExecute(order)}
          onRemove={handleRemoveOrder}
        />
        {widgetOrder ? (
          <SwapWidgetModal
            open={Boolean(widgetOrder)}
            asset={widgetOrder.asset}
            side={widgetOrder.side}
            tonConnectUI={tonConnectUI}
            onClose={() => setWidgetOrder(null)}
          />
        ) : null}

        <section className="panel footer-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Contest Notes</p>
              <h2>What this MVP already demonstrates</h2>
            </div>
          </div>
          <div className="notes-grid">
            <div>
              <strong>Trader-first UX</strong>
              <p>
                This is intentionally framed as a trading alert assistant, not
                a generic wallet clone.
              </p>
            </div>
            <div>
              <strong>Safe promise</strong>
              <p>
                Alerts are monitored off-chain and the user still signs the
                final swap in wallet.
              </p>
            </div>
            <div>
              <strong>Stretch-ready</strong>
              <p>
                The same shell can later add Privy, alerts, or Rust-powered
                signal logic without redesigning the product.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
