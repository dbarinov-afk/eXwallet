import { getTradingViewSymbol } from "../lib/tradingview";
import { TradingViewChart } from "./TradingViewChart";

type ChartSectionProps = {
  symbol?: string;
  title?: string;
};

export function ChartSection({ symbol, title }: ChartSectionProps) {
  const tradingViewSymbol = getTradingViewSymbol(symbol);
  const chartTitle = title || symbol || "token";

  return (
    <details className="hint-card chart-card">
      <summary>Market chart</summary>
      <div className="hint-copy chart-copy">
        {tradingViewSymbol ? (
          <>
            <p>Open the chart when you want extra context before setting the alarm.</p>
            <TradingViewChart symbol={tradingViewSymbol} title={chartTitle} />
          </>
        ) : (
          <p>
            TradingView is not mapped for this token yet. Switch to TON, STON, NOT, DOGS, or HMSTR to see the embedded chart.
          </p>
        )}
      </div>
    </details>
  );
}
