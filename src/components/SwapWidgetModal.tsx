import { useEffect, useRef, useState } from "react";
import OmnistonWidgetLoader from "@ston-fi/omniston-widget-loader";
import type { OrderSide, SupportedAsset } from "../types";
const TON_ASSET_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;

type SwapWidgetModalProps = {
  open: boolean;
  asset: SupportedAsset;
  side: OrderSide;
  tonConnectUI: unknown;
  onClose: () => void;
};

function openStonSwap() {
  window.open("https://app.ston.fi/swap", "_blank", "noopener,noreferrer");
}

export function SwapWidgetModal({
  open,
  asset,
  side,
  tonConnectUI,
  onClose,
}: SwapWidgetModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ unmount?: () => void; destroy?: () => void }>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    if (!open) {
      setError(undefined);
      setAttempt(1);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !containerRef.current) {
      return;
    }

    let cancelled = false;
    setError(undefined);

    OmnistonWidgetLoader.load()
      .then((OmnistonWidget) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const widget = new OmnistonWidget({
          tonconnect: {
            type: "integrated",
            instance: tonConnectUI as never,
          },
          widget: {
            defaultBidAsset: side === "buy" ? TON_ASSET_ADDRESS : asset.contractAddress,
            defaultAskAsset: side === "buy" ? asset.contractAddress : TON_ASSET_ADDRESS,
            defaultAssets: true,
            customAssets: [TON_ASSET_ADDRESS, asset.contractAddress],
          },
        });

        widgetRef.current = widget;
        widget.mount(containerRef.current);
      })
      .catch((widgetError) => {
        console.error("Failed to initialize Omniston widget", widgetError);
        if (cancelled) {
          return;
        }

        if (attempt < MAX_RETRIES) {
          window.setTimeout(() => {
            if (!cancelled) {
              setAttempt((current) => current + 1);
            }
          }, RETRY_DELAY_MS);
          return;
        }

        setError("Could not load the STON widget from widget.ston.fi on this network.");
      });

    return () => {
      cancelled = true;
      widgetRef.current?.unmount?.();
      widgetRef.current?.destroy?.();
      widgetRef.current = undefined;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [open, asset.contractAddress, side, tonConnectUI, attempt]);

  if (!open) {
    return null;
  }

  return (
    <div className="widget-backdrop" onClick={onClose} role="presentation">
      <div className="widget-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <p className="section-label">Swap Execution</p>
            <h2>Execute in STON widget</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {error ? (
          <div className="empty-state">
            <p>{error}</p>
            <div className="composer-actions">
              <button className="primary-button" type="button" onClick={openStonSwap}>
                Open STON site
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="section-note">Loading widget{attempt > 1 ? `, retry ${attempt}/${MAX_RETRIES}` : ""}…</div>
            <div className="widget-container" ref={containerRef} />
          </>
        )}
      </div>
    </div>
  );
}
