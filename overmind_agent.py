"""
BrandGuard scoring agent — registered with Overmind for autonomous optimisation.
Overmind will trace runs of this file, score outputs against the eval spec,
and autonomously improve the scoring prompt in scorer.ts.

Run after building the project:
  overmind init
  /overmind-register-agent overmind_agent.py
  /overmind-generate-spec-and-dataset brandguard
  /overmind-optimize-agent brandguard
"""

import json
import os

import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

EVAL_DATASET = [
    {
        "input": {
            "brand": "Nike",
            "creative": "Crush the competition. Dominate every run. Nothing stops you.",
        },
        "expected_status": "blocked",
        "expected_safety_range": [0, 39],
    },
    {
        "input": {
            "brand": "Nike",
            "creative": "Find your pace. Every step forward is progress.",
        },
        "expected_status": "approved",
        "expected_safety_range": [70, 100],
    },
    {
        "input": {
            "brand": "Barclays",
            "creative": "Lock in your mortgage rate before the window closes.",
        },
        "expected_status": "escalated",
        "expected_safety_range": [40, 69],
    },
    {
        "input": {
            "brand": "Barclays",
            "creative": "Explore our range of mortgage options. Talk to an advisor today.",
        },
        "expected_status": "approved",
        "expected_safety_range": [70, 100],
    },
    {
        "input": {
            "brand": "Dyson",
            "creative": "The most powerful cordless vacuum we've ever made.",
        },
        "expected_status": "approved",
        "expected_safety_range": [85, 100],
    },
]

SCORING_SYSTEM_PROMPT = """You are a brand safety compliance officer scoring ad creative copy
for LLM-native placements. Score on SAFETY (0-100) and BRAND FIT (0-100).
≥70 safety = approved. <40 safety = blocked. 40-69 = escalated.
Respond only with JSON: {"safetyScore": N, "brandFitScore": N, "status": "approved|blocked|escalated", "reasons": [...]}"""


def score_creative(brand: str, creative: str) -> dict:
    """Core scoring function — Overmind will trace and optimise this."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system=SCORING_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": f'Brand: {brand}\nCreative: "{creative}"'}
        ],
    )
    return json.loads(response.content[0].text)


def run_eval():
    """Run the eval dataset — used by Overmind to measure accuracy."""
    results = []
    for case in EVAL_DATASET:
        result = score_creative(case["input"]["brand"], case["input"]["creative"])
        score = result.get("safetyScore", 0)
        low, high = case["expected_safety_range"]
        passed = low <= score <= high
        results.append(
            {
                "brand": case["input"]["brand"],
                "creative": case["input"]["creative"][:50],
                "expected": case["expected_status"],
                "got": result.get("status"),
                "safetyScore": score,
                "passed": passed,
            }
        )
        print(
            f"{'✓' if passed else '✗'} {case['input']['brand']}: score={score}, status={result.get('status')}"
        )

    accuracy = sum(1 for r in results if r["passed"]) / len(results)
    print(
        f"\nAccuracy: {accuracy:.0%} ({sum(1 for r in results if r['passed'])}/{len(results)})"
    )
    return results


if __name__ == "__main__":
    run_eval()
