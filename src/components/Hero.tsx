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
          A trader-first TON wallet experience built around target entries.
          Watch liquid tokens, define your buy level, and execute with STON.fi
          the second the market reaches your plan.
        </p>
        <div className="hero-actions">
          <TonConnectButton />
          <div className="status-pill">
            <span className="status-dot" />
            Monitoring {activeOrders} target order{activeOrders === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="hero-shell">
        <div className="shell-header">
          <span>TRADER TERMINAL</span>
          <span>{trackedCount} liquid assets tracked</span>
        </div>
        <div className="shell-grid">
          <div className="shell-metric">
            <span>Signal</span>
            <strong>Target entries</strong>
            <p>Off-chain watch, user-signed execution</p>
          </div>
          <div className="shell-metric">
            <span>Route</span>
            <strong>STON.fi</strong>
            <p>Quotes, routing, and swap payloads</p>
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

