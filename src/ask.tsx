/**
 * Vault Ask Command
 *
 * Query your vault using Claude AI - ask questions about your notes.
 * Uses semantic search to find relevant context before querying.
 */

import { Action, ActionPanel, Detail, Form, Toast, showToast } from '@raycast/api'
import { useMemo, useState } from 'react'
import { useSearchIndex } from './hooks/useSearchIndex'
import { askVault, createClaudeClient } from './lib/claude'
import { getConfig } from './lib/config'
import type { VaultCommanderConfig } from './types'

/** Maximum question length to prevent API issues */
const MAX_QUESTION_LENGTH = 5000

export default function Command() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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

    // Input validation: reasonable length limit
    if (question.length > MAX_QUESTION_LENGTH) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Question too long',
        message: `Please keep questions under ${MAX_QUESTION_LENGTH.toLocaleString()} characters`,
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
      isLoading={isLoading || isIndexing}
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
