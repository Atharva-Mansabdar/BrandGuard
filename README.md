# BrandGuard

Autonomous brand safety agent for LLM-native ad placements. Score ad creative before it appears inside ChatGPT, Claude, or similar surfaces — enriched with Tavily web intelligence, traced by Overmind, and reviewed in a Skybridge MCP dashboard.

Built for Cursor AdTech Hackathon 2026.

## Stack

- **Skybridge** — MCP server + inline React review queue
- **Anthropic Claude** — creative scoring
- **Tavily** — live regulatory / brand-safety context
- **Overmind** — agent tracing and prompt optimisation (`overmind_agent.py`)
- **Alpic** — tunnel + deploy (`npm run dev:tunnel`)

## Setup

```bash
cp .env.example .env
# Add ANTHROPIC_API_KEY and TAVILY_API_KEY (optional: OVERMIND_API_KEY)
npm install
```

## Run locally

```bash
npm run dev
```

Public tunnel for Claude / ChatGPT MCP:

```bash
npm run dev:tunnel
```

Connect the printed `/mcp` URL in Claude → Settings → Integrations → Add MCP server (name: **BrandGuard**).

## MCP tools

| Tool | Purpose |
|------|---------|
| `score_creative` | Score copy for Nike, Barclays, or Dyson; auto-approve/block or escalate |
| `get_review_queue` | List queue + stats |
| `resolve_creative` | Human approve/block (`CRE-001`, etc.) |

## Demo prompts

```
Score this Nike creative for brand safety:
Brand: Nike
Campaign: Summer Drop 2026
Creative: "Crush the competition. Dominate every run. Nothing beats Nike."
Placement: ChatGPT
CPC: 3.20
```

```
Score this Barclays creative:
Brand: Barclays
Campaign: Mortgage Q3
Creative: "Rates are dropping fast. Lock in now before the window closes."
Placement: Claude
CPC: 4.80
```

```
Show me the review queue
```

## Overmind

```bash
# In Cursor with Overmind extension:
# /overmind-register-agent overmind_agent.py
# /overmind-generate-spec-and-dataset brandguard
# /overmind-optimize-agent brandguard
```

## Supported brands

Nike, Barclays, Dyson — extend policies in `src/lib/policy.ts`.

Without API keys, scoring falls back to keyword heuristics so the UI still demos.
