/**
 * Todoist API client for Vault Commander
 *
 * Provides task management features:
 * - Quick task creation
 * - View today's tasks
 * - Inbox triage
 *
 * Uses Todoist REST API v2 directly (no SDK needed).
 *
 * @module todoist
 */

/** Todoist API base URL */
const API_BASE = 'https://api.todoist.com/rest/v2'

/** Todoist task interface */
export interface TodoistTask {
  readonly id: string
  readonly content: string
  readonly description: string
  readonly project_id: string
  readonly section_id: string | null
  readonly parent_id: string | null
  readonly order: number
  readonly priority: 1 | 2 | 3 | 4 // 1=normal, 4=urgent
  readonly due: {
    readonly date: string
    readonly string: string
    readonly datetime?: string
    readonly timezone?: string
  } | null
  readonly labels: readonly string[]
  readonly is_completed: boolean
  readonly created_at: string
  readonly url: string
}

/** Todoist project interface */
export interface TodoistProject {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly parent_id: string | null
  readonly order: number
  readonly is_favorite: boolean
  readonly is_inbox_project: boolean
  readonly view_style: string
  readonly url: string
}

/** Create task options */
export interface CreateTaskOptions {
  readonly content: string
  readonly description?: string
  readonly project_id?: string
  readonly due_string?: string
  readonly priority?: 1 | 2 | 3 | 4
  readonly labels?: readonly string[]
}

/**
 * Create Todoist API client
 */
export const createTodoistClient = (apiKey: string) => {
  if (!apiKey?.trim()) {
    throw new Error('Todoist API key is required')
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const fetchApi = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status} ${response.statusText}`)
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as T
  }

  return {
    /**
     * Get all tasks for today
     */
    getTodayTasks: async (): Promise<TodoistTask[]> => {
      return fetchApi<TodoistTask[]>('/tasks?filter=today')
    },

    /**
     * Get inbox tasks (no project assigned)
     */
    getInboxTasks: async (): Promise<TodoistTask[]> => {
      // First get the inbox project
      const projects = await fetchApi<TodoistProject[]>('/projects')
      const inbox = projects.find((p) => p.is_inbox_project)

      if (!inbox) {
        return []
      }

      return fetchApi<TodoistTask[]>(`/tasks?project_id=${inbox.id}`)
    },

    /**
     * Create a new task
     */
    createTask: async (options: CreateTaskOptions): Promise<TodoistTask> => {
      return fetchApi<TodoistTask>('/tasks', {
        method: 'POST',
        body: JSON.stringify(options),
      })
    },

    /**
     * Complete a task
     */
    completeTask: async (taskId: string): Promise<void> => {
      await fetchApi<void>(`/tasks/${taskId}/close`, {
        method: 'POST',
      })
    },

    /**
     * Move task to a project
     */
    moveTask: async (taskId: string, projectId: string): Promise<TodoistTask> => {
      return fetchApi<TodoistTask>(`/tasks/${taskId}`, {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId }),
      })
    },

    /**
     * Delete a task
     */
    deleteTask: async (taskId: string): Promise<void> => {
      await fetchApi<void>(`/tasks/${taskId}`, {
        method: 'DELETE',
      })
    },

    /**
     * Get all projects
     */
    getProjects: async (): Promise<TodoistProject[]> => {
      return fetchApi<TodoistProject[]>('/projects')
    },

    /**
     * Update task due date
     */
    updateTaskDue: async (taskId: string, dueString: string): Promise<TodoistTask> => {
      return fetchApi<TodoistTask>(`/tasks/${taskId}`, {
        method: 'POST',
        body: JSON.stringify({ due_string: dueString }),
      })
    },
  }
}

/** Todoist client type */
export type TodoistClient = ReturnType<typeof createTodoistClient>

/**
 * Format priority for display
 */
export const formatPriority = (priority: number): string => {
  const labels: Record<number, string> = {
    1: '',
    2: '!',
    3: '!!',
    4: '!!!',
  }
  return labels[priority] || ''
}

/**
 * Get priority color
 */
export const getPriorityColor = (priority: number): string => {
  const colors: Record<number, string> = {
    1: '#808080', // gray
    2: '#246fe0', // blue
    3: '#eb8909', // orange
    4: '#d1453b', // red
  }
  return colors[priority] || colors[1]
}
