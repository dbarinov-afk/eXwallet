import type { SupportedAsset, TargetOrder } from "../types";
import { formatNumber } from "../lib/format";
import { getAssetName, getAssetSymbol } from "../lib/ston";

type MarketPulseProps = {
  assets: SupportedAsset[];
  orders: TargetOrder[];
};

function latestPriceForAsset(asset: SupportedAsset, orders: TargetOrder[]) {
  return (
    Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) ||
    orders.find((order) => order.asset.contractAddress === asset.contractAddress)?.quote?.priceUsdPerToken
  );
}

export function MarketPulse({ assets, orders }: MarketPulseProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Market Pulse</p>
          <h2>Liquid assets worth watching</h2>
        </div>
        <span className="section-note">Pulled from STON.fi liquidity tiers</span>
      </div>
      <div className="watch-grid">
        {assets.map((asset) => {
          const livePrice = latestPriceForAsset(asset, orders);
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
