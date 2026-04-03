import {
  AppKit,
  AppKitProvider,
  Network,
  TonConnectConnector,
} from "@ton/appkit-react";
import "@ton/appkit-react/styles.css";
import { OmnistonSwapProvider } from "@ton/appkit/swap/omniston";
import type { PropsWithChildren } from "react";

const tonCenterKey = import.meta.env.VITE_TONCENTER_KEY;
const manifestUrl =
  import.meta.env.VITE_TONCONNECT_MANIFEST_URL ||
  "https://tonconnect-sdk-demo-dapp.vercel.app/tonconnect-manifest.json";

const kit = new AppKit({
  networks: {
    [Network.mainnet().chainId]: {
      apiClient: {
        url: "https://toncenter.com",
        ...(tonCenterKey ? { key: tonCenterKey } : {}),
      },
    },
  },
  connectors: [
    new TonConnectConnector({
      tonConnectOptions: {
        manifestUrl,
      },
    }),
  ],
  providers: [new OmnistonSwapProvider()],
});

export function AppProviders({ children }: PropsWithChildren) {
  return <AppKitProvider appKit={kit}>{children}</AppKitProvider>;
}
