/**
 * Vault Summarize Command
 *
 * Use Claude to summarize selected notes or search results.
 * Supports brief, detailed, and bullet point summary styles.
 */

import { Action, ActionPanel, Detail, Form, List, showToast, Toast } from '@raycast/api'
import { useEffect, useMemo, useState } from 'react'
import { createClaudeClient, summarizeNotes, type SummaryStyle } from './lib/claude'
import { getConfig } from './lib/config'
import { buildSearchIndex, searchVault } from './lib/search'
import { readFile } from './lib/vault'
import type { SearchIndex, SearchResult, VaultCommanderConfig } from './types'

type ViewState = 'search' | 'summarizing' | 'result'

export default function Command() {
  const [searchText, setSearchText] = useState('')
  const [selectedNotes, setSelectedNotes] = useState<SearchResult[]>([])
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>('brief')
  const [summary, setSummary] = useState<string | null>(null)
  const [viewState, setViewState] = useState<ViewState>('search')
  const [isLoading, setIsLoading] = useState(true)
  const [index, setIndex] = useState<SearchIndex | null>(null)

  const config = useMemo<VaultCommanderConfig | null>(() => {
    try {
      return getConfig()
    } catch {
      return null
    }
  }, [])

  // Build search index on mount
  useEffect(() => {
    if (!config) return
    try {
      const searchIndex = buildSearchIndex(config.vaultPath)
      setIndex(searchIndex)
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to index vault',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [config])

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
    setIsLoading(true)

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
    } finally {
      setIsLoading(false)
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
      isLoading={isLoading}
      searchBarPlaceholder="Search notes to summarize..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Summary Style" value={summaryStyle} onChange={(v) => setSummaryStyle(v as SummaryStyle)}>
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

      {!isLoading && results.length === 0 && searchText && (
        <List.EmptyView title="No Results" description={`No notes found matching "${searchText}"`} />
      )}
    </List>
  )
}
