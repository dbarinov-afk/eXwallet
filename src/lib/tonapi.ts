import type { PortfolioEntry } from "../types";

type TonApiAccount = {
  balance?: number | string;
};

type TonApiJettons = {
  balances?: Array<{
    balance: string;
    jetton?: {
      address?: string;
      symbol?: string;
      name?: string;
      image?: string;
      decimals?: number;
    };
    wallet_address?: {
      address?: string;
    };
    price?: {
      prices?: {
        USD?: number;
      };
    };
    metadata?: {
      symbol?: string;
      name?: string;
      decimals?: string;
      image?: string;
      image_data?: string;
    };
  }>;
};

function accentForSymbol(symbol: string) {
  const palette = ["#5b8cff", "#31d0aa", "#ff8f5b", "#c9f169", "#ff6b9f", "#8d9eff"];
  let total = 0;
  for (const char of symbol) {
    total += char.charCodeAt(0);
  }
  return palette[total % palette.length];
}

export async function getPortfolio(address: string): Promise<PortfolioEntry[]> {
  const [accountResponse, jettonResponse] = await Promise.all([
    fetch(`https://tonapi.io/v2/accounts/${address}`),
    fetch(`https://tonapi.io/v2/accounts/${address}/jettons`),
  ]);

  const account = (await accountResponse.json()) as TonApiAccount;
  const jettons = (await jettonResponse.json()) as TonApiJettons;

  const tonBalance = Number(account.balance || 0) / 1_000_000_000;
  const entries: PortfolioEntry[] = [
    {
      id: "ton",
      symbol: "TON",
      name: "Toncoin",
      balance: tonBalance,
      accent: "#5b8cff",
      address,
    },
  ];

  for (const [index, balance] of (jettons.balances || []).entries()) {
    const symbol = balance.metadata?.symbol || balance.jetton?.symbol || "JETTON";
    const decimals = Number(
      balance.metadata?.decimals || balance.jetton?.decimals || 9,
    );
    const amount = Number(balance.balance || 0) / 10 ** decimals;
    const usdPrice = balance.price?.prices?.USD;
    const addressValue =
      balance.jetton?.address || balance.wallet_address?.address || `${symbol}-${index}`;
    entries.push({
      id: addressValue,
      symbol,
      name: balance.metadata?.name || balance.jetton?.name || symbol,
      balance: amount,
      usdValue: usdPrice ? amount * usdPrice : undefined,
      accent: accentForSymbol(symbol),
      imageUrl:
        balance.metadata?.image ||
        balance.metadata?.image_data ||
        balance.jetton?.image,
      address: addressValue,
    });
  }

  return entries
    .filter((entry) => entry.balance > 0)
    .sort((left, right) => {
      const rightValue = right.usdValue || right.balance;
      const leftValue = left.usdValue || left.balance;
      return rightValue - leftValue;
    });
}
