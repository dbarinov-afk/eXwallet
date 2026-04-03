export type SupportedAsset = {
  contractAddress: string;
  kind: "Ton" | "Wton" | "Jetton";
  dexPriceUsd?: string;
  thirdPartyPriceUsd?: string;
  meta?: {
    symbol?: string;
    displayName?: string;
    decimals?: number;
    imageUrl?: string;
  };
};

export type SwapSimulation = {
  askAddress: string;
  askUnits: string;
  minAskUnits: string;
  offerAddress: string;
  offerUnits: string;
  priceImpact?: string;
  router?: {
    address: string;
    ptonMasterAddress: string;
    majorVersion: number;
    minorVersion: number;
  };
  routerAddress?: string;
};

export type OrderSide = "buy" | "sell";
export type OrderStatus = "watching" | "near" | "triggered" | "executed";

export type QuoteSnapshot = {
  createdAt: string;
  minAskUnits?: string;
  askUnits?: string;
  priceTonPerToken: number;
  priceUsdPerToken: number;
  outputAmount?: number;
  outputSymbol?: string;
  priceImpact?: string;
};

export type TargetOrder = {
  id: string;
  createdAt: string;
  side: OrderSide;
  asset: SupportedAsset;
  inputAmount?: number;
  inputSymbol?: string;
  targetPrice: number;
  status: OrderStatus;
  livePriceUsd?: number;
  quote?: QuoteSnapshot;
  simulation?: SwapSimulation;
  note?: string;
};

export type TriggerAlert = {
  id: string;
  orderId: string;
  title: string;
  body: string;
  createdAt: string;
};

export type PortfolioEntry = {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  usdValue?: number;
  accent: string;
  imageUrl?: string;
  address?: string;
};
