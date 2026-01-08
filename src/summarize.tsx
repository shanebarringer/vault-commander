/**
 * Vault Summarize Command
 *
 * Use Claude to summarize selected notes or search results.
 * Supports brief, detailed, and bullet point summary styles.
 */

import { Action, ActionPanel, Detail, List, Toast, showToast } from '@raycast/api'
import { useMemo, useState } from 'react'
import { useSearchIndex } from './hooks/useSearchIndex'
import { type SummaryStyle, createClaudeClient, summarizeNotes } from './lib/claude'
import { getConfig } from './lib/config'
import { searchVault } from './lib/search'
import { readFile } from './lib/vault'
import type { SearchResult, VaultCommanderConfig } from './types'

type ViewState = 'search' | 'summarizing' | 'result'

/** Maximum combined content size for API calls (characters) */
const MAX_CONTENT_SIZE = 100_000

export default function Command() {
  const [searchText, setSearchText] = useState('')
  const [selectedNotes, setSelectedNotes] = useState<SearchResult[]>([])
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>('brief')
  const [summary, setSummary] = useState<string | null>(null)
  const [viewState, setViewState] = useState<ViewState>('search')

  const config = useMemo<VaultCommanderConfig | null>(() => {
    try {
      return getConfig()
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Configuration error',
        message: e instanceof Error ? e.message : 'Unable to load vault configuration',
      })
      return null
    }
  }, [])

  // Use shared search index hook with caching
  const { index, isIndexing } = useSearchIndex(config?.vaultPath)

  // Search results
  const results = useMemo(() => {
    if (!index) return []
    return searchVault(index, searchText)
  }, [index, searchText])

  const handleSelectNote = (result: SearchResult) => {
    if (selectedNotes.some((n) => n.path === result.path)) {
      setSelectedNotes(selectedNotes.filter((n) => n.path !== result.path))
    } else {
      setSelectedNotes([...selectedNotes, result])
    }
  }

  const handleSummarize = async () => {
    if (!config?.claudeApiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Claude API key required',
        message: 'Set your API key in extension preferences',
      })
      return
    }

    if (selectedNotes.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: 'No notes selected',
        message: 'Select at least one note to summarize',
      })
      return
    }

    setViewState('summarizing')

    try {
      // Read full content of selected notes
      const contents = selectedNotes
        .map((note) => {
          try {
            const content = readFile(note.path)
            return `# ${note.filename}\n\n${content}`
          } catch {
            return `# ${note.filename}\n\n[Unable to read file]`
          }
        })
        .join('\n\n---\n\n')

      // Content size check to prevent API issues
      if (contents.length > MAX_CONTENT_SIZE) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Content too large',
          message: `Selected notes exceed ${(MAX_CONTENT_SIZE / 1000).toFixed(0)}K characters. Select fewer notes.`,
        })
        setViewState('search')
        return
      }

      const client = createClaudeClient(config.claudeApiKey)
      const result = await summarizeNotes(client, contents, summaryStyle)
      setSummary(result)
      setViewState('result')
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to summarize',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
      setViewState('search')
    }
  }

  // Show result
  if (viewState === 'result' && summary) {
    const notesList = selectedNotes.map((n) => `- ${n.filename}`).join('\n')
    return (
      <Detail
        markdown={`## Summary (${summaryStyle})\n\n${summary}\n\n---\n\n**Notes summarized:**\n${notesList}`}
        actions={
          <ActionPanel>
            <Action
              title="Summarize More Notes"
              onAction={() => {
                setSelectedNotes([])
                setSummary(null)
                setViewState('search')
              }}
            />
            <Action.CopyToClipboard
              title="Copy Summary"
              content={summary}
              shortcut={{ modifiers: ['cmd'], key: 'c' }}
            />
          </ActionPanel>
        }
      />
    )
  }

  // Show loading during summarization
  if (viewState === 'summarizing') {
    return (
      <Detail
        isLoading
        markdown="# Summarizing...\n\nClaude is reading and summarizing your selected notes."
      />
    )
  }

  // Search and select notes
  return (
    <List
      isLoading={isIndexing}
      searchBarPlaceholder="Search notes to summarize..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Summary Style"
          value={summaryStyle}
          onChange={(v) => setSummaryStyle(v as SummaryStyle)}
        >
          <List.Dropdown.Item title="Brief (2-3 sentences)" value="brief" />
          <List.Dropdown.Item title="Detailed" value="detailed" />
          <List.Dropdown.Item title="Bullet Points" value="bullets" />
        </List.Dropdown>
      }
    >
      {selectedNotes.length > 0 && (
        <List.Section title={`Selected (${selectedNotes.length})`}>
          {selectedNotes.map((note) => (
            <List.Item
              key={note.path}
              title={note.filename}
              icon="checkmark-circle"
              accessories={[{ text: 'Selected' }]}
              actions={
                <ActionPanel>
                  <Action title="Remove from Selection" onAction={() => handleSelectNote(note)} />
                  <Action title="Summarize Selected" onAction={handleSummarize} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Search Results">
        {results.map((result) => {
          const isSelected = selectedNotes.some((n) => n.path === result.path)
          return (
            <List.Item
              key={result.path}
              title={result.filename}
              subtitle={result.preview}
              icon={isSelected ? 'checkmark-circle' : 'document'}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? 'Remove from Selection' : 'Add to Selection'}
                    onAction={() => handleSelectNote(result)}
                  />
                  {selectedNotes.length > 0 && (
                    <Action title="Summarize Selected" onAction={handleSummarize} />
                  )}
                </ActionPanel>
              }
            />
          )
        })}
      </List.Section>

      {!isIndexing && results.length === 0 && searchText && (
        <List.EmptyView
          title="No Results"
          description={`No notes found matching "${searchText}"`}
        />
      )}
    </List>
  )
}
