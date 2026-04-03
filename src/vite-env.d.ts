/// <reference types="vite/client" />

declare module "process" {
  const process: {
    env: Record<string, string | undefined>;
    nextTick?: (callback: (...args: unknown[]) => void) => void;
  };

  export default process;
}

declare global {
  var Buffer: typeof import("buffer").Buffer | undefined;
  var process:
    | {
        env: Record<string, string | undefined>;
        nextTick?: (callback: (...args: unknown[]) => void) => void;
      }
    | undefined;
  var global: typeof globalThis | undefined;
}

export {};
