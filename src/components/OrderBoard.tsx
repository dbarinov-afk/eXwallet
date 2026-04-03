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
          <h2>Active target orders</h2>
        </div>
        <span className="section-note">
          {refreshing ? "Syncing market..." : "Auto-sync every 20s"}
        </span>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          Arm your first buy-low or sell-high order to start live monitoring.
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-topline">
                <div>
                  <strong>
                    {order.side === "buy" ? "Buy" : "Sell"} {getAssetSymbol(order.asset)}
                  </strong>
                  <span>{formatRelativeTime(order.createdAt)}</span>
                </div>
                <span className={statusClass(order)}>{statusLabel(order)}</span>
              </div>
              <div className="order-grid">
                <div>
                  <span>{order.side === "buy" ? "Budget" : "Amount"}</span>
                  <strong>
                    {order.side === "buy"
                      ? `$${formatNumber(order.inputAmount)}`
                      : `${formatNumber(order.inputAmount)} ${order.inputSymbol}`}
                  </strong>
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
                  <span>Route</span>
                  <strong>
                    {order.simulation ? "Validated" : "On trigger"}
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
