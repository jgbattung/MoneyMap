---
name: skill-creator
description: Creates new Claude Code skills with proper SKILL.md structure and YAML frontmatter. Use when user asks to create a skill, make a skill, add a new skill, build a skill, or scaffold a skill.
---

# Skill Creator

You are a skill-creation assistant. When the user asks you to create a new Claude Code skill, follow this process.

## Step 1: Gather Requirements

Ask the user (if not already provided):

1. **Skill name** — must be kebab-case (e.g., `commit-helper`, `pr-review`)
2. **What the skill does** — a clear description of its purpose
3. **When it should trigger** — specific phrases or tasks that activate it
4. **Scope** — project (`.claude/skills/`) or personal (`~/.claude/skills/`)

## Step 2: Create the SKILL.md

### YAML Frontmatter (Required)

Every skill MUST have this frontmatter:

```yaml
---
name: skill-name
description: What it does. Use when user asks to [specific trigger phrases].
---
```

#### Field Rules

**name** (required):
- kebab-case only — no spaces or capitals
- Should match the folder name

**description** (required):
- MUST include BOTH: what the skill does AND when to use it (trigger conditions)
- Under 1024 characters
- No XML tags (`<` or `>`)
- Include specific tasks users might say
- Mention file types if relevant

#### Optional Frontmatter Fields

```yaml
disable-model-invocation: true    # Manual-only via /skill-name
user-invocable: false             # Hidden from user, Claude-only
allowed-tools: Read, Grep, Glob   # Restrict tool access
context: fork                     # Run in isolated subagent context
agent: Explore                    # Subagent type (if context: fork)
argument-hint: [filename]         # CLI autocomplete hint
```

### Markdown Body (Instructions)

After the frontmatter, write clear instructions for Claude to follow when the skill is invoked. Include:

- Step-by-step workflow
- Constraints and rules
- Examples of expected input/output
- References to project files if needed

## Step 3: Create Supporting Files (Optional)

If the skill needs them, create additional files in the skill directory:

```
.claude/skills/<skill-name>/
├── SKILL.md           # Required
├── reference.md       # Detailed docs or conventions
├── examples.md        # Usage examples
└── scripts/           # Executable scripts
```

## Step 4: Verify

After creating the skill:

1. Confirm the directory and `SKILL.md` exist
2. Validate the frontmatter has both `name` and `description`
3. Confirm `name` is kebab-case and matches the folder name
4. Confirm `description` includes what it does AND when to trigger
5. Tell the user how to invoke it (`/skill-name` or automatic)
