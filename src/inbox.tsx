/**
 * Vault Inbox Command
 *
 * Review and organize tasks in your Todoist inbox.
 * Quick triage: schedule, move to project, or complete.
 */

import { Action, ActionPanel, Color, Icon, List, showHUD, showToast, Toast } from '@raycast/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getConfig } from './lib/config'
import {
  createTodoistClient,
  formatPriority,
  getPriorityColor,
  type TodoistClient,
  type TodoistProject,
  type TodoistTask,
} from './lib/todoist'
import type { VaultCommanderConfig } from './types'

export default function Command() {
  const [tasks, setTasks] = useState<TodoistTask[]>([])
  const [projects, setProjects] = useState<TodoistProject[]>([])
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

  // Fetch inbox tasks and projects
  const fetchData = useCallback(async () => {
    if (!client) return

    setIsLoading(true)
    try {
      const [inboxTasks, allProjects] = await Promise.all([
        client.getInboxTasks(),
        client.getProjects(),
      ])

      // Sort by creation date (oldest first for triage)
      setTasks(inboxTasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))

      // Filter out inbox from project list for move actions
      setProjects(allProjects.filter((p) => !p.is_inbox_project))
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to fetch inbox',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [client])

  // Initial fetch
  useEffect(() => {
    if (client) {
      fetchData()
    }
  }, [client, fetchData])

  const handleComplete = async (task: TodoistTask) => {
    if (!client) return

    try {
      await client.completeTask(task.id)
      await showHUD('✓ Task completed')
      setTasks(tasks.filter((t) => t.id !== task.id))
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to complete task',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  const handleDelete = async (task: TodoistTask) => {
    if (!client) return

    try {
      await client.deleteTask(task.id)
      await showHUD('✓ Task deleted')
      setTasks(tasks.filter((t) => t.id !== task.id))
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to delete task',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  const handleSchedule = async (task: TodoistTask, dueString: string) => {
    if (!client) return

    try {
      await client.updateTaskDue(task.id, dueString)
      await showHUD(`✓ Scheduled for ${dueString}`)
      await fetchData()
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to schedule task',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  const handleMoveToProject = async (task: TodoistTask, project: TodoistProject) => {
    if (!client) return

    try {
      await client.moveTask(task.id, project.id)
      await showHUD(`✓ Moved to ${project.name}`)
      setTasks(tasks.filter((t) => t.id !== task.id))
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to move task',
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
    <List isLoading={isLoading} searchBarPlaceholder="Filter inbox tasks...">
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView
          title="Inbox Zero!"
          description="No tasks in your inbox. Well done! 🎉"
          icon={Icon.Inbox}
        />
      ) : (
        <List.Section title={`Inbox (${tasks.length})`} subtitle="Oldest first">
          {tasks.map((task) => (
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
                {
                  tag: {
                    value: new Date(task.created_at).toLocaleDateString(),
                    color: Color.SecondaryText,
                  },
                  tooltip: 'Created',
                },
                {
                  icon: {
                    source: Icon.Dot,
                    tintColor: getPriorityColor(task.priority),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Quick Actions">
                    <Action
                      title="Complete"
                      icon={Icon.CheckCircle}
                      onAction={() => handleComplete(task)}
                    />
                    <Action
                      title="Schedule for Today"
                      icon={Icon.Calendar}
                      shortcut={{ modifiers: ['cmd'], key: 't' }}
                      onAction={() => handleSchedule(task, 'today')}
                    />
                    <Action
                      title="Schedule for Tomorrow"
                      icon={Icon.Calendar}
                      shortcut={{ modifiers: ['cmd'], key: 'y' }}
                      onAction={() => handleSchedule(task, 'tomorrow')}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Move to Project">
                    {projects.slice(0, 8).map((project) => (
                      <Action
                        key={project.id}
                        title={project.name}
                        icon={Icon.Folder}
                        onAction={() => handleMoveToProject(task, project)}
                      />
                    ))}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="More Schedule Options">
                    <Action
                      title="Next Week"
                      icon={Icon.Calendar}
                      onAction={() => handleSchedule(task, 'next monday')}
                    />
                    <Action
                      title="In 3 Days"
                      icon={Icon.Calendar}
                      onAction={() => handleSchedule(task, 'in 3 days')}
                    />
                    <Action
                      title="Someday"
                      icon={Icon.Calendar}
                      onAction={() => handleSchedule(task, 'in 30 days')}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title="Delete"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                      onAction={() => handleDelete(task)}
                    />
                    <Action.OpenInBrowser title="Open in Todoist" url={task.url} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ['cmd'], key: 'r' }}
                      onAction={fetchData}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  )
}
