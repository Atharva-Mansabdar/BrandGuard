import { resolveItem } from "../store.js";
import { buildQueuePayload } from "./queue-helpers.js";

export function handleGetQueue(input: { filter?: "all" | "pending" | "approved" | "blocked" }) {
  return buildQueuePayload(input.filter ?? "all");
}

export function handleResolveItem(input: {
  id: string;
  decision: "approved" | "blocked";
}) {
  const resolved = resolveItem(input.id, input.decision, "human");
  if (!resolved) {
    return { error: `Item ${input.id} not found` };
  }

  return {
    id: resolved.id,
    decision: input.decision,
    message: `Item ${input.id} manually ${input.decision} by human reviewer.`,
    ...buildQueuePayload(),
  };
}
