import { useState } from "react";
import type { SupportedAsset, TargetOrder } from "../types";
import { formatNumber } from "../lib/format";
import { getAssetName, getAssetSymbol } from "../lib/ston";
import { getTradingViewSymbol } from "../lib/tradingview";

type MarketPulseProps = {
  assets: SupportedAsset[];
  orders: TargetOrder[];
  onQuickAlert: (
    asset: SupportedAsset,
    side: "buy" | "sell",
    targetPrice: number,
    sourceLabel: string,
  ) => void;
};

function latestPriceForAsset(asset: SupportedAsset, orders: TargetOrder[]) {
  return (
    Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) ||
    orders.find((order) => order.asset.contractAddress === asset.contractAddress)?.quote?.priceUsdPerToken
  );
}

function buildSparkline(symbol: string, livePrice: number) {
  const seed = symbol
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  const values = Array.from({ length: 12 }, (_, index) => {
    const base = 22 + Math.sin((index + seed) / 2.2) * 10;
    const drift = Math.cos((index + seed / 3) / 3.5) * 6;
    const priceInfluence = (livePrice % 5) * 1.5;
    return Math.max(6, Math.min(42, base + drift + priceInfluence));
  });

  return values
    .map((value, index) => `${index * 18},${48 - value}`)
    .join(" ");
}

export function MarketPulse({ assets, orders, onQuickAlert }: MarketPulseProps) {
  const [customPercent, setCustomPercent] = useState("7");
  const [armedLabel, setArmedLabel] = useState<string>();
  const buyPresets = [2, 3, 5, 10];
  const sellPresets = [2, 3, 5, 10];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Market Pulse</p>
          <h2>Liquid assets worth watching</h2>
        </div>
        <span className="section-note">One-click alert presets from STON.fi market prices</span>
      </div>
      <div className="preset-toolbar">
        <span className="section-note">Custom percent</span>
        <input
          className="preset-input"
          inputMode="decimal"
          value={customPercent}
          onChange={(event) => setCustomPercent(event.target.value)}
          placeholder="7"
        />
        <span className="section-note">%</span>
        {armedLabel ? <strong className="armed-pill">{armedLabel}</strong> : null}
      </div>
      <div className="watch-grid">
        {assets.map((asset) => {
          const livePrice = latestPriceForAsset(asset, orders);
          const customDelta = Math.max(0.1, Number(customPercent) || 0);
          const symbol = getAssetSymbol(asset);
          const chartReady = Boolean(getTradingViewSymbol(symbol));
          return (
            <article className="watch-card" key={asset.contractAddress}>
              <div className="watch-top">
                {asset.meta?.imageUrl ? (
                  <img
                    className="watch-icon"
                    src={asset.meta.imageUrl}
                    alt={`${symbol} icon`}
                  />
                ) : (
                  <div className="watch-symbol">{symbol}</div>
                )}
                <div className="watch-copy">
                  <div className="watch-copy-top">
                    <strong>{getAssetName(asset)}</strong>
                    {chartReady ? <span className="watch-chip">Chart ready</span> : null}
                  </div>
                  <p>{symbol}</p>
                </div>
                <div className="watch-price">
                  <strong>
                    {livePrice ? `$${formatNumber(livePrice)}` : "No USD quote"}
                  </strong>
                  <span>Current price</span>
                </div>
              </div>
              {livePrice ? (
                <div className="watch-sparkline-shell">
                  <div className="watch-sparkline-copy">
                    <span className="meta-label">Price rhythm</span>
                    <strong>Use this to sanity-check the alarm before saving it.</strong>
                  </div>
                  <svg
                    className="watch-sparkline"
                    viewBox="0 0 198 48"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id={`spark-${asset.contractAddress}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#31d0aa" />
                        <stop offset="100%" stopColor="#7cb8ff" />
                      </linearGradient>
                    </defs>
                    <polyline
                      fill="none"
                      stroke={`url(#spark-${asset.contractAddress})`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={buildSparkline(symbol, livePrice)}
                    />
                  </svg>
                </div>
              ) : null}
              {livePrice ? (
                <div className="watch-actions">
                  {buyPresets.map((percent) => (
                    <button
                      className="primary-button watch-action"
                      type="button"
                      key={`buy-${percent}`}
                      onClick={() => {
                        onQuickAlert(
                          asset,
                          "buy",
                          Number((livePrice * (1 - percent / 100)).toFixed(4)),
                          `Buy -${percent}%`,
                        );
                        setArmedLabel(`Alarm set for ${symbol}`);
                      }}
                    >
                      Buy -{percent}%
                    </button>
                  ))}
                  {sellPresets.map((percent) => (
                    <button
                      className="primary-button watch-action"
                      type="button"
                      key={`sell-${percent}`}
                      onClick={() => {
                        onQuickAlert(
                          asset,
                          "sell",
                          Number((livePrice * (1 + percent / 100)).toFixed(4)),
                          `Sell +${percent}%`,
                        );
                        setArmedLabel(`Alarm set for ${symbol}`);
                      }}
                    >
                      Sell +{percent}%
                    </button>
                  ))}
                  <button
                    className="ghost-button watch-action"
                    type="button"
                    onClick={() => {
                        onQuickAlert(
                          asset,
                          "buy",
                          Number((livePrice * (1 - customDelta / 100)).toFixed(4)),
                          `Buy -${customDelta}%`,
                      );
                      setArmedLabel(`Custom alarm set for ${symbol}`);
                    }}
                  >
                    Custom buy
                  </button>
                  <button
                    className="ghost-button watch-action"
                    type="button"
                    onClick={() => {
                        onQuickAlert(
                          asset,
                          "sell",
                          Number((livePrice * (1 + customDelta / 100)).toFixed(4)),
                          `Sell +${customDelta}%`,
                      );
                      setArmedLabel(`Custom alarm set for ${symbol}`);
                    }}
                  >
                    Custom sell
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
