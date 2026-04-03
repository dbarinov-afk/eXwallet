const TRADINGVIEW_SYMBOLS: Record<string, string> = {
  TON: "BINANCE:TONUSDT",
  STON: "STONFI2:STONUSDT_EQBBSM.USD",
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
