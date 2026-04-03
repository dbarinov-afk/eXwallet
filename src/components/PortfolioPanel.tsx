import { useMemo, useState } from "react";
import type { PortfolioEntry } from "../types";
import {
  formatCurrency,
  formatNumber,
  initialsForToken,
  truncateAddress,
} from "../lib/format";

type PortfolioPanelProps = {
  connected: boolean;
  portfolio: PortfolioEntry[];
  loading: boolean;
  error?: string;
  onRefresh: () => void;
};

export function PortfolioPanel({
  connected,
  portfolio,
  loading,
  error,
  onRefresh,
}: PortfolioPanelProps) {
  const [showAllAssets, setShowAllAssets] = useState(false);
  const pricedTotal = portfolio.reduce((sum, entry) => sum + (entry.usdValue || 0), 0);
  const pricedCount = portfolio.filter((entry) => entry.usdValue && entry.usdValue > 0).length;
  const { featuredAssets, otherAssets } = useMemo(() => {
    const featuredSymbols = ["TON", "STON", "USDT"];
    const symbolRank = new Map(featuredSymbols.map((symbol, index) => [symbol, index]));

    const featured = portfolio
      .filter((entry) => symbolRank.has(entry.symbol.toUpperCase()))
      .sort(
        (left, right) =>
          (symbolRank.get(left.symbol.toUpperCase()) ?? Number.MAX_SAFE_INTEGER) -
          (symbolRank.get(right.symbol.toUpperCase()) ?? Number.MAX_SAFE_INTEGER),
      );

    const others = portfolio.filter((entry) => !symbolRank.has(entry.symbol.toUpperCase()));

    return {
      featuredAssets: featured,
      otherAssets: others,
    };
  }, [portfolio]);

  const visibleAssets = featuredAssets.length > 0 ? featuredAssets : portfolio;

  function renderAssetRow(entry: PortfolioEntry) {
    return (
      <div className="asset-row" key={entry.id}>
        {entry.imageUrl ? (
          <img
            className="asset-icon"
            src={entry.imageUrl}
            alt={`${entry.symbol} icon`}
          />
        ) : (
          <div className="asset-badge" style={{ background: entry.accent }}>
            {initialsForToken(entry.symbol, entry.name)}
          </div>
        )}
        <div className="asset-copy">
          <strong>{entry.symbol}</strong>
          <span>{entry.name}</span>
          {entry.address ? (
            <small className="asset-address">{truncateAddress(entry.address)}</small>
          ) : null}
        </div>
        <div className="asset-values">
          <strong>{formatNumber(entry.balance)}</strong>
          <span>
            {entry.usdValue ? formatCurrency(entry.usdValue) : "USD price not available"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Portfolio</p>
          <h2>Wallet snapshot</h2>
        </div>
        <div className="panel-actions">
          <span className="section-note">TonAPI-backed asset overview</span>
          <button
            className="ghost-button"
            type="button"
            disabled={!connected || loading}
            onClick={onRefresh}
          >
            {loading ? "Refreshing..." : "Refresh balances"}
          </button>
        </div>
      </div>
      {connected && portfolio.length > 0 ? (
        <div className="portfolio-summary">
          <div>
            <span className="summary-label">Tracked assets</span>
            <strong>{portfolio.length}</strong>
          </div>
          <div>
            <span className="summary-label">Priced assets</span>
            <strong>{pricedCount}</strong>
          </div>
          <div>
            <span className="summary-label">Estimated value</span>
            <strong>{pricedTotal > 0 ? formatCurrency(pricedTotal) : "Waiting for USD feeds"}</strong>
          </div>
        </div>
      ) : null}
      {!connected ? (
        <div className="empty-state">
          Connect Tonkeeper to load balances, token icons, and your trade-ready
          wallet snapshot.
        </div>
      ) : loading ? (
        <div className="empty-state">Loading balances from TON…</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <>
          <div className="asset-list">
            {visibleAssets.map(renderAssetRow)}
          </div>
          {otherAssets.length > 0 ? (
            <details
              className="portfolio-more"
              open={showAllAssets}
              onToggle={(event) =>
                setShowAllAssets((event.currentTarget as HTMLDetailsElement).open)
              }
            >
              <summary>
                {showAllAssets
                  ? "Hide other assets"
                  : `Show ${otherAssets.length} other asset${otherAssets.length === 1 ? "" : "s"}`}
              </summary>
              <div className="asset-list portfolio-more-list">
                {otherAssets.map(renderAssetRow)}
              </div>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}
