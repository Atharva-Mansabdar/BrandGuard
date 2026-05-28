# Demo Verification Evidence

Run:

```bash
npm run verify:demo
```

Latest output snapshot:

```text
BrandGuard demo verification
==========================================================
Deterministic status check
----------------------------------------------------------
Nike      -> status=blocked   safety=32  brandFit=72
Barclays  -> status=escalated safety=42  brandFit=72
Dyson     -> status=approved  safety=78  brandFit=72
Queue stats: total=3, processing=0, approved=1, escalated=1, blocked=1
----------------------------------------------------------
Processing lifecycle check
----------------------------------------------------------
Immediate queue state includes processing item
Post-delay status=pending, safety=42
----------------------------------------------------------
Influx simulation check
----------------------------------------------------------
[BrandGuard Demo] Influx loop started (every 90ms, max=4)
[BrandGuard Demo] Influx max reached, stopping loop
Influx submitted=4, total=4, processing=0
----------------------------------------------------------
Final queue stats: total=4, processing=0, approved=2, escalated=1, blocked=1
Verification passed.
```

Notes:
- The script forces deterministic scoring (`BRANDGUARD_FORCE_HEURISTIC=1`).
- It verifies three layers: baseline statuses, visible `processing` lifecycle, and capped high-throughput influx behavior.
