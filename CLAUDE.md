# Vault Commander

Raycast extension providing a **speed layer** over Obsidian vault. Four commands replace 80% of "open Obsidian to do a quick thing" moments.

**This is Phase 1 of 5** - designed for extensibility.

## Commands

| Command | Purpose | File |
|---------|---------|------|
| `vault capture` | Quick capture to atomic inbox notes | `src/capture.tsx` |
| `vault today` | Open/create today's daily note | `src/today.tsx` |
| `vault add` | Append to daily note section | `src/add.tsx` |
| `vault search` | Fuzzy search entire vault | `src/search.tsx` |

## Tech Stack

- **Framework**: Raycast Extension API (React + TypeScript)
- **Runtime**: Node.js 22.14+ (Bun not supported by Raycast)
- **Package Manager**: pnpm with `node-linker=hoisted` in `.npmrc`
- **Dependencies**: `@raycast/api`, `dayjs`, `fuse.js`

## Project Structure

```
vault-commander/
├── src/
│   ├── capture.tsx       # Command 1: Quick capture form
│   ├── today.tsx         # Command 2: Open daily note
│   ├── add.tsx           # Command 3: Section append form
│   ├── search.tsx        # Command 4: Fuzzy search list
│   ├── lib/
│   │   ├── config.ts     # Config loading, ~ expansion
│   │   ├── vault.ts      # File operations, Obsidian URI
│   │   ├── daily.ts      # Daily note utilities
│   │   └── search.ts     # fuse.js index builder
│   └── types.ts          # TypeScript interfaces
├── assets/
│   └── icon.png          # Extension icon
├── package.json          # Commands defined here
├── .npmrc                # node-linker=hoisted
└── CLAUDE.md             # This file
```

## Key Patterns

### Atomic Captures (Zettelkasten-style)
Each capture creates a new file in `Inbox/` with backlink to daily note:
```markdown
[[2026-01-07-Wed]] - 2:35pm

Your captured thought here
```
File: `Inbox/capture-2026-01-07-143521.md`

### Daily Note Format
- **Path**: `Journal/Daily/YYYY-MM-DD-ddd.md` (e.g., `2026-01-07-Wed.md`)
- **Template**: 7 sections (Schedule, Tasks, Running, Meeting Notes, Voice Notes, Notes, Evening Review)
- **No H1 header** - filename shows in Obsidian tab

### Section Append
Find H2 header, insert content directly below:
```typescript
const sectionHeader = `## ${section}`;
const headerIndex = content.indexOf(sectionHeader);
// Insert after header, before next section or EOF
```

### Obsidian URI
```typescript
const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
```

## Extensibility (Future Phases)

This is Phase 1. Design for future phases:

| Phase | Adds | Reuses from Phase 1 |
|-------|------|---------------------|
| v0.2 Claude | `vault ask`, `vault summarize` | `search.ts` index builder |
| v0.3 Todoist | `vault task`, `vault inbox` | `config.ts` (add API keys) |
| v0.4 Voice | Superwhisper pipeline | `vault.ts` file operations |
| v1.0 Unified | Smart capture, daily brief | Everything composable |

### Export Requirements

- **config.ts**: Export `getConfig()` and `VaultCommanderConfig` type
- **search.ts**: Export `buildSearchIndex()` for Phase 2 Claude queries
- **vault.ts**: Keep generic - `writeFile`, `ensureDirectory`, `readFile`
- **daily.ts**: Export `getDailyNoteTemplate()` separately from creation

## Raycast API Patterns

### Form with TextArea (capture, add)
```typescript
import { Action, ActionPanel, Form, showHUD, popToRoot } from "@raycast/api";

export default function Command() {
  async function handleSubmit(values: { content: string }) {
    // Process capture...
    await showHUD("Captured to Inbox");
    popToRoot();
  }

  return (
    <Form actions={<ActionPanel><Action.SubmitForm onSubmit={handleSubmit} /></ActionPanel>}>
      <Form.TextArea id="content" title="Capture" placeholder="What's on your mind?" />
    </Form>
  );
}
```

### List with Search (search)
```typescript
import { List, Action, ActionPanel } from "@raycast/api";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search vault...">
      {results.map((item) => (
        <List.Item
          key={item.path}
          title={item.filename}
          subtitle={item.preview}
          actions={
            <ActionPanel>
              <Action.Open title="Open in Obsidian" target={item.uri} />
              <Action.CopyToClipboard title="Copy Wikilink" content={`[[${item.filename}]]`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### Preferences
```typescript
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  vaultPath: string;
}

const prefs = getPreferenceValues<Preferences>();
```

## Vault Integration

- **Vault Path**: `~/vault` (configurable via Raycast preferences)
- **Daily Notes**: `Journal/Daily/YYYY-MM-DD-ddd.md`
- **Captures**: `Inbox/capture-YYYY-MM-DD-HHmmss.md`
- **Obsidian JSON**: `~/Library/Application Support/obsidian/obsidian.json` (vault discovery)

## Config Schema

```typescript
interface VaultCommanderConfig {
  // Phase 1 - Core
  vaultPath: string;
  dailyNotePath: string;       // "Journal/Daily"
  dailyNoteFormat: string;     // "YYYY-MM-DD-ddd"
  inboxPath: string;           // "Inbox"
  sections: {
    schedule: string;          // "## Schedule"
    tasks: string;             // "## Tasks"
    running: string;           // "## Running"
    meetingNotes: string;      // "## Meeting Notes"
    voiceNotes: string;        // "## Voice Notes"
    notes: string;             // "## Notes"
    eveningReview: string;     // "## Evening Review"
  };

  // Phase 2+ (optional, added later)
  claudeApiKey?: string;
  todoistApiKey?: string;
}
```

## Development

### Quick Start
```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm run dev
```

### Scripts

| Script | Tool | Purpose |
|--------|------|---------|
| `pnpm run dev` | Raycast | Hot reload development |
| `pnpm run build` | Raycast | Production build |
| `pnpm run check` | Biome | **Use this!** Format + lint + organize imports |
| `pnpm run format` | Biome | Format only |
| `pnpm run lint` | Biome | Lint only |
| `pnpm run lint:ray` | Raycast ESLint | Publishing compatibility check |

### Tooling

| Tool | Purpose | Config | Speed |
|------|---------|--------|-------|
| **Biome** | Format + lint (replaces Prettier + ESLint) | `biome.json` | ~25x faster |
| **TypeScript** | Type checking | `tsconfig.json` | - |
| **Raycast ESLint** | Publishing compatibility | built-in | - |

## Git Workflow

### First Time Setup
```bash
# Set personal email for this repo
git config user.email shanebarringer@gmail.com

# Or use the alias
gitMeHome
```

### Pre-commit Hook
A pre-commit hook is installed at `.git/hooks/pre-commit` that automatically runs:
```bash
pnpm run check  # Biome format + lint + organize imports
```

**If commit fails:** Fix the issues Biome reports, then commit again.

### Commit Process
```bash
# 1. Stage your changes
git add .

# 2. Commit (pre-commit hook runs automatically)
git commit -m "feat: add capture command"

# If hook fails, fix issues and retry:
pnpm run check
git add .
git commit -m "feat: add capture command"
```

### Commit Message Format
```
type: description

# Types:
# feat:     New feature
# fix:      Bug fix
# refactor: Code change that neither fixes a bug nor adds a feature
# docs:     Documentation only
# chore:    Build process, dependencies, etc.
```

Examples:
- `feat: add vault capture command`
- `fix: handle missing daily note gracefully`
- `refactor: extract file operations to vault.ts`
- `docs: update CLAUDE.md with workflow`

### Before Pushing
```bash
# Run full check
pnpm run check

# Build to catch type errors
pnpm run build

# Raycast lint (for publishing compatibility)
pnpm run lint:ray
```

## Working with AI Agents

### Context Files
When working on this project, AI agents should read:
1. **CLAUDE.md** (this file) - Project overview, patterns, API examples
2. **ARCHITECTURE.md** - System diagrams, data flows, extensibility points
3. **DIAGRAMS.md** - Mermaid diagrams for visual reference

### Key Constraints
- **Raycast platform**: React + TypeScript only, no Rust/native code
- **Node.js 22.14+**: Bun not supported by Raycast
- **pnpm**: Must use with `node-linker=hoisted` (see `.npmrc`)
- **Biome**: Run `pnpm run check` before any commit

### Export Requirements (Don't Break These!)
Future phases depend on these exports:
- `config.ts`: Export `getConfig()` and `VaultCommanderConfig` type
- `search.ts`: Export `buildSearchIndex()` separately from search UI
- `vault.ts`: Keep generic (`writeFile`, `ensureDirectory`, `readFile`)
- `daily.ts`: Export `getDailyNoteTemplate()` separately from creation

### Testing Changes
After any change:
1. `pnpm run dev` - Test in Raycast
2. `pnpm run check` - Ensure code quality
3. `pnpm run build` - Catch type errors

## Testing Checklist

- [ ] `capture`: Creates atomic note with backlink, correct timestamp
- [ ] `today`: Creates note if missing, opens existing note
- [ ] `add`: Finds section header, inserts content below
- [ ] `search`: <500ms results, preview works, actions work
- [ ] Config: Loads preferences, expands `~` paths
- [ ] Works when Obsidian is open/closed

## Performance Targets

- **Capture latency**: < 2 seconds from hotkey to back-in-context
- **Search speed**: < 500ms for 10k+ note vault

## References

- [Raycast Extension Docs](https://developers.raycast.com/)
- [Raycast Extension Examples](https://github.com/raycast/extensions)
- [Obsidian URI Protocol](https://help.obsidian.md/Advanced+topics/Using+Obsidian+URI)
- [dayjs formatting](https://day.js.org/docs/en/display/format)
- [fuse.js docs](https://fusejs.io/)
- [Existing Obsidian Extension](https://github.com/marcjulianschwarz/obsidian-raycast)
