let overmindInit = false;
let overmindSdk: OvermindSdk | null = null;
let tracingUnavailableReason: string | null = null;

type OvermindSdk = {
  init: (opts: { apiKey: string }) => void;
  trace?: <T>(
    name: string,
    metadata: Record<string, string | number>,
    fn: () => Promise<T>,
  ) => Promise<T>;
};

async function loadOvermindSdk(): Promise<OvermindSdk | null> {
  try {
    const sdkSpec = "@overmind-lab/sdk";
    const mod = (await import(/* @vite-ignore */ sdkSpec)) as OvermindSdk;
    if (typeof mod.init === "function") return mod;
  } catch (error) {
    tracingUnavailableReason =
      error instanceof Error ? error.message : String(error);
    // fallback to other SDK variants
  }

  try {
    const traceSpec = "@overmind-lab/trace-sdk";
    const traceSdk = (await import(/* @vite-ignore */ traceSpec)) as {
      OvermindClient?: new (config: { apiKey: string; appName?: string }) => {
        initTracing?: (config: unknown) => void;
      };
    };
    if (traceSdk.OvermindClient) {
      return {
        init: ({ apiKey }) => {
          const client = new traceSdk.OvermindClient!({
            apiKey,
            appName: "brandguard-mcp",
          });
          client.initTracing?.({
            enableBatching: true,
            enabledProviders: {} as never,
          });
        },
      };
    }
  } catch (error) {
    tracingUnavailableReason =
      error instanceof Error ? error.message : String(error);
  }

  return null;
}

export async function initOvermind() {
  if (overmindInit) return;
  overmindInit = true;

  const apiKey = process.env.OVERMIND_API_KEY;
  if (!apiKey) {
    console.info("[Overmind] OVERMIND_API_KEY not set, tracing disabled");
    return;
  }

  overmindSdk = await loadOvermindSdk();
  if (!overmindSdk) {
    if (tracingUnavailableReason) {
      console.warn(
        `[Overmind] SDK unavailable (${tracingUnavailableReason}), tracing disabled`,
      );
    } else {
      console.warn("[Overmind] SDK unavailable, tracing disabled");
    }
    return;
  }

  try {
    overmindSdk.init({ apiKey });
    console.log("[Overmind] Tracing initialised");
  } catch (error) {
    console.warn("[Overmind] Failed to initialise tracing", error);
  }
}

export async function withTrace<T>(
  spanName: string,
  metadata: Record<string, string | number>,
  fn: () => Promise<T>,
): Promise<T> {
  if (!overmindSdk?.trace) return fn();
  return overmindSdk.trace(spanName, metadata, fn);
}
