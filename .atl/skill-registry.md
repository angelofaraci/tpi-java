# Skill Registry — tpi-java

Auto-generated skill index for orchestrator context injection.  
**Last updated**: 2026-04-10

## User Skills

| Name | Trigger |
|------|---------|
| branch-pr | PR creation workflow for Agent Teams Lite following the issue-first enforcement system. Trigger: When creating a pull request, opening a PR, or preparing changes for review. |
| go-testing | Go testing patterns for Gentleman.Dots, including Bubbletea TUI testing. Trigger: When writing Go tests, using teatest, or adding test coverage. |
| issue-creation | Issue creation workflow for Agent Teams Lite following the issue-first enforcement system. Trigger: When creating a GitHub issue, reporting a bug, or requesting a feature. |
| judgment-day | Parallel adversarial review protocol that launches two independent blind judge sub-agents simultaneously to review the same target, synthesizes their findings, applies fixes, and re-judges until both pass or escalates after 2 iterations. Trigger: When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen". |
| skill-creator | Creates new AI agent skills following the Agent Skills spec. Trigger: When user asks to create a new skill, add agent instructions, or document patterns for AI. |
| skill-registry | Create or update the skill registry for the current project. Scans user skills and project conventions, writes .atl/skill-registry.md, and saves to engram if available. Trigger: When user says "update skills", "skill registry", "actualizar skills", "update registry", or after installing/removing skills. |

## Project Conventions

No project-level convention files found (AGENTS.md, CLAUDE.md, .cursorrules, etc.).

## Compact Rules

_Skills define their own compact rules sections. The orchestrator extracts and injects them based on file context and task type._

---

**Usage**: The orchestrator reads this registry at session start, caches it, and injects relevant compact rules into sub-agent prompts. If the cache is lost (e.g., after compaction), the orchestrator re-reads this file.

**Maintenance**: Re-run `sdd-init` or manually update this file when skills are added/removed.
