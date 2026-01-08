/**
 * Vault Scripts - Run automation scripts
 *
 * Lists and runs shell scripts from the configured scripts folder.
 * Scripts perform vault maintenance or automation tasks.
 */

import { Action, ActionPanel, Detail, Icon, List, Toast, showToast } from '@raycast/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type VaultCommanderConfig, getConfig } from './lib/config'
import { type ScriptFile, type ScriptResult, listScripts, runScript } from './lib/scripts'

export default function Scripts() {
  const [scripts, setScripts] = useState<ScriptFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [runningScript, setRunningScript] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ScriptResult | null>(null)
  const [lastScriptName, setLastScriptName] = useState<string | null>(null)

  // Load config safely
  const config = useMemo<VaultCommanderConfig | null>(() => {
    try {
      return getConfig()
    } catch {
      return null
    }
  }, [])

  // Load scripts
  const loadScripts = useCallback(() => {
    if (!config?.scriptsPath) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const files = listScripts(config.scriptsPath)
      setScripts(files)
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to load scripts',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [config?.scriptsPath])

  useEffect(() => {
    loadScripts()
  }, [loadScripts])

  // Run a script
  const handleRun = async (script: ScriptFile) => {
    setRunningScript(script.name)
    setLastResult(null)
    setLastScriptName(null)

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Running ${script.name}...`,
      })

      const result = runScript(script)
      setLastResult(result)
      setLastScriptName(script.name)

      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: `✓ ${script.name} completed`,
          message: `${result.duration}ms`,
        })
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `✗ ${script.name} failed`,
          message: result.error?.slice(0, 100),
        })
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Script execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setRunningScript(null)
    }
  }

  // Show result in detail view
  if (lastResult && lastScriptName) {
    const markdown = `# ${lastScriptName} ${lastResult.success ? '✓' : '✗'}

**Duration:** ${lastResult.duration}ms
**Status:** ${lastResult.success ? 'Success' : 'Failed'}

## Output
\`\`\`
${lastResult.output || '(no output)'}
\`\`\`
${lastResult.error ? `\n## Error\n\`\`\`\n${lastResult.error}\n\`\`\`` : ''}`

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.ArrowLeft}
              title="Back to Scripts"
              onAction={() => {
                setLastResult(null)
                setLastScriptName(null)
              }}
            />
            <Action
              icon={Icon.ArrowClockwise}
              title="Refresh Scripts"
              shortcut={{ modifiers: ['cmd'], key: 'r' }}
              onAction={() => {
                setLastResult(null)
                setLastScriptName(null)
                loadScripts()
              }}
            />
          </ActionPanel>
        }
      />
    )
  }

  // Missing scripts path configuration
  if (!config?.scriptsPath) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Terminal}
          title="Scripts Path Not Configured"
          description="Set the Scripts Path in extension preferences to run automation scripts"
        />
      </List>
    )
  }

  // No scripts found
  if (!isLoading && scripts.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Document}
          title="No Scripts Found"
          description={`No .sh scripts found in ${config.scriptsPath}`}
        />
      </List>
    )
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={`${scripts.length} Available Scripts`}>
        {scripts.map((script) => (
          <List.Item
            key={script.path}
            icon={script.executable ? Icon.Terminal : Icon.Document}
            title={script.name}
            subtitle={script.description}
            accessories={[
              runningScript === script.name
                ? { icon: Icon.Clock, tooltip: 'Running...' }
                : { icon: script.executable ? Icon.Check : Icon.Warning },
              {
                date: script.timestamp,
                tooltip: `Modified: ${script.timestamp.toLocaleString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action icon={Icon.Play} title="Run Script" onAction={() => handleRun(script)} />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  onAction={loadScripts}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}
