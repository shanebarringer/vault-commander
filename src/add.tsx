/**
 * Vault Add Command
 *
 * Append text to a specific section of today's daily note.
 * Dropdown to select section, TextArea for content.
 * Automatically populates with selected text if available.
 */

import { Action, ActionPanel, Form, getSelectedText, popToRoot, showHUD } from '@raycast/api'
import { useEffect, useState } from 'react'
import { DEFAULT_SECTIONS } from './lib/config'
import { getDailyNotePath } from './lib/daily'
import { appendToSection, ensureDailyNote, getConfig } from './lib/vault'
import type { SectionKey } from './types'

interface AddFormValues {
  section: SectionKey
  content: string
}

/**
 * Human-readable labels for sections
 */
const SECTION_LABELS: Record<SectionKey, string> = {
  schedule: 'Schedule',
  tasks: 'Tasks',
  running: 'Running',
  meetingNotes: 'Meeting Notes',
  voiceNotes: 'Voice Notes',
  notes: 'Notes',
  eveningReview: 'Evening Review',
}

const handleSubmit = async (values: AddFormValues): Promise<void> => {
  const content = values.content.trim()

  if (!content) {
    await showHUD('Nothing to add')
    return
  }

  try {
    const config = getConfig()

    // Ensure daily note exists
    ensureDailyNote(config)

    // Get full path to daily note
    const dailyPath = getDailyNotePath(config)

    // Get section header from config
    const sectionHeader = config.sections[values.section]

    // Append content below section header
    appendToSection(dailyPath, sectionHeader, content)

    await showHUD(`Added to ${SECTION_LABELS[values.section]}`)
    await popToRoot()
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const AddAction = () => <Action.SubmitForm title="Add" onSubmit={handleSubmit} />

export default function Command() {
  const sectionKeys = Object.keys(DEFAULT_SECTIONS) as SectionKey[]
  const [initialContent, setInitialContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getSelectedText()
      .then((text) => {
        if (text.trim()) {
          setInitialContent(text)
        }
      })
      .catch(() => {
        // No selection available, that's fine
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <AddAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="section" title="Section" defaultValue="notes">
        {sectionKeys.map((key) => (
          <Form.Dropdown.Item key={key} value={key} title={SECTION_LABELS[key]} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What do you want to add?"
        defaultValue={initialContent}
        enableMarkdown
      />
    </Form>
  )
}
