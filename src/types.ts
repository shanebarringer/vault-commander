/**
 * Vault Commander Type Definitions
 *
 * Core types for the Raycast extension. Designed for extensibility -
 * Phase 2+ will add optional API key fields to config.
 *
 * @module types
 */

// ============================================================================
// Branded Types (Nominal Typing)
// ============================================================================

/** Symbol for creating branded types */
declare const __brand: unique symbol

/** Generic brand type helper */
type Brand<T, B extends string> = T & { readonly [__brand]: B }

/** Absolute filesystem path (post ~ expansion) */
export type AbsolutePath = Brand<string, 'AbsolutePath'>

/** Path relative to vault root */
export type RelativePath = Brand<string, 'RelativePath'>

/** Markdown H2 section header (e.g., "## Tasks") */
export type MarkdownH2 = `## ${string}`

/** Obsidian wikilink (e.g., "[[2026-01-07-Wed]]") */
export type WikiLink = `[[${string}]]`

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Raycast extension preferences (from package.json)
 */
export interface Preferences {
  readonly vaultPath: string
  readonly claudeApiKey?: string
  readonly todoistApiKey?: string
}

/**
 * Daily note section headers.
 * All 7 sections from user's existing vault structure.
 * Uses template literal type to enforce H2 format at compile time.
 */
export interface SectionConfig {
  readonly schedule: MarkdownH2
  readonly tasks: MarkdownH2
  readonly running: MarkdownH2
  readonly meetingNotes: MarkdownH2
  readonly voiceNotes: MarkdownH2
  readonly notes: MarkdownH2
  readonly eveningReview: MarkdownH2
}

/**
 * Section key type for type-safe section selection
 */
export type SectionKey = keyof SectionConfig

/**
 * Full configuration including derived values and defaults.
 * Extensible for future phases (Claude API, Todoist).
 *
 * All paths are post-expansion (~ → /Users/name).
 */
export interface VaultCommanderConfig {
  // Phase 1 - Core (required)
  readonly vaultPath: AbsolutePath
  readonly dailyNotePath: RelativePath
  readonly dailyNoteFormat: string
  readonly inboxPath: RelativePath
  readonly sections: SectionConfig

  // Phase 2 - Claude (optional, added later)
  readonly claudeApiKey?: string

  // Phase 3 - Todoist (optional, added later)
  readonly todoistApiKey?: string
  readonly todoistProjectMapping?: Readonly<Record<string, string>>
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Base type for vault file references.
 * Shared by IndexEntry and SearchResult.
 */
export interface VaultFileRef {
  /** Full absolute path to the file */
  readonly path: string
  /** Filename without .md extension */
  readonly filename: string
}

/**
 * Entry in the search index (what we index for each file)
 */
export interface IndexEntry extends VaultFileRef {
  /** First 500 chars of file content */
  readonly content: string
}

/**
 * Search result from fuse.js query
 */
export interface SearchResult extends VaultFileRef {
  /** First N chars of content for preview */
  readonly preview: string
  /** fuse.js relevance score (0 = perfect match, 1 = no match) */
  readonly score: number
}

/**
 * fuse.js search index type
 * Exported for Phase 2 Claude integration
 */
export type SearchIndex = readonly IndexEntry[]

// ============================================================================
// Daily Note Types
// ============================================================================

/**
 * Capture note metadata (returned after creating a capture)
 */
export interface CaptureNote {
  /** Generated filename (capture-YYYY-MM-DD-HHmmss.md) */
  readonly filename: string
  /** Full path to the file */
  readonly path: string
  /** Note content with backlink */
  readonly content: string
  /** Daily note link for backlink */
  readonly dailyNoteLink: WikiLink
  /** Timestamp string (h:mma format) */
  readonly timestamp: string
}

/**
 * Daily note metadata
 *
 * Note: `exists` is a point-in-time snapshot that may become stale
 * if the file is created/deleted after this object is constructed.
 */
export interface DailyNote {
  /** Formatted date string (YYYY-MM-DD-ddd) */
  readonly dateString: string
  /** Full path to the file */
  readonly path: string
  /** Whether the file existed at construction time */
  readonly exists: boolean
}

// ============================================================================
// Utility Types (for future use)
// ============================================================================

/** Make all properties recursively readonly */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/** Result type for operations that can fail */
export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E }
