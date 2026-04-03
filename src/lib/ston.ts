import { AssetTag, StonApiClient } from "@ston-fi/api";
import { Client, dexFactory } from "@ston-fi/sdk";
import type { TonConnectUI } from "@tonconnect/ui";
import type { OrderSide, SupportedAsset, SwapSimulation } from "../types";

const stonApiClient = new StonApiClient();
const tonClient = new Client({
  endpoint: "https://toncenter.com/api/v2/jsonRPC",
});

const WATCHLIST_SYMBOLS = ["USDT", "STON", "NOT", "DOGS", "USDE", "HMSTR"];

export async function getLiquidAssets() {
  try {
    const allAssetsPromise = stonApiClient.getAssets() as Promise<SupportedAsset[]>;
    const condition = [
      AssetTag.LiquidityVeryHigh,
      AssetTag.LiquidityHigh,
      AssetTag.LiquidityMedium,
    ].join(" | ");

    const [allAssets, assets] = await Promise.all([
      allAssetsPromise,
      stonApiClient.queryAssets({
        condition,
      }) as Promise<SupportedAsset[]>,
    ]);

    const ton =
      allAssets.find((asset) => asset.kind === "Ton") ||
      assets.find((asset) => asset.kind === "Ton");
    const wton =
      allAssets.find((asset) => asset.kind === "Wton") ||
      assets.find((asset) => asset.kind === "Wton");
    const jettons = assets
      .filter((asset) => asset.kind === "Jetton")
      .sort((left, right) => {
        const leftIndex = WATCHLIST_SYMBOLS.indexOf(left.meta?.symbol?.toUpperCase() || "");
        const rightIndex = WATCHLIST_SYMBOLS.indexOf(right.meta?.symbol?.toUpperCase() || "");

        if (leftIndex === -1 && rightIndex === -1) {
          return (left.meta?.symbol || "").localeCompare(right.meta?.symbol || "");
        }

        if (leftIndex === -1) {
          return 1;
        }

        if (rightIndex === -1) {
          return -1;
        }

        return leftIndex - rightIndex;
      })
      .slice(0, 6);

    return {
      ton,
      wton,
      jettons,
    };
  } catch (error) {
    console.error("Falling back to baked-in watchlist", error);
    return {
      ton: undefined,
      wton: undefined,
      jettons: [],
    };
  }
}

export function getDefaultAssetAddress(assets: SupportedAsset[]) {
  return assets[0]?.contractAddress || "";
}

export function toTokenUnits(amount: number, decimals: number) {
  return Math.round(amount * 10 ** decimals).toString();
}

export async function simulateOrder(params: {
  asset: SupportedAsset;
  side: OrderSide;
  amount: number;
  tonProxyAddress?: string;
}) {
  const { asset, side, amount, tonProxyAddress } = params;
  const offerUnits =
    side === "buy"
      ? toTokenUnits(amount, 9)
      : toTokenUnits(amount, getAssetDecimals(asset));

  const result = await stonApiClient.simulateSwap({
    offerAddress: side === "buy" ? "ton" : asset.contractAddress,
    askAddress: side === "buy" ? asset.contractAddress : tonProxyAddress || "ton",
    slippageTolerance: "0.01",
    offerUnits,
  });

  return result as unknown as SwapSimulation;
}

export function getAssetSymbol(asset: SupportedAsset) {
  return asset.meta?.symbol || asset.meta?.displayName || "TOKEN";
}

export function getAssetName(asset: SupportedAsset) {
  return asset.meta?.displayName || asset.meta?.symbol || "TON Asset";
}

export function getAssetDecimals(asset: SupportedAsset) {
  return asset.kind === "Ton" ? 9 : asset.meta?.decimals || 9;
}

export function parseSwapOutput(
  simulation: SwapSimulation,
  asset: SupportedAsset,
  side: OrderSide,
) {
  const assetDecimals = getAssetDecimals(asset);
  const offerAmount =
    Number(simulation.offerUnits) / 10 ** (side === "buy" ? 9 : assetDecimals);
  const askAmount =
    Number(simulation.askUnits || simulation.minAskUnits) /
    10 ** (side === "buy" ? assetDecimals : 9);
  const priceTonPerToken =
    side === "buy"
      ? askAmount > 0
        ? offerAmount / askAmount
        : 0
      : offerAmount > 0
        ? askAmount / offerAmount
        : 0;

  return {
    askUnits: simulation.askUnits,
    minAskUnits: simulation.minAskUnits,
    outputAmount: askAmount,
    outputSymbol: side === "buy" ? getAssetSymbol(asset) : "TON",
    priceTonPerToken,
    priceImpact: simulation.priceImpact,
  };
}

export async function executeOrder(params: {
  asset: SupportedAsset;
  side: OrderSide;
  simulation: SwapSimulation;
  tonConnectUI: TonConnectUI;
  userAddress: string;
}) {
  const { asset, side, simulation, tonConnectUI, userAddress } = params;
  const routerInfo =
    simulation.router ||
    (simulation.routerAddress
      ? await stonApiClient.getRouter(simulation.routerAddress)
      : undefined);

  if (!routerInfo) {
    throw new Error("STON.fi router metadata is missing from the simulation result.");
  }

  const dexContracts = dexFactory(routerInfo);
  const router = tonClient.open(dexContracts.Router.create(routerInfo.address));
  const proxyTon = dexContracts.pTON.create(routerInfo.ptonMasterAddress);

  const swapParams =
    side === "buy"
      ? await router.getSwapTonToJettonTxParams({
          userWalletAddress: userAddress,
          proxyTon,
          offerAmount: simulation.offerUnits,
          minAskAmount: simulation.minAskUnits,
          askJettonAddress: asset.contractAddress,
        })
      : await router.getSwapJettonToTonTxParams({
          userWalletAddress: userAddress,
          offerJettonAddress: asset.contractAddress,
          proxyTon,
          offerAmount: simulation.offerUnits,
          minAskAmount: simulation.minAskUnits,
        });

  await tonConnectUI.sendTransaction({
    validUntil: Date.now() + 5 * 60 * 1000,
    messages: [
      {
        address: swapParams.to.toString(),
        amount: swapParams.value.toString(),
        payload: swapParams.body?.toBoc().toString("base64"),
      },
    ],
  });
}
