# Demo Verification Evidence

Run:

```bash
npm run verify:demo
```

Latest output snapshot:

```text
BrandGuard demo verification (deterministic heuristic mode)
----------------------------------------------------------
Nike      -> status=blocked   safety=32  brandFit=72
Barclays  -> status=escalated safety=42  brandFit=72
Dyson     -> status=approved  safety=78  brandFit=72
----------------------------------------------------------
Queue stats: total=3, approved=1, escalated=1, blocked=1
Verification passed.
```

Notes:
- This script forces `BRANDGUARD_FORCE_HEURISTIC=1` for deterministic behavior.
- It verifies the canonical demo path: block, escalate, approve.
