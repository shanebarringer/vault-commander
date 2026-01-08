/**
 * Vault Voice - Import voice transcriptions from Superwhisper
 *
 * Lists pending transcriptions from the configured voice folder and
 * allows importing them to the vault inbox with proper formatting.
 */

import { Action, ActionPanel, Icon, List, Toast, showHUD, showToast } from '@raycast/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type VaultCommanderConfig, getConfig } from './lib/config'
import {
  type TranscriptionFile,
  importAllTranscriptions,
  importTranscription,
  listTranscriptions,
} from './lib/voice'

export default function VoiceImport() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load config safely
  const config = useMemo<VaultCommanderConfig | null>(() => {
    try {
      return getConfig()
    } catch {
      return null
    }
  }, [])

  // Load transcriptions
  const loadTranscriptions = useCallback(() => {
    if (!config?.voicePath) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const files = listTranscriptions(config.voicePath)
      setTranscriptions(files)
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to load transcriptions',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [config?.voicePath])

  useEffect(() => {
    loadTranscriptions()
  }, [loadTranscriptions])

  // Import a single transcription
  const handleImport = async (transcription: TranscriptionFile) => {
    if (!config) return

    try {
      const result = importTranscription(config, transcription)
      await showHUD(`✓ Imported: ${result.noteFilename}`)
      // Remove from list
      setTranscriptions((prev) => prev.filter((t) => t.filename !== transcription.filename))
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Import all transcriptions
  const handleImportAll = async () => {
    if (!config?.voicePath) return

    try {
      const results = importAllTranscriptions(config, config.voicePath)
      await showHUD(`✓ Imported ${results.length} voice notes`)
      setTranscriptions([])
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Bulk import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Missing voice path configuration
  if (!config?.voicePath) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Microphone}
          title="Voice Path Not Configured"
          description="Set the Voice Transcription Path in extension preferences to import transcriptions from Superwhisper"
        />
      </List>
    )
  }

  // No transcriptions found
  if (!isLoading && transcriptions.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Pending Transcriptions"
          description={`No new voice files found in ${config.voicePath}`}
        />
      </List>
    )
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={`${transcriptions.length} Pending Transcriptions`}>
        {transcriptions.map((transcription) => (
          <List.Item
            key={transcription.path}
            icon={Icon.Microphone}
            title={transcription.filename}
            subtitle={transcription.content.slice(0, 60).replace(/\n/g, ' ')}
            accessories={[
              {
                date: transcription.timestamp,
                tooltip: `Created: ${transcription.timestamp.toLocaleString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Download}
                  title="Import to Vault"
                  onAction={() => handleImport(transcription)}
                />
                <Action
                  icon={Icon.Download}
                  title="Import All"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'return' }}
                  onAction={handleImportAll}
                />
                <Action
                  icon={Icon.Eye}
                  title="Preview Full Content"
                  shortcut={{ modifiers: ['cmd'], key: 'p' }}
                  onAction={() =>
                    showToast({
                      style: Toast.Style.Success,
                      title: transcription.filename,
                      message: transcription.content.slice(0, 200),
                    })
                  }
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  onAction={loadTranscriptions}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}
