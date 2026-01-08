/**
 * Vault Tasks Command
 *
 * View and manage today's tasks from Todoist.
 */

import { Action, ActionPanel, Color, Icon, List, Toast, showHUD, showToast } from '@raycast/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getConfig } from './lib/config'
import {
  type TodoistClient,
  type TodoistTask,
  createTodoistClient,
  formatPriority,
  getPriorityColor,
} from './lib/todoist'
import type { VaultCommanderConfig } from './types'

export default function Command() {
  const [tasks, setTasks] = useState<TodoistTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [client, setClient] = useState<TodoistClient | null>(null)

  const config = useMemo<VaultCommanderConfig | null>(() => {
    try {
      return getConfig()
    } catch {
      return null
    }
  }, [])

  // Initialize client
  useEffect(() => {
    if (!config?.todoistApiKey) {
      setIsLoading(false)
      return
    }
    setClient(createTodoistClient(config.todoistApiKey))
  }, [config])

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!client) return

    setIsLoading(true)
    try {
      const todayTasks = await client.getTodayTasks()
      // Sort by priority (4 = urgent is first)
      setTasks(todayTasks.sort((a, b) => b.priority - a.priority))
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to fetch tasks',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [client])

  // Initial fetch
  useEffect(() => {
    if (client) {
      fetchTasks()
    }
  }, [client, fetchTasks])

  const handleComplete = async (task: TodoistTask) => {
    if (!client) return

    try {
      await client.completeTask(task.id)
      await showHUD('✓ Task completed')
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to complete task',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  const handleReschedule = async (task: TodoistTask, dueString: string) => {
    if (!client) return

    try {
      await client.updateTaskDue(task.id, dueString)
      await showHUD(`✓ Rescheduled to ${dueString}`)
      await fetchTasks()
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to reschedule task',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  if (!config?.todoistApiKey) {
    return (
      <List>
        <List.EmptyView
          title="Todoist API Key Required"
          description="Set your API key in extension preferences to use this command."
          icon={Icon.Key}
        />
      </List>
    )
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks...">
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Tasks for Today"
          description="You're all caught up! 🎉"
          icon={Icon.CheckCircle}
        />
      ) : (
        tasks.map((task) => (
          <List.Item
            key={task.id}
            title={task.content}
            subtitle={task.description || undefined}
            icon={{
              source: Icon.Circle,
              tintColor: Color.SecondaryText,
            }}
            accessories={[
              {
                text: formatPriority(task.priority),
                tooltip: `Priority ${task.priority}`,
              },
              ...(task.due
                ? [
                    {
                      text: task.due.string,
                      tooltip: task.due.datetime || task.due.date,
                    },
                  ]
                : []),
              {
                icon: {
                  source: Icon.Dot,
                  tintColor: getPriorityColor(task.priority),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Complete Task"
                  icon={Icon.CheckCircle}
                  onAction={() => handleComplete(task)}
                />
                <ActionPanel.Section title="Reschedule">
                  <Action
                    title="Tomorrow"
                    icon={Icon.Calendar}
                    onAction={() => handleReschedule(task, 'tomorrow')}
                  />
                  <Action
                    title="Next Week"
                    icon={Icon.Calendar}
                    onAction={() => handleReschedule(task, 'next monday')}
                  />
                  <Action
                    title="In 3 Days"
                    icon={Icon.Calendar}
                    onAction={() => handleReschedule(task, 'in 3 days')}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Todoist" url={task.url} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ['cmd'], key: 'r' }}
                    onAction={fetchTasks}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}
