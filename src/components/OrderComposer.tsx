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
  targetPrice: string;
  setTargetPrice: (value: string) => void;
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
  targetPrice,
  setTargetPrice,
  spotPriceUsd,
  targetWarning,
  currentQuote,
  quoteError,
  onSubmit,
}: ComposerProps) {
  const selectedAsset = assets.find((asset) => asset.contractAddress === selectedAssetAddress);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Alert Builder</p>
          <h2>Create a price alert</h2>
        </div>
        <span className="section-note">Save once, auto-monitor every 20s</span>
      </div>
      <details className="hint-card">
        <summary>How alerts work</summary>
        <div className="hint-copy">
          <p>Choose a token, set buy below or sell above, and save the target price in USD.</p>
          <p>eXwallet watches the market in the background and raises a browser alert when the level is hit.</p>
          <p>Execution still happens through STON.fi and Tonkeeper, so your wallet stays in control.</p>
        </div>
      </details>
      <form className="composer" onSubmit={onSubmit}>
        <label>
          Alert type
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
          <span className="field-hint">
            {orderSide === "buy"
              ? "Notify me when price drops to this level."
              : "Notify me when price rises to this level."}
          </span>
        </label>
        <label>
          Token
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
                  {getAssetSymbol(asset)} · {getAssetName(asset)} · $
                  {formatNumber(
                    Number(asset.dexPriceUsd || asset.thirdPartyPriceUsd || 0) || 0,
                  )}
                </option>
              ))
            )}
          </select>
        </label>
        {selectedAssetAddress ? (
          <div className="token-picked">
            <div className="token-picked-symbol">
              {selectedAsset?.meta?.imageUrl ? (
                <img
                  className="asset-icon"
                  src={selectedAsset.meta.imageUrl}
                  alt={`${selectedAsset.meta?.symbol || "token"} icon`}
                />
              ) : (
                <div className="watch-symbol">
                  {selectedAsset ? getAssetSymbol(selectedAsset) : "TK"}
                </div>
              )}
            </div>
            <div className="token-picked-copy">
              <strong>{selectedAsset ? getAssetSymbol(selectedAsset) : "Token"}</strong>
              <span>{selectedAsset ? getAssetName(selectedAsset) : ""}</span>
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
            Save alert
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
                <span>Alert type</span>
                <strong>{orderSide === "buy" ? "Buy below" : "Sell above"}</strong>
              </div>
            </div>
          </>
        ) : (
          <p>
            Save stores the alert immediately. eXwallet will keep watching this
            token and raise an alert when the target price is reached.
          </p>
        )}
      </div>
    </section>
  );
}
