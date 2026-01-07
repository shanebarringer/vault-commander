# Vault Commander

A Raycast extension for lightning-fast Obsidian vault access. Four commands that replace 80% of "open Obsidian to do a quick thing" moments.

## Commands

| Command | Hotkey | What it does |
|---------|--------|--------------|
| **Vault Capture** | `⌘⇧C` | Quick capture to atomic inbox note |
| **Vault Today** | `⌘⇧T` | Open (or create) today's daily note |
| **Vault Add** | `⌘⇧A` | Append content to a daily note section |
| **Vault Search** | `⌘⇧S` | Fuzzy search entire vault |

## Installation

### From Raycast Store (Recommended)
*Coming soon*

### Manual Installation

```bash
git clone https://github.com/yourusername/vault-commander.git
cd vault-commander
pnpm install
pnpm run dev
```

Then open Raycast and enable the extension.

## Configuration

After installation, configure the extension in Raycast preferences:

| Preference | Description | Default |
|------------|-------------|---------|
| **Vault Path** | Path to your Obsidian vault | `~/vault` |

## How It Works

### Vault Capture
Creates an atomic note in your Inbox folder with a backlink to today's daily note:

```markdown
[[2026-01-07-Wed]] - 2:35pm

Your captured thought here
```

File: `Inbox/capture-2026-01-07-143521.md`

### Vault Today
Opens today's daily note in Obsidian. If it doesn't exist, creates it from template with 7 sections:
- Schedule
- Tasks
- Running
- Meeting Notes
- Voice Notes
- Notes
- Evening Review

### Vault Add
Appends content to any section of today's daily note. Select the section from a dropdown, type your content, and it's inserted directly below the section header.

### Vault Search
Fuzzy search across all markdown files in your vault. Actions:
- **Enter**: Open in Obsidian
- **⌘C**: Copy wikilink (`[[filename]]`)
- **⌘⇧C**: Copy file path

## Vault Structure

This extension expects:

```
~/vault/
├── Inbox/                    # Capture notes land here
├── Journal/
│   └── Daily/               # Daily notes: YYYY-MM-DD-ddd.md
└── ...                      # Everything else is searchable
```

## Requirements

- [Raycast](https://raycast.com/) (macOS)
- [Obsidian](https://obsidian.md/)
- Node.js 22.14+

## Development

```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm run dev

# Build
pnpm run build

# Format + lint (Biome)
pnpm run check
```

## Roadmap

This is **Phase 1** of a 5-phase project:

| Phase | Features |
|-------|----------|
| **v0.1** (current) | Capture, Today, Add, Search |
| v0.2 | Claude integration (`vault ask`, `vault summarize`) |
| v0.3 | Todoist integration (`vault task`, `vault inbox`) |
| v0.4 | Voice capture (Superwhisper pipeline) |
| v1.0 | Unified experience (smart capture, daily brief) |

## License

MIT
