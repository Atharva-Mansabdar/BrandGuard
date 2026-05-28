import { useEffect, useState } from "react";
import { useCallTool, useToolInfo } from "@/helpers.js";

interface QueueItem {
  id: string;
  brand: string;
  campaignName: string;
  creativeText: string;
  placementType: string;
  cpcBid: number;
  safetyScore: number;
  brandFitScore: number;
  status: "processing" | "approved" | "blocked" | "pending" | "escalated";
  reasons: string[];
  tavilyContext: string;
  submittedAt: string;
}

interface QueueData {
  stats: {
    total: number;
    processing: number;
    approved: number;
    blocked: number;
    escalated: number;
  };
  items: QueueItem[];
}

function scoreColor(score: number) {
  if (score >= 70) return "#1D9E75";
  if (score >= 40) return "#EF9F27";
  return "#E24B4A";
}

function statusColor(status: string) {
  if (status === "processing") return "#4F6EF7";
  if (status === "approved") return "#1D9E75";
  if (status === "blocked") return "#E24B4A";
  return "#EF9F27";
}

function statusLabel(status: string) {
  if (status === "processing") return "Processing";
  if (status === "approved") return "Approved";
  if (status === "blocked") return "Blocked";
  return "Needs review";
}

function formatTavilySignals(rawContext: string): string[] {
  if (!rawContext.trim()) return [];
  return rawContext
    .split("|")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function isQueueData(value: unknown): value is QueueData {
  return (
    typeof value === "object" &&
    value !== null &&
    "stats" in value &&
    "items" in value
  );
}

export default function ReviewQueue() {
  const toolInfo = useToolInfo();
  const { callTool, isPending, data: queueData } =
    useCallTool("get_review_queue");
  const {
    callTool: callResolve,
    isPending: isResolving,
    data: resolveData,
  } = useCallTool("resolve_creative");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [data, setData] = useState<QueueData | null>(null);

  useEffect(() => {
    if (toolInfo?.output && isQueueData(toolInfo.output)) {
      setData(toolInfo.output);
    }
  }, [toolInfo?.output]);

  useEffect(() => {
    if (queueData?.structuredContent && isQueueData(queueData.structuredContent)) {
      setData(queueData.structuredContent);
    }
  }, [queueData]);

  useEffect(() => {
    if (
      resolveData?.structuredContent &&
      isQueueData(resolveData.structuredContent)
    ) {
      setData(resolveData.structuredContent);
      setResolvingId(null);
    }
  }, [resolveData]);

  useEffect(() => {
    void callTool({ filter: "all" });
  }, [callTool]);

  useEffect(() => {
    const interval = setInterval(() => {
      void callTool({ filter: "all" });
    }, 2000);
    return () => clearInterval(interval);
  }, [callTool]);

  function resolve(id: string, decision: "approved" | "blocked") {
    setResolvingId(id);
    void callResolve({ id, decision });
  }

  const stats = data?.stats;
  const items = data?.items ?? [];
  const pendingCount = items.filter(
    (i) =>
      i.status === "processing" ||
      i.status === "pending" ||
      i.status === "escalated",
  ).length;

  return (
    <div
      style={{
        padding: "16px 0",
        fontFamily: "var(--font-sans, system-ui)",
        fontSize: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#D85A30",
            }}
          />
          <span
            style={{
              fontWeight: 500,
              fontSize: 15,
              color: "var(--color-text-primary)",
            }}
          >
            BrandGuard
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
          Live · {pendingCount} need review
          {isPending ? " · refreshing…" : ""}
        </span>
      </div>

      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Scored",
              value: stats.total,
              color: "var(--color-text-primary)",
            },
            { label: "Processing", value: stats.processing, color: "#4F6EF7" },
            { label: "Auto-approved", value: stats.approved, color: "#1D9E75" },
            { label: "Escalated", value: stats.escalated, color: "#BA7517" },
            { label: "Blocked", value: stats.blocked, color: "#E24B4A" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--color-background-secondary)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 13,
            padding: "24px 0",
            textAlign: "center",
          }}
        >
          No creatives scored yet. Use <code>score_creative</code> to submit ad
          copy.
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderLeft: `3px solid ${statusColor(item.status)}`,
            borderRadius: "0 12px 12px 0",
            padding: "14px 16px",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: 13,
                  color: "var(--color-text-primary)",
                }}
              >
                {item.brand} — {item.campaignName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginTop: 2,
                }}
              >
                {item.id} · {item.placementType} · ${item.cpcBid.toFixed(2)}{" "}
                CPC
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 9px",
                borderRadius: 4,
                background:
                  item.status === "processing"
                    ? "#E8ECFF"
                    : item.status === "approved"
                    ? "#E1F5EE"
                    : item.status === "blocked"
                      ? "#FCEBEB"
                      : "#FAEEDA",
                color:
                  item.status === "processing"
                    ? "#2F46B9"
                    : item.status === "approved"
                    ? "#085041"
                    : item.status === "blocked"
                      ? "#A32D2D"
                      : "#633806",
              }}
            >
              {statusLabel(item.status)}
            </span>
          </div>

          <div
            style={{
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--color-text-secondary)",
              background: "var(--color-background-secondary)",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            &ldquo;{item.creativeText}&rdquo;
          </div>

          {[
            { label: "Safety", score: item.safetyScore },
            { label: "Brand fit", score: item.brandFitScore },
          ].map(({ label, score }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  minWidth: 58,
                }}
              >
                {label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 5,
                  background: "var(--color-border-tertiary)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: item.status === "processing" ? "18%" : `${score}%`,
                    height: "100%",
                    background:
                      item.status === "processing" ? "#8FA0FA" : scoreColor(score),
                    borderRadius: 3,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: 28,
                  textAlign: "right",
                  color:
                    item.status === "processing" ? "#4F6EF7" : scoreColor(score),
                }}
              >
                {item.status === "processing" ? "..." : score}
              </span>
            </div>
          ))}

          {item.status === "processing" && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#4F6EF7",
              }}
            >
              Simulating Tavily + scoring pipeline...
            </div>
          )}

          {item.status !== "processing" && item.reasons.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {item.reasons.map((r, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    marginBottom: 3,
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      color:
                        item.status === "blocked" ? "#D85A30" : "#EF9F27",
                    }}
                  >
                    ›
                  </span>
                  {r}
                </div>
              ))}
            </div>
          )}

          {item.status !== "processing" &&
            formatTavilySignals(item.tavilyContext).length > 0 && (
            <div
              style={{
                marginTop: 10,
                borderTop: "0.5px solid var(--color-border-tertiary)",
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginBottom: 4,
                }}
              >
                Tavily context
              </div>
              {formatTavilySignals(item.tavilyContext).map((signal, index) => (
                <div
                  key={`${item.id}-signal-${index}`}
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    marginBottom: 3,
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <span style={{ color: "#7A56CC" }}>•</span>
                  {signal}
                </div>
              ))}
            </div>
          )}

          {(item.status === "pending" || item.status === "escalated") && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => resolve(item.id, "approved")}
                disabled={resolvingId === item.id || isResolving}
                style={{
                  fontSize: 12,
                  padding: "5px 14px",
                  cursor: "pointer",
                  borderRadius: 6,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "transparent",
                  color: "var(--color-text-primary)",
                }}
              >
                {resolvingId === item.id ? "Saving…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => resolve(item.id, "blocked")}
                disabled={resolvingId === item.id || isResolving}
                style={{
                  fontSize: 12,
                  padding: "5px 14px",
                  cursor: "pointer",
                  borderRadius: 6,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "transparent",
                  color: "var(--color-text-primary)",
                }}
              >
                Block
              </button>
            </div>
          )}
        </div>
      ))}

      <div
        style={{
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 8,
          padding: "10px 14px",
          marginTop: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16, color: "#D85A30", flexShrink: 0 }}>↻</span>
        <span
          style={{
            fontSize: 12,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          <strong
            style={{ fontWeight: 500, color: "var(--color-text-primary)" }}
          >
            Overmind optimizer
          </strong>
          {" "}
          — tracing all scoring decisions. Human overrides feed back into
          prompt optimisation. Scoring policy self-improves over time.
        </span>
      </div>
    </div>
  );
}
