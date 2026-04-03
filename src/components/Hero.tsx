import { TonConnectButton } from "@tonconnect/ui-react";

type HeroProps = {
  activeOrders: number;
};

export function Hero({ activeOrders }: HeroProps) {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <div className="eyebrow">eXwallet / eXw</div>
        <h1>TON alerts that feel instant.</h1>
        <p>
          Track TON tokens, set price alarms in seconds, and jump into STON.fi
          the moment the market reaches your level.
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
