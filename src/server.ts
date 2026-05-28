import { McpServer } from "skybridge/server";
import { z } from "zod";
import { initOvermind } from "./lib/overmind.js";
import { handleGetQueue, handleResolveItem } from "./tools/get-queue.js";
import { handleScoreCreative } from "./tools/score-creative.js";

await initOvermind();

const reviewQueueView = {
  component: "review-queue" as const,
  domain: process.env.SKYBRIDGE_VIEW_DOMAIN ?? "https://skybridge.tech",
  description: "BrandGuard review queue dashboard",
};

function toolResult(structuredContent: Record<string, unknown>, text: string) {
  return {
    structuredContent,
    content: [{ type: "text" as const, text }],
    isError: false,
  };
}

const server = new McpServer(
  {
    name: "brandguard",
    version: "1.0.0",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "score_creative",
      description:
        "Score ad creative copy for brand safety before LLM-native placement. Returns safety score (0-100), brand fit score, reasons, and adds ambiguous items to the human review queue.",
      inputSchema: {
        brand: z.string().describe("Brand name e.g. Nike, Barclays, Dyson"),
        campaignName: z.string().describe("Campaign or ad set name"),
        creativeText: z.string().describe("The full ad copy text to be scored"),
        placementType: z
          .string()
          .optional()
          .default("ChatGPT")
          .describe("LLM platform for placement"),
        cpcBid: z.number().optional().default(3.5).describe("CPC bid in USD"),
      },
      annotations: {
        title: "Score creative for brand safety",
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Scoring creative with Tavily + Claude…",
        "openai/toolInvocation/invoked": "Brand safety score ready.",
      },
      view: reviewQueueView,
    },
    async (input) => {
      const result = await handleScoreCreative(input);
      if ("error" in result && typeof result.error === "string") {
        return {
          structuredContent: result,
          content: [{ type: "text", text: result.error }],
          isError: true,
        };
      }
      return toolResult(
        result,
        "message" in result && typeof result.message === "string"
          ? result.message
          : "Creative scored.",
      );
    },
  )
  .registerTool(
    {
      name: "get_review_queue",
      description:
        "Get the current BrandGuard review queue showing pending, approved, and blocked creatives with stats.",
      inputSchema: {
        filter: z
          .enum(["all", "pending", "approved", "blocked"])
          .optional()
          .default("all"),
      },
      annotations: {
        title: "View review queue",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Loading review queue…",
        "openai/toolInvocation/invoked": "Review queue loaded.",
      },
      view: reviewQueueView,
    },
    async (input) => {
      const result = handleGetQueue(input);
      return toolResult(
        result,
        `${result.stats.total} creatives scored · ${result.stats.escalated} need review`,
      );
    },
  )
  .registerTool(
    {
      name: "resolve_creative",
      description:
        "Approve or block a creative in the review queue as a human reviewer.",
      inputSchema: {
        id: z.string().describe("Queue item ID e.g. CRE-001"),
        decision: z.enum(["approved", "blocked"]),
      },
      annotations: {
        title: "Resolve queued creative",
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Updating review decision…",
        "openai/toolInvocation/invoked": "Decision saved.",
      },
      view: reviewQueueView,
    },
    async (input) => {
      const result = handleResolveItem(input);
      if ("error" in result && typeof result.error === "string") {
        return {
          structuredContent: result,
          content: [{ type: "text", text: result.error }],
          isError: true,
        };
      }
      const text = `Item ${input.id} manually ${input.decision} by human reviewer.`;
      return toolResult(result, text);
    },
  );

if (process.env.NODE_ENV === "production") {
  const { default: manifest } = await import("./vite-manifest.js");
  server.setViteManifest(manifest);
}

export default await server.run();

export type AppType = typeof server;
