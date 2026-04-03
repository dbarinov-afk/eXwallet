import { useEffect, useState, type FormEvent } from "react";
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
  successMessage?: string;
  onOpenAlerts: () => void;
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
  successMessage,
  onOpenAlerts,
  onSubmit,
}: ComposerProps) {
  const selectedAsset = assets.find((asset) => asset.contractAddress === selectedAssetAddress);
  const [customPercent, setCustomPercent] = useState("7");
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);

  const customDelta = Math.max(0.1, Number(customPercent) || 0);
  const customTarget =
    spotPriceUsd
      ? orderSide === "buy"
        ? spotPriceUsd * (1 - customDelta / 100)
        : spotPriceUsd * (1 + customDelta / 100)
      : undefined;

  useEffect(() => {
    setWarningAcknowledged(false);
  }, [targetWarning, orderSide, selectedAssetAddress, targetPrice]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Alert Builder</p>
          <h2>Set an alarm for a token price</h2>
        </div>
        <span className="section-note">Save once, auto-monitor every 20s</span>
      </div>
      <div className="builder-highlight">
        <strong>Set the alarm</strong>
        <span>Choose a token, pick the direction, and save the price level you want to watch.</span>
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
        </label>
        {targetWarning ? (
          <div className="warning-card">
            <strong>Check this alert before saving</strong>
            <span>{targetWarning}</span>
            <button
              className={warningAcknowledged ? "primary-button warning-button acknowledged" : "primary-button warning-button"}
              type="button"
              onClick={() => setWarningAcknowledged(true)}
            >
              {warningAcknowledged ? "Warning confirmed" : "I understand, save anyway"}
            </button>
          </div>
        ) : null}
        {spotPriceUsd ? (
          <div className="preset-row">
            {orderSide === "buy" ? (
              <>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 0.98).toFixed(4))}
                >
                  -2%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 0.97).toFixed(4))}
                >
                  -3%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 0.95).toFixed(4))}
                >
                  -5%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 0.9).toFixed(4))}
                >
                  -10%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 0.85).toFixed(4))}
                >
                  -15%
                </button>
              </>
            ) : (
              <>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 1.02).toFixed(4))}
                >
                  +2%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 1.03).toFixed(4))}
                >
                  +3%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 1.05).toFixed(4))}
                >
                  +5%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 1.1).toFixed(4))}
                >
                  +10%
                </button>
                <button
                  className="ghost-button preset-button"
                  type="button"
                  onClick={() => setTargetPrice((spotPriceUsd * 1.15).toFixed(4))}
                >
                  +15%
                </button>
              </>
            )}
            <input
              className="preset-percent-input"
              inputMode="decimal"
              value={customPercent}
              onChange={(event) => setCustomPercent(event.target.value)}
              placeholder="7"
            />
            <span className="field-hint">
              {customTarget ? `Custom target: $${customTarget.toFixed(4)}` : ""}
            </span>
            <button
              className="ghost-button preset-button"
              type="button"
              onClick={() => customTarget && setTargetPrice(customTarget.toFixed(4))}
            >
              Apply {customDelta}%
            </button>
          </div>
        ) : null}
        <div className="composer-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={assets.length === 0 || Boolean(targetWarning && !warningAcknowledged)}
          >
            Set alarm
          </button>
          {successMessage ? (
            <div className="alarm-success">
              <span className="alarm-success-dot" />
              <span>{successMessage}</span>
              <button className="text-link-button" type="button" onClick={onOpenAlerts}>
                View alerts
              </button>
            </div>
          ) : null}
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
