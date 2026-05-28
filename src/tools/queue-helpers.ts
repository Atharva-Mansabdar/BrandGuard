import {
  getQueue,
  getStats,
  serializeQueueItem,
  type CreativeStatus,
} from "../store.js";

export function buildQueuePayload(filter: "all" | "pending" | "approved" | "blocked" = "all") {
  const queue = getQueue();
  const filtered =
    filter === "all"
      ? queue
      : queue.filter(
          (q) =>
            q.status === filter ||
            (filter === "pending" &&
              (q.status === "pending" ||
                q.status === "escalated" ||
                q.status === "processing")),
        );

  return {
    stats: getStats(),
    items: filtered.slice(0, 20).map(serializeQueueItem),
  };
}

export function mapScoreStatusToQueue(
  status: "approved" | "blocked" | "escalated",
): CreativeStatus {
  if (status === "approved") return "approved";
  if (status === "blocked") return "blocked";
  return "pending";
}
