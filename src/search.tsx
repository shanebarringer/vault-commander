/**
 * Vault Search Command
 *
 * Fuzzy search across entire vault with preview and actions.
 * Uses fuse.js for fast fuzzy matching on filename + content.
 */

import { Action, ActionPanel, Clipboard, List, open, showHUD } from '@raycast/api'
import { useEffect, useMemo, useState } from 'react'
import { buildSearchIndex, getRelativeVaultPath, searchVault } from './lib/search'
import { buildObsidianUri, getConfig, getVaultName } from './lib/vault'
import type { SearchIndex, SearchResult, VaultCommanderConfig } from './types'

/**
 * Actions for a search result
 */
const ResultActions = ({
  result,
  config,
}: {
  result: SearchResult
  config: VaultCommanderConfig
}) => {
  const vaultName = getVaultName(config.vaultPath)
  const relativePath = getRelativeVaultPath(config.vaultPath, result.path)
  const uri = buildObsidianUri(vaultName, relativePath)
  const wikilink = `[[${result.filename}]]`

  return (
    <ActionPanel>
      <Action title="Open in Obsidian" onAction={() => open(uri)} />
      <Action
        title="Copy Wikilink"
        shortcut={{ modifiers: ['cmd'], key: 'c' }}
        onAction={async () => {
          await Clipboard.copy(wikilink)
          await showHUD(`Copied ${wikilink}`)
        }}
      />
      <Action
        title="Copy Path"
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
        onAction={async () => {
          await Clipboard.copy(result.path)
          await showHUD('Copied path')
        }}
      />
    </ActionPanel>
  )
}

export default function Command() {
  const [searchText, setSearchText] = useState('')
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const config = useMemo(() => {
    try {
      return getConfig()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config')
      return null
    }
  }, [])

  // Build index on mount
  useEffect(() => {
    if (!config) return

    try {
      const searchIndex = buildSearchIndex(config.vaultPath)
      setIndex(searchIndex)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build index')
    } finally {
      setIsLoading(false)
    }
  }, [config])

  // Search results
  const results = useMemo(() => {
    if (!index) return []
    return searchVault(index, searchText)
  }, [index, searchText])

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error} />
      </List>
    )
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search vault..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {results.map((result) => (
        <List.Item
          key={result.path}
          title={result.filename}
          subtitle={result.preview}
          accessories={[
            { text: result.score > 0 ? `${Math.round((1 - result.score) * 100)}%` : '' },
          ]}
          actions={config ? <ResultActions result={result} config={config} /> : undefined}
        />
      ))}
      {!isLoading && results.length === 0 && searchText && (
        <List.EmptyView
          title="No Results"
          description={`No notes found matching "${searchText}"`}
        />
      )}
    </List>
  )
}
