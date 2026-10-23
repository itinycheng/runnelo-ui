# Lessons from reviewed work

Read this before changing code. Record rules learned from actual owner
review, incidents, or rework. This is not a changelog, task list, or agent
diary. Do not add lessons about hypothetical risks.

Each entry states a rule, what happened, and evidence such as a commit,
test, or review comment:

```markdown
## YYYY-MM-DD — Short description

**Rule:** What the next change should check or do.

**Why:** The concrete failure and affected behavior.

**Evidence:** A commit, test, or review reference.
```

When a general lesson recurs across separate changes, move its rule into
[code standards](docs/code-standards.md) or [AGENTS.md](AGENTS.md). Git
history preserves the specific incident without duplicating promoted rules.

No reusable lessons have been recorded yet.
