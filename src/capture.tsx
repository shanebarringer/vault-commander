/**
 * Vault Capture Command
 *
 * Quick capture to atomic inbox notes with backlinks to daily note.
 * Each capture creates a new file: Inbox/capture-YYYY-MM-DD-HHmmss.md
 */

import { Action, ActionPanel, Form, popToRoot, showHUD } from '@raycast/api'
import { createCaptureNote, getConfig } from './lib/vault'

interface CaptureFormValues {
  content: string
}

const handleSubmit = async (values: CaptureFormValues): Promise<void> => {
  const content = values.content.trim()

  if (!content) {
    await showHUD('Nothing to capture')
    return
  }

  try {
    const config = getConfig()
    createCaptureNote(config, content)
    await showHUD('Captured to Inbox')
    await popToRoot()
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const CaptureAction = () => <Action.SubmitForm title="Capture" onSubmit={handleSubmit} />

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <CaptureAction />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Capture"
        placeholder="What's on your mind?"
        enableMarkdown
      />
    </Form>
  )
}
