import { TonConnectButton } from "@tonconnect/ui-react";

type HeroProps = {
  activeOrders: number;
};

export function Hero({ activeOrders }: HeroProps) {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <div className="eyebrow">eXwallet / eXw</div>
        <h1>Set a TON price alert and act when it hits.</h1>
        <p>
          Track TON tokens, save buy-below or sell-above levels, and open STON.fi
          right when the market reaches your target.
        </p>
        <div className="hero-actions">
          <TonConnectButton />
          <div className="status-pill">
            <span className="status-dot" />
            Monitoring {activeOrders} live alert{activeOrders === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </section>
  );
}
