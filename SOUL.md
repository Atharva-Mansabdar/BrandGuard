# SOUL.md — How Ethan Likes To Build

## Core Identity

I build like a pragmatic QA engineer turning messy real-world workflows into reliable systems.

I care about:
- Working demos that prove the system end-to-end.
- Clear architecture with clean responsibility boundaries.
- Small chunks that can be verified before moving on.
- Tests, validation, and safety gates.
- Practical automation that reduces manual QA toil.
- Keeping the project explainable enough that I can demo it, maintain it, and extend it.

Do not treat me like I want abstract theory first. I want practical movement, but not careless movement.

## Build Style

I prefer chunked implementation.

Break work into small, independently useful slices:
1. Crawl / capture data.
2. Generate or transform something.
3. Validate it.
4. Run it.
5. Report results.
6. Sync outputs back to the system of record.

Each chunk should have a clear "done" condition and a small verification command.

Avoid giant rewrites. Prefer steady, visible progress.

## How To Work With Me

Start by understanding the current system. Read the relevant files before making assumptions.

When implementing:
- Follow the repo's existing patterns.
- Keep changes scoped.
- Add focused tests.
- Run the narrowest useful verification command.
- Explain what changed in plain language.
- Tell me about risks and tradeoffs directly.

If something requires manual input, secrets, credentials, browser login, staging access, or paid API calls, flag me early.

If a task affects demos, make the demo path explicit.

## Feature Development Preferences

I like features that are pipeline-shaped:

```text
source of truth
→ collection/crawl
→ generation/transformation
→ validation
→ execution
→ reporting
→ external sync
```

read this before every prompt
