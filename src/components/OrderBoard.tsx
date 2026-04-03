import type { TargetOrder } from "../types";
import { cn, formatNumber, formatRelativeTime } from "../lib/format";
import { getAssetSymbol } from "../lib/ston";

type OrderBoardProps = {
  connected: boolean;
  orders: TargetOrder[];
  refreshing: boolean;
  onExecute: (order: TargetOrder) => void;
  onRemove: (orderId: string) => void;
};

function statusLabel(order: TargetOrder) {
  if (order.status === "executed") {
    return "Executed";
  }
  if (order.status === "triggered") {
    return "Ready now";
  }
  if (order.status === "near") {
    return "Near target";
  }
  return "Watching";
}

function statusClass(order: TargetOrder) {
  return cn(
    "status-chip",
    order.status === "triggered" && "status-triggered",
    order.status === "near" && "status-near",
    order.status === "executed" && "status-executed",
  );
}

function distanceToTrigger(order: TargetOrder) {
  if (!order.livePriceUsd || !order.targetPrice) {
    return undefined;
  }

  if (order.status === "triggered") {
    return "At target";
  }

  const delta =
    order.side === "buy"
      ? ((order.livePriceUsd - order.targetPrice) / order.livePriceUsd) * 100
      : ((order.targetPrice - order.livePriceUsd) / order.livePriceUsd) * 100;

  if (!Number.isFinite(delta)) {
    return undefined;
  }

  return `${formatNumber(Math.abs(delta), { maximumFractionDigits: 2 })}% away`;
}

export function OrderBoard({
  connected,
  orders,
  refreshing,
  onExecute,
  onRemove,
}: OrderBoardProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Monitor</p>
          <h2>Active price alerts</h2>
        </div>
        <span className="section-note">
          {refreshing ? "Syncing market..." : "Auto-sync every 20s"}
        </span>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          Save your first buy-below or sell-above alert to start live monitoring.
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-topline">
                <div className="order-title">
                  <strong>
                    {order.side === "buy" ? "Buy" : "Sell"} {getAssetSymbol(order.asset)}
                  </strong>
                  <span>{formatRelativeTime(order.createdAt)}</span>
                </div>
                <div className="order-status-group">
                  <span className="side-chip">
                    {order.side === "buy" ? "Buy low" : "Sell high"}
                  </span>
                  <span className={statusClass(order)}>{statusLabel(order)}</span>
                </div>
              </div>
              <div className="order-grid">
                <div>
                  <span>Condition</span>
                  <strong>{order.side === "buy" ? "Price below" : "Price above"}</strong>
                </div>
                <div>
                  <span>Target</span>
                  <strong>${formatNumber(order.targetPrice)}</strong>
                </div>
                <div>
                  <span>Live</span>
                  <strong>
                    {order.livePriceUsd
                      ? `$${formatNumber(order.livePriceUsd)}`
                      : "Waiting"}
                  </strong>
                </div>
                <div>
                  <span>Distance</span>
                  <strong>{distanceToTrigger(order) || "Waiting"}</strong>
                </div>
                <div>
                  <span>Next action</span>
                  <strong>
                    {order.status === "triggered" ? "Execute in STON" : "Keep watching"}
                  </strong>
                </div>
              </div>
              <div className="order-footer">
                <p>
                  {order.note ||
                    "Off-chain monitor with user-signed execution through STON.fi."}
                </p>
                <div className="order-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => onRemove(order.id)}
                  >
                    Remove
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!connected || order.status === "executed" || order.status !== "triggered"}
                    onClick={() => onExecute(order)}
                  >
                    {order.status === "executed"
                      ? "Executed"
                      : order.status === "triggered"
                        ? "Execute"
                        : "Waiting for trigger"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
