const TRADINGVIEW_SYMBOLS: Record<string, string> = {
  TON: "BINANCE:TONUSDT",
  STON: "STONUSDT",
  NOT: "BINANCE:NOTUSDT",
  DOGS: "BINANCE:DOGSUSDT",
  HMSTR: "BINANCE:HMSTRUSDT",
};

export function getTradingViewSymbol(symbol?: string) {
  if (!symbol) {
    return undefined;
  }

  return TRADINGVIEW_SYMBOLS[symbol.toUpperCase()];
}
