import { TonConnectButton } from "@tonconnect/ui-react";

type HeroProps = {
  activeOrders: number;
};

export function Hero({ activeOrders }: HeroProps) {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <div className="eyebrow">eXwallet / eXw</div>
        <h1>Watch TON prices. Move when your level hits.</h1>
        <p>
          Build price alarms for TON tokens, keep your wallet in control, and jump
          into STON.fi the moment the market reaches your number.
        </p>
        <div className="hero-actions">
          <TonConnectButton />
          <div className="status-pill">
            <span className="status-dot" />
            Monitoring {activeOrders} live alert{activeOrders === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="hero-rail">
        <div className="hero-stat-card hero-stat-card-primary">
          <span className="meta-label">Live Now</span>
          <strong>{activeOrders}</strong>
          <p>Active market alarms refreshing in the background every 20 seconds.</p>
        </div>
        <div className="hero-mini-grid">
          <div className="hero-mini-card">
            <span className="meta-label">Execution</span>
            <strong>STON.fi widget</strong>
            <p>Open the swap flow only when you are ready.</p>
          </div>
          <div className="hero-mini-card">
            <span className="meta-label">Control</span>
            <strong>Tonkeeper stays in charge</strong>
            <p>No custody, no hidden signing, no silent trades.</p>
          </div>
          <div className="hero-mini-card hero-mini-card-wide">
            <span className="meta-label">Flow</span>
            <strong>Set alert / watch price / execute fast</strong>
            <p>Clean for demos, clear for users, and easy to explain in one sentence.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
