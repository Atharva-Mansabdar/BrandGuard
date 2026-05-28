# BrandGuard — Product Requirements Document

**Autonomous Brand Safety for LLM-Native Ad Placements**
*v1.0 — 28 May 2026 — CONFIDENTIAL*

---

| | |
|---|---|
| **Hackathon** | Cursor × Thrad — London 2026 |
| **Track** | Buy-Side Agents (primary) + Sell-Side Measurement (secondary) |
| **Built with** | Cursor, Overmind, Tavily, Skybridge, Alpic |
| **Status** | MVP — built in one hackathon session |
| **Judges targeted** | Rohit Gupta (Overmind), Giorgio Toledo (Thrad), Will Lewis (Duku AI), David Gelberg (No. 10), Umberto Belluzzo (Earlybird), John Sergeant (Strand Ventures), Pritam Soni (Overmind) |

---

## 1. Executive Summary

In January 2026, OpenAI switched on ads inside ChatGPT at $3–5 CPC, with Fortune 500 brands live on day one. Anthropic responded with Super Bowl spots positioning Claude as ad-free. Thrad co-hosts this hackathon as the real-time bidding layer already powering paid placements in LLMs.

One problem has not been solved: DoubleVerify and IAS score webpages. Nobody scores ad creative copy itself before it enters a chat-native placement. That is a fundamentally different problem — and it is the gap BrandGuard fills.

> **One-line pitch:** BrandGuard is the missing pre-bid creative safety layer for LLM-native ad placements — scoring copy, surfacing regulatory risk via live web search, and gating on human judgement before any creative ships.

---

## 2. Problem

### 2.1 The existing tools are structurally wrong for chat

DoubleVerify and IAS were built for static webpages. Their core mechanism — keyword blocklists — is being publicly deprecated as of 2026. They score the environment (is this page safe?) not the creative (is this copy safe to say?). In a chat interface, the ad appears inside a response users treat as authoritative. Adjacency becomes perceived endorsement.

The failures are documented. Adalytics found Fortune 500 ads running on sites flagged for hosting child abuse material while rated brand-safe by IAS. US senators wrote to both company CEOs in February 2025. DoubleVerify responded that the results were "entirely manufactured" — and no customer had ever raised concerns. Both responses became evidence of the problem.

### 2.2 Keyword blocklists are broken by design

Research found that the word "black" appeared on standard blocklists even though it was present in genuinely unsafe content only 1% of the time. Terms like "Latino" and "immigrant" appeared as accumulated defaults. A 2025 audit found newspaper impressions misclassified because legacy keyword engines cannot understand context. Keyword blocking demonetised more than half of Reuters' brand-safe stories.

### 2.3 Chat ads are a fundamentally different surface

ChatGPT ads appear alongside dynamically generated conversational content that can shift topics, tone, and emotional register within a single session. Standard keyword exclusion is insufficient because sensitive conversations often do not contain obvious red-flag keywords. LLM responses have no identifiable authorship and no clear provenance. When a model produces an inaccurate answer, the risk for advertisers is not adjacency to bad content — it is that a nearby brand appears to endorse the hallucination.

> **The gap in one sentence:** All existing tools operate on the environment or the output. Nobody operates on the creative copy itself, at the point of placement, before the bid fires.

---

## 3. Market Context

### 3.1 Competitive landscape

| Company | What they score | Surface | Gap vs BrandGuard |
|---|---|---|---|
| DoubleVerify | Webpage environment | Post-bid measurement | Scores the page, not the copy; no chat surface support |
| IAS | Webpage environment | Pre-bid & post-bid | Same structural gap; keyword blocklists being deprecated |
| Scope3 Brand Standards | Inventory environment | Pre-bid inventory scoring | Evaluates placement context, not creative copy text |
| Brandlight, Otterly | Brand mentions in LLM responses | Post-hoc monitoring | Audits after the fact; no pre-bid gate |
| **BrandGuard** | **Creative copy text** | **Pre-bid, chat-native** | **The only tool operating on copy, at placement, in a chat-native MCP surface** |

### 3.2 Market signals

OpenAI ChatGPT ads launched January 2026. Over 600 advertisers joined the pilot by end of March 2026. CPC bids of $3–5, Expedia and Best Buy live on day one. Anthropic responded with Super Bowl spots saying ads are coming to AI, but not to Claude. US ad spending projected at $26 billion in AI search advertising by 2029 (eMarketer). 83% of US digital media experts say brand safety will be an increasing concern as LLM ad volume grows. 76% of enterprises now require human-in-the-loop processes for AI content decisions.

The infrastructure for this market does not exist yet. Woodside Capital Partners identifies brand safety, ad serving, measurement, attribution, and content verification as the required build-out — with the same build-versus-buy pressure that led Google to acquire DoubleClick for $3.1B, but faster.

---

## 4. Product Overview

### 4.1 What BrandGuard does

An advertiser or agency submits ad creative copy with a brand name. BrandGuard:

- Retrieves live regulatory and brand safety signals via Tavily web search (ASA, FCA, competitor complaints)
- Scores the creative on two dimensions: Safety (0–100) and Brand Fit (0–100) using a Claude LLM scorer
- Auto-approves scores ≥70, auto-blocks scores <40, and escalates 40–69 to a human reviewer
- Renders a real-time review queue dashboard inside Claude or ChatGPT via a Skybridge MCP tool
- Logs every decision as a trace in Overmind, which autonomously optimises the scoring prompt against human override patterns

### 4.2 The human-in-the-loop design

Both hackathon tracks explicitly ask: when can the agent commit alone, and when must a human sign off? BrandGuard makes this explicit by design. The policy gate is not a dial — it is a hard threshold. The human review queue is the product, not a fallback. Reviewers see the creative text, both scores, the exact reason list from Tavily and the LLM, and two buttons: Approve or Block. No ambiguity about what shipped and who authorised it.

---

## 5. Technical Architecture

### 5.1 Stack

| Layer | Technology | Role in product |
|---|---|---|
| MCP server + UI | Skybridge (TypeScript) | MCP tool definitions, React review queue view, works inside Claude & ChatGPT |
| Search enrichment | Tavily API (`@tavily/core`) | Live regulatory context, brand complaint history, competitor signals per creative |
| Scoring LLM | Anthropic Claude Sonnet 4 | Safety + brand fit scoring against policy + Tavily context; returns structured JSON |
| Agent tracing | Overmind JS tracing adapter (`src/lib/overmind.ts`) | Initializes Overmind tracing when configured; degrades safely if SDK/runtime support is unavailable |
| Agent optimisation | Overmind Python CLI + `overmind_agent.py` | Autonomous scoring prompt improvement against eval dataset; run via Cursor slash commands |
| Deployment | Alpic (`alpic deploy` + `alpic audit`) | Stable public HTTPS MCP endpoint; Beacon compliance audit for Claude.ai & ChatGPT compatibility |
| IDE + code generation | Cursor Composer 2.5 | Full codebase scaffolded; Overmind slash commands generated via `overmind init` when needed |

### 5.2 Data flow

1. Creative submitted via MCP tool (`score_creative`) from Claude or ChatGPT chat
2. Two parallel Tavily searches fire: regulatory context for the industry, brand complaint history
3. Enrichment + policy fed into Claude scorer; structured JSON response returned
4. Policy gate: ≥70 auto-approve, <40 auto-block, 40–69 add to human review queue
5. Overmind tracing is initialized at startup and `score_creative` runs through the tracing adapter when available
6. Review queue renders as Skybridge React view inside the chat interface
7. Overmind Python optimiser analyses traces and human overrides; rewrites scoring prompt if accuracy improves

### 5.3 MCP tools exposed

- `score_creative` — Submit creative copy for scoring. Returns safety score, brand fit score, reasons, and queue item ID.
- `get_review_queue` — Returns current queue with stats. Renders the full React dashboard view.
- `resolve_creative` — Human reviewer approves or blocks a queued item by ID.

### 5.4 Integration: connecting the tools

#### Overmind (JS tracing)

Install an Overmind JS tracing SDK and initialize through `src/lib/overmind.ts`. The adapter enables tracing when `OVERMIND_API_KEY` and SDK compatibility are present, and logs explicit fallback when tracing is unavailable so scoring still proceeds.

#### Overmind (Python optimiser + Cursor)

Install the CLI: `pip install overmind`. Run `overmind init` from the project root, selecting Cursor as the IDE. This writes slash-command skill files into `.cursor/skills/`. Then in the Cursor chat panel, run `/overmind-register-agent`, `/overmind-generate-spec-and-dataset`, and `/overmind-optimize-agent` in sequence.

#### Tavily

Install `@tavily/core`. Initialise with `tavily({ apiKey: process.env.TAVILY_API_KEY })`. Two parallel `client.search()` calls per creative: one for regulatory context, one for brand complaint history. Results injected as grounding context into the scoring prompt.

#### Alpic

For development: `pnpm dev --tunnel` (Skybridge calls Alpic automatically; outputs a public HTTPS MCP URL). For demo stability: `alpic deploy --project-name brandguard --runtime node24 --env-file .env`. Verify: `alpic audit --url https://brandguard.alpic.live/mcp`.

---

## 6. Scoring Model

### 6.1 Two-dimension scoring

| Safety score | Range | Action | Who resolves |
|---|---|---|---|
| Clean | ≥70 | Auto-approve | Agent |
| Ambiguous | 40–69 | Human review queue | Human reviewer |
| Violation | <40 | Auto-block | Agent (human can override) |

### 6.2 Hard policy rules (non-overridable by LLM)

- Financial services + urgency language ("lock in now", "rates dropping", "before it's too late") → automatic score ≤45 (FCA CONC financial promotion rules)
- Any brand + competitor aggression ("crush", "dominate", "destroy" as competitive verbs) → automatic score ≤35
- These rules are encoded in the system prompt and confirmed by Tavily regulatory lookups

### 6.3 Brand policies included in MVP

- **Nike** — sportswear, ASA CAP Code section 15, tone: inspirational/inclusive, escalation words: crush, dominate, destroy, kill, annihilate
- **Barclays** — financial services, FCA CONC rules, tone: professional/transparent, escalation words: guaranteed, risk-free, lock in now, window closes
- **Dyson** — consumer electronics, ASA comparative advertising, tone: engineering-led/factual, escalation words: cures, eliminates all, scientifically proven

---

## 7. Demo Structure (5 minutes)

| Time | Beat | What happens | Judges targeted |
|---|---|---|---|
| 0:00–0:45 | The problem | Verbal only. DV scores pages. Nobody scores copy. Senators wrote to both CEOs. $1 trillion market, no infrastructure. | Giorgio, Umberto |
| 0:45–1:15 | Open the product | Claude.ai open with BrandGuard MCP connected. Show Alpic dashboard + Beacon green tick. Type "show me the review queue" — Skybridge view renders inline. | Will, John |
| 1:15–2:30 | The block | Score Nike "Crush the competition". Narrate Tavily firing live. Score 18, red card, auto-blocked. Show Tavily context inline. | Rohit, Pritam, Giorgio |
| 2:30–3:30 | The escalation + Overmind | Score Barclays mortgage copy. Score 61, amber card, human queue. Human clicks Approve. Switch to Cursor — show Overmind console: prompt rewritten, accuracy +6%. | Rohit, Pritam, David |
| 3:30–4:00 | The approval | Score Dyson. Score 94, green, auto-approved. Silence. Then: "show me the queue" — all three cards, stats row updated. | All judges |
| 4:00–5:00 | The close | DV scores pages. Scope3 scores inventory. Nobody scores copy before chat placement. Senators, $1T market, no infrastructure. BrandGuard is the layer. Built today. | Rohit, Giorgio, Umberto, David |

---

## 8. Bonus Prize Strategy

| Prize | What we show | Proof point |
|---|---|---|
| Best Overmind | Tracing adapter enabled for scoring runs. Python optimiser loop running against eval dataset. Scoring prompt rewritten. Accuracy delta on screen. | `console.overmindlab.ai` showing live traces + score history during Beat 4 |
| Best Tavily | Two parallel Tavily searches per creative. Results shown inline as reasons. Regulatory context self-updates without code changes. | Tavily context visible in the review card reasons list during Beat 3 |
| Best Cursor | Entire codebase scaffolded with Composer 2.5. Overmind skills installed as `.cursor/skills/` slash commands. Optimiser run from Cursor chat panel. | Show Cursor with `.cursor/skills/` directory and Overmind console during Beat 4 |
| Best Alpic | MCP server deployed on Alpic. Beacon audit passing. Stable public endpoint connected to Claude.ai. | Alpic dashboard with green Beacon tick shown during Beat 2 (10 seconds) |

---

## 9. Codebase Structure

```
brandguard/
├── src/
│   ├── server.ts             ← Skybridge McpServer entry point
│   ├── store.ts              ← in-memory queue state
│   ├── tools/
│   │   ├── score-creative.ts ← main MCP tool
│   │   └── get-queue.ts      ← queue + resolve tools
│   ├── lib/
│   │   ├── tavily.ts         ← enrichment (two parallel searches)
│   │   ├── scorer.ts         ← Claude scoring prompt + call
│   │   ├── policy.ts         ← brand policy store (Nike, Barclays, Dyson)
│   │   └── overmind.ts       ← Overmind tracing init + span wrapper
│   └── views/
│       └── review-queue.tsx  ← Skybridge React dashboard view
├── overmind_agent.py         ← Python agent registered with Overmind CLI
├── .env                      ← ANTHROPIC_API_KEY, TAVILY_API_KEY, OVERMIND_API_KEY
├── .overmind/                ← generated by `overmind init` (optional)
└── .cursor/skills/           ← generated by `overmind init` (optional)
```

---

## 10. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tavily call times out during demo | Medium — network dependent | Score still returns without context. Say "Tavily enrichment is async — context arrives on next cycle." Demo continues. |
| Overmind optimiser hasn't run yet | Low if run before demo | Run `python overmind_agent.py` before the session. Confirm accuracy printed to terminal. Screenshot the output as backup. |
| Alpic tunnel URL changes | None if using `alpic deploy` | Use `alpic deploy` for a stable permanent URL before the demo. Reconnect Claude.ai to the deploy URL, not the tunnel URL. |
| Skybridge `registerTool` API mismatch | Low — docs-confirmed pattern | If Composer errors on `server/index.ts`, tell it to check `node_modules/skybridge/README.md` and adjust. Core pattern (McpServer, registerTool, view component) will be correct. |

---

## 11. Judge Resonance Map

| Judge | Background | Why BrandGuard lands |
|---|---|---|
| Rohit Gupta | Founding Engineer, Overmind; ex-PremAI Technical Lead | Uses Overmind correctly end-to-end: JS tracing, Python optimiser, Cursor skills. He built OverClaw — this is the same architecture applied to a real commercial problem. |
| Pritam Soni | Overmind | Same Overmind angle. Self-optimising scoring prompt via human override feedback is exactly what Overmind is designed to do. |
| Giorgio Toledo | COO, Thrad (building the ad exchange for AI) | BrandGuard is direct infrastructure for the Thrad use case. Pre-bid creative safety is exactly the layer Thrad's customers need between creative submission and placement. Giorgio understands the commercial gap immediately. |
| David Gelberg | AI Innovation Fellow, 10 Downing Street | Policy framing: senators wrote to DV and IAS, IAB released AI Transparency Framework in Jan 2026, FCA financial promotion rules already apply. Human-in-the-loop with audit trail is the regulatory ask made visible. |
| Umberto Belluzzo | Investor, Earlybird Venture Capital | Market size ($1.1T global ad spend, $26B projected AI search ads by 2029). Clear gap vs incumbents. Woodside Capital already naming this as the DoubleClick moment for LLMs. Investable framing. |
| Will Lewis | Co-founder/CTO, Duku AI; ex-Meta Engineering Manager (5 years) | Production-grade TypeScript, proper Skybridge architecture, separation of concerns, real tracing. Speaks the language of someone who ran engineering at scale. |
| John Sergeant | Founder & GP, Strand Ventures (student-run VC, UK) | The 30-second pitch is clear, the differentiation from incumbents is sharp. Student VC thinks about deals. This is a deal. |

---

*BrandGuard — Cursor × Thrad Hackathon, London, 28 May 2026*
*Built with Cursor Composer 2.5, Overmind, Tavily, Skybridge, and Alpic.*