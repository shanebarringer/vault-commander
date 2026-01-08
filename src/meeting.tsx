/**
 * Vault Meeting - Import meeting notes from Granola
 *
 * Lists pending meeting notes from the configured meeting folder and
 * imports them to the Meeting Notes section of today's daily note.
 */

import { Action, ActionPanel, Icon, List, Toast, showHUD, showToast } from '@raycast/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type VaultCommanderConfig, getConfig } from './lib/config'
import {
  type MeetingNoteFile,
  importAllMeetingNotes,
  importMeetingNote,
  listMeetingNotes,
} from './lib/meeting'

export default function MeetingImport() {
  const [meetings, setMeetings] = useState<MeetingNoteFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load config safely
  const config = useMemo<VaultCommanderConfig | null>(() => {
    try {
      return getConfig()
    } catch {
      return null
    }
  }, [])

  // Load meeting notes
  const loadMeetings = useCallback(() => {
    if (!config?.meetingPath) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const files = listMeetingNotes(config.meetingPath)
      setMeetings(files)
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to load meeting notes',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }, [config?.meetingPath])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  // Import a single meeting note
  const handleImport = async (meeting: MeetingNoteFile) => {
    if (!config) return

    try {
      importMeetingNote(config, meeting)
      await showHUD(`✓ Imported: ${meeting.title}`)
      // Remove from list
      setMeetings((prev) => prev.filter((m) => m.filename !== meeting.filename))
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Import all meeting notes
  const handleImportAll = async () => {
    if (!config?.meetingPath) return

    try {
      const results = importAllMeetingNotes(config, config.meetingPath)
      await showHUD(`✓ Imported ${results.length} meeting notes`)
      setMeetings([])
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Bulk import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Missing meeting path configuration
  if (!config?.meetingPath) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Calendar}
          title="Meeting Path Not Configured"
          description="Set the Meeting Notes Path in extension preferences to import notes from Granola"
        />
      </List>
    )
  }

  // No meeting notes found
  if (!isLoading && meetings.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Pending Meeting Notes"
          description={`No new meeting notes found in ${config.meetingPath}`}
        />
      </List>
    )
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={`${meetings.length} Pending Meeting Notes`}>
        {meetings.map((meeting) => (
          <List.Item
            key={meeting.path}
            icon={Icon.Calendar}
            title={meeting.title}
            subtitle={meeting.filename}
            accessories={[
              {
                date: meeting.timestamp,
                tooltip: `Modified: ${meeting.timestamp.toLocaleString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Download}
                  title="Import to Daily Note"
                  onAction={() => handleImport(meeting)}
                />
                <Action
                  icon={Icon.Download}
                  title="Import All"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'return' }}
                  onAction={handleImportAll}
                />
                <Action
                  icon={Icon.Eye}
                  title="Preview Content"
                  shortcut={{ modifiers: ['cmd'], key: 'p' }}
                  onAction={() =>
                    showToast({
                      style: Toast.Style.Success,
                      title: meeting.title,
                      message: meeting.content.slice(0, 200),
                    })
                  }
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  onAction={loadMeetings}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}
