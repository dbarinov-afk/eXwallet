import { useEffect, useRef } from "react";

type TradingViewChartProps = {
  symbol: string;
  title: string;
};

export function TradingViewChart({ symbol, title }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = "";

    const widgetHost = document.createElement("div");
    widgetHost.className = "tradingview-widget-container";

    const widgetRoot = document.createElement("div");
    widgetRoot.className = "tradingview-widget-container__widget";

    const widgetNotice = document.createElement("div");
    widgetNotice.className = "tradingview-widget-copyright";
    widgetNotice.innerHTML = `<a href="https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track ${title}</span></a> on TradingView`;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: "240",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_volume: true,
      backgroundColor: "rgba(8, 11, 18, 1)",
      gridColor: "rgba(123, 142, 177, 0.08)",
    });

    widgetHost.append(widgetRoot, widgetNotice, script);
    container.appendChild(widgetHost);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, title]);

  return <div className="chart-shell" ref={containerRef} />;
}
