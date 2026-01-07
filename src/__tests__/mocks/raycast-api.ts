/**
 * Mock for @raycast/api
 *
 * Provides stub implementations for testing lib code without Raycast runtime.
 * This file is aliased in vitest.config.ts to replace the actual package.
 */

// Test preferences - can be overridden in individual tests
export let mockPreferences = {
  vaultPath: '/Users/test/vault',
}

export const setMockPreferences = (prefs: typeof mockPreferences): void => {
  mockPreferences = prefs
}

export const getPreferenceValues = <T>(): T => mockPreferences as T

export const showHUD = async (_message: string): Promise<void> => {}

export const showToast = async (_options: {
  style?: string
  title: string
  message?: string
}): Promise<void> => {}

export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animated: 'animated',
  },
}

export const Clipboard = {
  copy: async (_text: string): Promise<void> => {},
  paste: async (): Promise<string> => '',
}

export const open = async (_url: string): Promise<void> => {}

// React component mocks (for when we need to test components later)
export const List = {
  Item: () => null,
  EmptyView: () => null,
}

export const Form = {
  TextField: () => null,
  TextArea: () => null,
  Dropdown: () => null,
}

export const ActionPanel = () => null
export const Action = () => null
