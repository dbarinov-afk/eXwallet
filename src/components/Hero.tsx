import { TonConnectButton } from "@tonconnect/ui-react";

type HeroProps = {
  trackedCount: number;
  activeOrders: number;
};

export function Hero({ trackedCount, activeOrders }: HeroProps) {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <div className="eyebrow">eXwallet / eXw</div>
        <h1>Set the level. Execute on your terms.</h1>
        <p>
          A TON trading assistant for price alerts. Pick a token, set the level
          you care about, and let eXwallet watch the market until it is time to
          execute with STON.fi.
        </p>
        <div className="hero-actions">
          <TonConnectButton />
          <div className="status-pill">
            <span className="status-dot" />
            Monitoring {activeOrders} live alert{activeOrders === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="hero-shell">
        <div className="shell-header">
          <span>LIVE OVERVIEW</span>
          <span>{trackedCount} tokens tracked</span>
        </div>
        <div className="shell-grid">
          <div className="shell-metric">
            <span>Mode</span>
            <strong>Price alerts</strong>
            <p>Buy-below and sell-above levels in USD</p>
          </div>
          <div className="shell-metric">
            <span>Execution</span>
            <strong>STON.fi</strong>
            <p>Open swap flow only when the alert is triggered</p>
          </div>
          <div className="shell-metric">
            <span>Wallet</span>
            <strong>Tonkeeper</strong>
            <p>AppKit-first TON-native connect flow</p>
          </div>
        </div>
      </div>
    </section>
  );
}
