let overmindInit = false;

type OvermindSdk = {
  init: (opts: { apiKey: string }) => void;
  trace: <T>(
    name: string,
    metadata: Record<string, string | number>,
    fn: () => Promise<T>,
  ) => Promise<T>;
};

async function loadOvermindSdk(): Promise<OvermindSdk | null> {
  try {
    const spec = "@overmind-lab/sdk";
    return (await import(/* @vite-ignore */ spec)) as OvermindSdk;
  } catch {
    return null;
  }
}

export async function initOvermind() {
  if (overmindInit || !process.env.OVERMIND_API_KEY) return;
  const sdk = await loadOvermindSdk();
  if (!sdk) {
    console.warn("[Overmind] SDK not available, tracing disabled");
    return;
  }
  sdk.init({ apiKey: process.env.OVERMIND_API_KEY });
  overmindInit = true;
  console.log("[Overmind] Tracing initialised");
}

export async function withTrace<T>(
  spanName: string,
  metadata: Record<string, string | number>,
  fn: () => Promise<T>,
): Promise<T> {
  const sdk = await loadOvermindSdk();
  if (!sdk) return fn();
  return sdk.trace(spanName, metadata, fn);
}
