---
name: flow-harness
description: Use when the user asks for AIJOB or ingkle Flow Harness, requirement-first job intake, 업무 Flow Harness, Jira or Confluence trace, or wants M+ work normalized into requirement cards, work definitions, verification records, result reports, and ticket comments from Codex or OMX.
metadata:
  short-description: AIJOB requirement-to-report workflow harness
---

# AIJOB Flow Harness for Codex/OMX

Apply the AIJOB requirement-first work harness from Codex or OMX without importing Claude-only runtime state.

## When to use

Use this for:
- Explicit `$flow-harness`, `flow-harness`, `AIJOB Flow Harness`, `ingkle harness`, or `업무 Flow Harness` requests.
- M+ work where requirements, scope, verification, reporting, and ticket/document trace matter.
- Work with external team, operations, Jira, Confluence, release, QA, or audit impact.
- Converting a loose request into a Director-ready brief, plan input, or execution handoff.

Skip the full harness for S tasks, but still state acceptance criteria and verification evidence before claiming completion.

## Authority and safety

- Codex/OMX system, developer, `AGENTS.md`, and active skills remain authoritative.
- Treat `~/.claude` files as source references only; do not copy secrets, sessions, cache, history, credentials, or raw logs.
- Do not mutate Jira/Confluence/production unless the active environment has authority and the action is requested or clearly part of the accepted workflow.
- Prefer Paperclip for coordination when available and appropriate; otherwise report the intended ticket/comment content for the user or the active integration.

## Core workflow

1. **Classify size and impact**
   - S: single file/system, low external impact. Use short requirement + verification notes.
   - M+: multiple files/systems, external team/ops/review impact, or unclear requirement. Run the full harness.

2. **Create or update a Requirement Card**
   Include requester, background, desired final state, include/exclude scope, constraints, acceptance criteria, verification evidence, dependencies, branch points, tools/channels, stakeholders/reviewers.

3. **Write a Work Definition draft for M+ work**
   Use `references/flow-harness-templates.md` when a durable artifact is needed. Required sections: background, goal, scope, flow, tools/channels, roles/review, acceptance criteria, verification/observability, reporting, risks/rollback.

4. **Choose the Codex/OMX lane**
   - Requirements unclear: use `$deep-interview` or ask one concise question.
   - Plan/tradeoff/test shape needed: use `$plan` or `$ralplan`.
   - Single-owner implementation loop: use `$ralph` after the harness brief/plan is ready.
   - Coordinated parallel execution: use `$team` when the work is already decomposed and staged coordination is worth it.
   - Repo lookup only: use `omx explore --prompt ...` when available.

5. **Execute with trace**
   During execution, record pivots, rejected options, tool/channel choices, risk changes, and evidence. For ticketed work, collect comment text at major reporting moments: start, requirement confirmation, tool/flow choice, major action, pivot, testing, result, review handoff.

6. **Record implementation test results**
   Include strategy, environment, command/method, time if relevant, pass/fail evidence, feedback, `Tested`, `Not-tested`, retry needs, and final verdict.

7. **Write final result report for M+ work**
   Include one-line conclusion, performed work, requirement-by-requirement result, evidence links, feedback handling, final state (`complete`, `partial`, `blocked`, `failed`, `pivot needed`), risks, follow-ups, and ticket/document/PR/monitor links.

## Output contract

For full harness work, final response should be concise and include:
- Requirement/work definition artifact path or inline summary.
- Test record path or verification evidence.
- Result report path or final verdict.
- Ticket/comment/status handling result.
- Remaining risks and follow-ups.

## References

- `references/flow-harness-policy.md` — full AIJOB policy copied from `origin/ingkle`.
- `references/flow-harness-templates.md` — requirement card, work definition, test record, result report, and ticket comment templates.
- `references/claude-flow-harness-command.md` — original Claude slash-command procedure for traceability.
