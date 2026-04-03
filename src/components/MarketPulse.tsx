import { useState } from "react";
import type { SupportedAsset, TargetOrder } from "../types";
import { formatNumber } from "../lib/format";
import { getAssetName, getAssetSymbol } from "../lib/ston";

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
          return (
            <article className="watch-card" key={asset.contractAddress}>
              {asset.meta?.imageUrl ? (
                <img
                  className="watch-icon"
                  src={asset.meta.imageUrl}
                  alt={`${getAssetSymbol(asset)} icon`}
                />
              ) : (
                <div className="watch-symbol">{getAssetSymbol(asset)}</div>
              )}
              <div>
                <strong>{getAssetName(asset)}</strong>
                <p>
                  {livePrice
                    ? `$${formatNumber(livePrice)} per token`
                    : "No live USD quote"}
                </p>
              </div>
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
                        setArmedLabel(`Alarm set for ${getAssetSymbol(asset)}`);
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
                        setArmedLabel(`Alarm set for ${getAssetSymbol(asset)}`);
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
                      setArmedLabel(`Custom alarm set for ${getAssetSymbol(asset)}`);
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
                      setArmedLabel(`Custom alarm set for ${getAssetSymbol(asset)}`);
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
