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
      {!connected ? (
        <div className="empty-state">
          Connect Tonkeeper to load balances, recent exposure, and trade-ready
          assets.
        </div>
      ) : loading ? (
        <div className="empty-state">Loading balances from TON…</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <div className="asset-list">
          {portfolio.map((entry) => (
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
          ))}
        </div>
      )}
    </section>
  );
}
