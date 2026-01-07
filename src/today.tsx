/**
 * Vault Today Command
 *
 * Open or create today's daily note in Obsidian.
 * No-view command - runs in background and opens Obsidian directly.
 */

import { showHUD } from '@raycast/api'
import { getDailyNoteRelativePath } from './lib/daily'
import { ensureDailyNote, getConfig, openInObsidian } from './lib/vault'

export default async function Command(): Promise<void> {
  try {
    const config = getConfig()

    // Ensure daily note exists (creates from template if missing)
    ensureDailyNote(config)

    // Get relative path for Obsidian URI (without .md extension)
    const relativePath = getDailyNoteRelativePath(config)

    // Open in Obsidian
    await openInObsidian(config.vaultPath, relativePath)
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
