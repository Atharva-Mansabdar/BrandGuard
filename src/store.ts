export type CreativeStatus = "approved" | "blocked" | "pending" | "escalated";

export interface QueueItem {
  id: string;
  brand: string;
  campaignName: string;
  creativeText: string;
  placementType: string;
  cpcBid: number;
  safetyScore: number;
  brandFitScore: number;
  status: CreativeStatus;
  reasons: string[];
  tavilyContext: string;
  submittedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: "auto" | "human";
}

const queue: QueueItem[] = [];
let itemCounter = 1;

export function addToQueue(
  item: Omit<QueueItem, "id" | "submittedAt">,
): QueueItem {
  const entry: QueueItem = {
    ...item,
    id: `CRE-${String(itemCounter++).padStart(3, "0")}`,
    submittedAt: new Date(),
  };
  queue.unshift(entry);
  return entry;
}

export function getQueue(): QueueItem[] {
  return queue;
}

export function resolveItem(
  id: string,
  decision: "approved" | "blocked",
  resolvedBy: "auto" | "human",
): QueueItem | null {
  const item = queue.find((q) => q.id === id);
  if (!item) return null;
  item.status = decision;
  item.resolvedAt = new Date();
  item.resolvedBy = resolvedBy;
  return item;
}

export function getStats() {
  const total = queue.length;
  const approved = queue.filter((q) => q.status === "approved").length;
  const blocked = queue.filter((q) => q.status === "blocked").length;
  const escalated = queue.filter(
    (q) => q.status === "pending" || q.status === "escalated",
  ).length;
  return { total, approved, blocked, escalated };
}

export function serializeQueueItem(item: QueueItem) {
  return {
    ...item,
    submittedAt: item.submittedAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString(),
  };
}
