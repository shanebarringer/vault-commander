/**
 * Vault Reflect Command
 *
 * Generate thoughtful Stoic reflection prompts based on your vault content.
 * Perfect for evening reviews or morning contemplation.
 */

import { Action, ActionPanel, Detail, Form, showToast, Toast } from '@raycast/api'
import { useEffect, useMemo, useState } from 'react'
import { createClaudeClient, generateReflection } from './lib/claude'
import { getConfig } from './lib/config'
import { buildSearchIndex } from './lib/search'
import type { SearchIndex, VaultCommanderConfig } from './types'

export default function Command() {
  const [theme, setTheme] = useState('')
  const [reflection, setReflection] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [isIndexing, setIsIndexing] = useState(true)

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
      setIsIndexing(false)
    }
  }, [config])

  const handleGenerate = async () => {
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

    setIsLoading(true)
    try {
      const client = createClaudeClient(config.claudeApiKey)
      const prompt = await generateReflection(client, index, theme || undefined)
      setReflection(prompt)
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to generate reflection',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show reflection if we have one
  if (reflection) {
    return (
      <Detail
        markdown={`# Stoic Reflection\n\n${reflection}\n\n---\n\n*"We suffer more often in imagination than in reality."* — Seneca`}
        actions={
          <ActionPanel>
            <Action title="Generate Another" onAction={() => setReflection(null)} />
            <Action.CopyToClipboard
              title="Copy Reflection"
              content={reflection}
              shortcut={{ modifiers: ['cmd'], key: 'c' }}
            />
            <Action.Paste
              title="Paste to Daily Note"
              content={`## Evening Reflection\n\n${reflection}`}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'v' }}
            />
          </ActionPanel>
        }
      />
    )
  }

  // Show form for theme input
  return (
    <Form
      isLoading={isLoading || isIndexing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Reflection" onSubmit={handleGenerate} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="theme"
        title="Theme (Optional)"
        placeholder="e.g., productivity, relationships, goals"
        value={theme}
        onChange={setTheme}
      />
      <Form.Description
        title="About"
        text="Claude will generate a Stoic reflection prompt based on your recent notes. Leave theme blank for a general reflection based on your vault's content."
      />
      <Form.Separator />
      <Form.Description
        title="Stoic Philosophy"
        text="The Stoics practiced daily reflection to improve virtue and tranquility. Marcus Aurelius wrote his Meditations as personal reflections, never intending them for publication."
      />
    </Form>
  )
}
