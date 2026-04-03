import type { FormEvent } from "react";
import type { OrderSide, QuoteSnapshot, SupportedAsset } from "../types";
import { formatNumber, truncateAddress } from "../lib/format";
import { getAssetName, getAssetSymbol } from "../lib/ston";

type ComposerProps = {
  assets: SupportedAsset[];
  orderSide: OrderSide;
  setOrderSide: (value: OrderSide) => void;
  selectedAssetAddress: string;
  setSelectedAssetAddress: (value: string) => void;
  buyBudgetUsd: string;
  setBuyBudgetUsd: (value: string) => void;
  sellAmount: string;
  setSellAmount: (value: string) => void;
  targetPrice: string;
  setTargetPrice: (value: string) => void;
  tonUsdPrice: number;
  spotPriceUsd?: number;
  targetWarning?: string;
  currentQuote?: QuoteSnapshot;
  quoteError?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function OrderComposer({
  assets,
  orderSide,
  setOrderSide,
  selectedAssetAddress,
  setSelectedAssetAddress,
  buyBudgetUsd,
  setBuyBudgetUsd,
  sellAmount,
  setSellAmount,
  targetPrice,
  setTargetPrice,
  tonUsdPrice,
  spotPriceUsd,
  targetWarning,
  currentQuote,
  quoteError,
  onSubmit,
}: ComposerProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Target Order</p>
          <h2>Arm a monitored trade</h2>
        </div>
        <span className="section-note">Save once, monitor automatically</span>
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <label>
          Order side
          <div className="segmented">
            <button
              className={orderSide === "buy" ? "segment-active" : "segment-button"}
              type="button"
              onClick={() => setOrderSide("buy")}
            >
              Buy low
            </button>
            <button
              className={orderSide === "sell" ? "segment-active" : "segment-button"}
              type="button"
              onClick={() => setOrderSide("sell")}
            >
              Sell high
            </button>
          </div>
        </label>
        <label>
          {orderSide === "buy" ? "Buy token" : "Sell token"}
          <select
            disabled={assets.length === 0}
            value={selectedAssetAddress}
            onChange={(event) => setSelectedAssetAddress(event.target.value)}
          >
            {assets.length === 0 ? (
              <option value="">No tradeable tokens loaded</option>
            ) : (
              assets.map((asset) => (
                <option key={asset.contractAddress} value={asset.contractAddress}>
                  {getAssetSymbol(asset)} · {getAssetName(asset)}
                </option>
              ))
            )}
          </select>
        </label>
        {selectedAssetAddress ? (
          <div className="token-picked">
            <div className="token-picked-symbol">
              {assets.find((asset) => asset.contractAddress === selectedAssetAddress)?.meta?.imageUrl ? (
                <img
                  className="asset-icon"
                  src={assets.find((asset) => asset.contractAddress === selectedAssetAddress)?.meta?.imageUrl}
                  alt={`${assets.find((asset) => asset.contractAddress === selectedAssetAddress)?.meta?.symbol || "token"} icon`}
                />
              ) : (
                <div className="watch-symbol">
                  {assets.find((asset) => asset.contractAddress === selectedAssetAddress)
                    ? getAssetSymbol(
                        assets.find((asset) => asset.contractAddress === selectedAssetAddress)!,
                      )
                    : "TK"}
                </div>
              )}
            </div>
            <div className="token-picked-copy">
              <strong>
                {assets.find((asset) => asset.contractAddress === selectedAssetAddress)
                  ? getAssetSymbol(
                      assets.find((asset) => asset.contractAddress === selectedAssetAddress)!,
                    )
                  : "Token"}
              </strong>
              <span>
                {assets.find((asset) => asset.contractAddress === selectedAssetAddress)
                  ? getAssetName(
                      assets.find((asset) => asset.contractAddress === selectedAssetAddress)!,
                    )
                  : ""}
              </span>
              <small className="asset-address">
                {truncateAddress(selectedAssetAddress)}
              </small>
            </div>
            <div className="token-picked-price">
              <strong>
                {spotPriceUsd ? `$${formatNumber(spotPriceUsd)}` : "No USD quote"}
              </strong>
              <span>Current price</span>
            </div>
          </div>
        ) : null}
        <label>
          {orderSide === "buy" ? "Budget (USD)" : "Amount to sell"}
          {orderSide === "buy" ? (
            <>
              <input
                inputMode="decimal"
                placeholder="10"
                value={buyBudgetUsd}
                onChange={(event) => setBuyBudgetUsd(event.target.value)}
              />
              {tonUsdPrice > 0 && buyBudgetUsd ? (
                <span className="field-hint">
                  Approx. {formatNumber(Number(buyBudgetUsd) / tonUsdPrice)} TON at the
                  current TON/USD rate
                </span>
              ) : null}
            </>
          ) : (
            <input
              inputMode="decimal"
              placeholder="25"
              value={sellAmount}
              onChange={(event) => setSellAmount(event.target.value)}
            />
          )}
        </label>
        <label>
          Target price (USD / token)
          <input
            inputMode="decimal"
            placeholder="0.12"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
          />
          {spotPriceUsd ? (
            <span className="field-hint">
              Current spot reference: ${formatNumber(spotPriceUsd)}
            </span>
          ) : null}
          {targetWarning ? <span className="field-warning">{targetWarning}</span> : null}
        </label>
        <div className="composer-actions">
          <button className="primary-button" type="submit" disabled={assets.length === 0}>
            Arm target order
          </button>
        </div>
      </form>
      <div className="quote-card">
        {quoteError ? (
          <p>{quoteError}</p>
        ) : currentQuote ? (
          <>
            <div className="quote-main">
              <strong>${formatNumber(currentQuote.priceUsdPerToken)}</strong>
              <span>Current market reference for this token</span>
            </div>
            <div className="quote-meta">
              <div>
                <span>Current price</span>
                <strong>${formatNumber(currentQuote.priceUsdPerToken)}</strong>
              </div>
              <div>
                <span>Trigger side</span>
                <strong>{orderSide === "buy" ? "Buy low" : "Sell high"}</strong>
              </div>
            </div>
          </>
        ) : (
          <p>
            Save stores your target immediately. The app monitors market price
            and only requests a STON.fi route when the order is ready to execute.
          </p>
        )}
      </div>
    </section>
  );
}
