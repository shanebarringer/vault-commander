# Vault Commander Architecture

> Reference for AI agents working on this codebase. See CLAUDE.md for quick context.

---

## System Context

Vault Commander is the **interface layer** in a larger productivity system:

```
┌─────────────────────────────────────────────────────┐
│                    USER (Intent)                     │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              RAYCAST (Interface Layer)               │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           VAULT COMMANDER                    │    │
│  │  capture | today | add | search              │    │
│  │  ─────────────────────────────────────────   │    │
│  │  v0.2: ask | summarize | reflect             │    │
│  │  v0.3: task | tasks | inbox                  │    │
│  │  v1.0: brief | review | weekly               │    │
│  └─────────────────────────────────────────────┘    │
└───────┬─────────────┬─────────────┬─────────────────┘
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌─────────────┐  ┌──────────────┐
│  CLAUDE   │  │  OBSIDIAN   │  │   TODOIST    │
│  (Brain)  │◄─►│  (Memory)   │◄─►│  (Execution) │
│ Reasoning │  │    PKM      │  │    Tasks     │
└───────────┘  └─────────────┘  └──────────────┘
```

### Component Responsibilities

| Component | Role | Integration Point |
|-----------|------|-------------------|
| **Vault Commander** | Speed layer - fast access to all systems | Raycast extension |
| **Obsidian** | Knowledge storage, daily notes, captures | File system + URI protocol |
| **Claude** | AI queries, synthesis, reflection prompts | API (v0.2) |
| **Todoist** | Task management, inbox triage | API (v0.3) |

---

## Module Structure

```
src/
├── capture.tsx          # Command: Quick capture to inbox
├── today.tsx            # Command: Open/create daily note
├── add.tsx              # Command: Append to daily note section
├── search.tsx           # Command: Fuzzy search vault
│
├── lib/
│   ├── config.ts        # Configuration loading + defaults
│   ├── vault.ts         # File operations (generic, reusable)
│   ├── daily.ts         # Daily note utilities
│   └── search.ts        # Search index + query
│
└── types.ts             # Shared TypeScript interfaces
```

### Module Dependencies

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  capture.tsx │     │  today.tsx   │     │   add.tsx    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  config.ts   │     │   daily.ts   │     │   vault.ts   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
                     ┌──────────────┐
                     │   types.ts   │
                     └──────────────┘

┌──────────────┐
│  search.tsx  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  search.ts   │────►│   vault.ts   │
└──────────────┘     └──────────────┘
```

---

## Data Flows

### Capture Flow
```
User Input → capture.tsx → vault.ts → Inbox/capture-YYYY-MM-DD-HHmmss.md
                │
                └──► HUD "Captured to Inbox" → Close Raycast
```

**File created:**
```markdown
[[2026-01-07-Wed]] - 2:35pm

User's captured thought here
```

### Today Flow
```
today.tsx → daily.ts (check exists)
              │
              ├── EXISTS → openInObsidian(path)
              │
              └── MISSING → createDailyNote(template) → openInObsidian(path)
```

### Add Flow
```
User selects section → add.tsx → daily.ts (ensure note exists)
                                    │
                                    ▼
                          vault.ts (appendToSection)
                                    │
                                    ▼
                          Find "## Section" → Insert below
```

### Search Flow
```
User types query → search.tsx → search.ts (query index)
                                    │
                                    ▼
                          fuse.js fuzzy match
                                    │
                                    ▼
                          Results with preview → User selects
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                              Open in         Copy wikilink    Copy path
                              Obsidian        [[filename]]     /full/path
```

---

## Phase Roadmap

```
PHASE 1 (v0.1) - Obsidian Speed Layer ◄── YOU ARE HERE
├── capture: Atomic notes to Inbox
├── today: Open/create daily note
├── add: Append to sections
└── search: Fuzzy search vault
        │
        ▼
PHASE 2 (v0.2) - Claude Integration
├── ask: "What did I write about X?"
├── summarize: Summarize note(s)
└── reflect: Stoic prompts from library
        │
        ▼
PHASE 3 (v0.3) - Todoist Integration
├── task: Quick task creation
├── tasks: View today's tasks
└── inbox: Todoist inbox triage
        │
        ▼
PHASE 4 (v0.4) - Voice & Automation
├── Superwhisper → Inbox pipeline
├── Granola → Meeting Notes sync
└── Process scripts from Raycast
        │
        ▼
PHASE 5 (v1.0) - Unified System
├── Smart capture: AI routes to right place
├── brief: Morning summary (calendar + tasks + vault)
├── review: Evening reflection workflow
└── weekly: Aggregated weekly review
```

---

## Extensibility Points

These are designed for future phases. Don't break them.

### config.ts
```typescript
// Current (v0.1)
interface VaultCommanderConfig {
  vaultPath: string;
  dailyNotePath: string;
  dailyNoteFormat: string;
  inboxPath: string;
  sections: Record<string, string>;
}

// Future additions (v0.2+)
interface VaultCommanderConfig {
  // ... existing fields
  claudeApiKey?: string;           // v0.2
  todoistApiKey?: string;          // v0.3
  todoistProjectMapping?: Record<string, string>;
}
```

### search.ts
```typescript
// Export separately for Phase 2 Claude integration
export function buildSearchIndex(vaultPath: string): SearchIndex
export function searchVault(index: SearchIndex, query: string): SearchResult[]

// Phase 2 usage:
// 1. buildSearchIndex() to get vault context
// 2. Send relevant chunks to Claude API
// 3. Return synthesized answer
```

### vault.ts
```typescript
// Keep generic - Phase 4 voice capture will reuse
export function writeFile(path: string, content: string): void
export function ensureDirectory(path: string): void

// Voice capture creates: Inbox/voice-YYYY-MM-DD-HHmmss.md
// Same pattern as text capture, different prefix
```

### daily.ts
```typescript
// Export template separately for Phase 5 composition
export function getDailyNoteTemplate(): string
export function createDailyNote(path: string): void

// Phase 5's vault brief/review will compose these
```

---

## File Patterns

| Type | Location | Format |
|------|----------|--------|
| Daily notes | `Journal/Daily/` | `YYYY-MM-DD-ddd.md` |
| Captures | `Inbox/` | `capture-YYYY-MM-DD-HHmmss.md` |
| Voice (v0.4) | `Inbox/` | `voice-YYYY-MM-DD-HHmmss.md` |

### Daily Note Template
```markdown
## Schedule

## Tasks

## Running

## Meeting Notes

## Voice Notes

## Notes

## Evening Review
```

---

## Integration Points

### Obsidian URI Protocol
```
obsidian://open?vault={vaultName}&file={encodedPath}
```

Example:
```
obsidian://open?vault=vault&file=Journal%2FDaily%2F2026-01-07-Wed
```

### Raycast APIs Used
- `Form` - capture, add inputs
- `List` - search results
- `showHUD` - confirmation messages
- `closeMainWindow` - return to context
- `open` - launch Obsidian URI
- `Clipboard` - copy wikilinks/paths

---

## Testing Strategy

| Command | Test Cases |
|---------|------------|
| capture | Creates file, correct format, backlink present |
| today | Creates if missing, opens if exists, correct path |
| add | Finds section, inserts below header, preserves content |
| search | <500ms results, preview loads, actions work |

### Edge Cases
- Daily note doesn't exist (create it)
- Section header not found (error gracefully)
- Vault path has spaces (URL encode)
- Obsidian not running (URI still works, launches app)
