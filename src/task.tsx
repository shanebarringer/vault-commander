/**
 * Vault Task Command
 *
 * Quick task creation in Todoist with natural language due dates.
 */

import { Action, ActionPanel, Form, showHUD, showToast, Toast } from '@raycast/api'
import { useMemo, useState } from 'react'
import { getConfig } from './lib/config'
import { createTodoistClient, type CreateTaskOptions } from './lib/todoist'
import type { VaultCommanderConfig } from './types'

type Priority = '1' | '2' | '3' | '4'

export default function Command() {
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [dueString, setDueString] = useState('')
  const [priority, setPriority] = useState<Priority>('1')
  const [isLoading, setIsLoading] = useState(false)

  const config = useMemo<VaultCommanderConfig | null>(() => {
    try {
      return getConfig()
    } catch {
      return null
    }
  }, [])

  const handleSubmit = async () => {
    if (!config?.todoistApiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Todoist API key required',
        message: 'Set your API key in extension preferences',
      })
      return
    }

    if (!content.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Task content required',
        message: 'Please enter a task description',
      })
      return
    }

    setIsLoading(true)
    try {
      const client = createTodoistClient(config.todoistApiKey)
      const options: CreateTaskOptions = {
        content: content.trim(),
        priority: Number(priority) as 1 | 2 | 3 | 4,
      }

      if (description.trim()) {
        options.description = description.trim()
      }

      if (dueString.trim()) {
        options.due_string = dueString.trim()
      }

      await client.createTask(options)
      await showHUD('✓ Task created')

      // Clear form
      setContent('')
      setDescription('')
      setDueString('')
      setPriority('1')
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to create task',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="content"
        title="Task"
        placeholder="Buy groceries"
        value={content}
        onChange={setContent}
        autoFocus
      />
      <Form.TextField
        id="dueString"
        title="Due Date"
        placeholder="tomorrow, next monday, jan 15"
        value={dueString}
        onChange={setDueString}
      />
      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={(v) => setPriority(v as Priority)}>
        <Form.Dropdown.Item title="Normal" value="1" />
        <Form.Dropdown.Item title="Medium !" value="2" />
        <Form.Dropdown.Item title="High !!" value="3" />
        <Form.Dropdown.Item title="Urgent !!!" value="4" />
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Notes"
        placeholder="Additional details..."
        value={description}
        onChange={setDescription}
      />
      <Form.Description
        title="Due Date Examples"
        text="today, tomorrow, next week, monday, jan 15, in 3 days"
      />
    </Form>
  )
}
