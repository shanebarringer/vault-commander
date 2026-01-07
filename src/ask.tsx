/**
 * Vault Ask Command
 *
 * Query your vault using Claude AI - ask questions about your notes.
 * Uses semantic search to find relevant context before querying.
 */

import { Action, ActionPanel, Detail, Form, showToast, Toast } from '@raycast/api'
import { useEffect, useMemo, useState } from 'react'
import { askVault, createClaudeClient } from './lib/claude'
import { getConfig } from './lib/config'
import { buildSearchIndex } from './lib/search'
import type { SearchIndex, VaultCommanderConfig } from './types'

export default function Command() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
    }
  }, [config])

  const handleSubmit = async () => {
    if (!config?.claudeApiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Claude API key required',
        message: 'Set your API key in extension preferences',
      })
      return
    }

    if (!index) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Vault not indexed',
        message: 'Please wait for indexing to complete',
      })
      return
    }

    if (!question.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Question required',
        message: 'Please enter a question about your vault',
      })
      return
    }

    setIsLoading(true)
    try {
      const client = createClaudeClient(config.claudeApiKey)
      const response = await askVault(client, index, question)
      setAnswer(response)
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to get answer',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show answer if we have one
  if (answer) {
    return (
      <Detail
        markdown={`## Question\n\n${question}\n\n## Answer\n\n${answer}`}
        actions={
          <ActionPanel>
            <Action title="Ask Another Question" onAction={() => setAnswer(null)} />
            <Action.CopyToClipboard
              title="Copy Answer"
              content={answer}
              shortcut={{ modifiers: ['cmd'], key: 'c' }}
            />
          </ActionPanel>
        }
      />
    )
  }

  // Show form for question input
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Claude" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What did I write about TypeScript last week?"
        value={question}
        onChange={setQuestion}
        enableMarkdown
      />
      <Form.Description
        title="How it works"
        text="Claude will search your vault for relevant notes and use them to answer your question."
      />
    </Form>
  )
}
