/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Vault Path - Path to your Obsidian vault */
  "vaultPath": string,
  /** Claude API Key - Anthropic API key for AI features (ask, summarize, reflect commands) */
  "claudeApiKey"?: string,
  /** Todoist API Key - Todoist API key for task management features (task, tasks, inbox commands) */
  "todoistApiKey"?: string,
  /** Voice Transcription Path - Folder where Superwhisper saves voice transcriptions */
  "voicePath"?: string,
  /** Meeting Notes Path - Folder where Granola exports meeting notes */
  "meetingPath"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `capture` command */
  export type Capture = ExtensionPreferences & {}
  /** Preferences accessible in the `today` command */
  export type Today = ExtensionPreferences & {}
  /** Preferences accessible in the `add` command */
  export type Add = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `ask` command */
  export type Ask = ExtensionPreferences & {}
  /** Preferences accessible in the `summarize` command */
  export type Summarize = ExtensionPreferences & {}
  /** Preferences accessible in the `reflect` command */
  export type Reflect = ExtensionPreferences & {}
  /** Preferences accessible in the `task` command */
  export type Task = ExtensionPreferences & {}
  /** Preferences accessible in the `tasks` command */
  export type Tasks = ExtensionPreferences & {}
  /** Preferences accessible in the `inbox` command */
  export type Inbox = ExtensionPreferences & {}
  /** Preferences accessible in the `voice` command */
  export type Voice = ExtensionPreferences & {}
  /** Preferences accessible in the `meeting` command */
  export type Meeting = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `capture` command */
  export type Capture = {}
  /** Arguments passed to the `today` command */
  export type Today = {}
  /** Arguments passed to the `add` command */
  export type Add = {}
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `ask` command */
  export type Ask = {}
  /** Arguments passed to the `summarize` command */
  export type Summarize = {}
  /** Arguments passed to the `reflect` command */
  export type Reflect = {}
  /** Arguments passed to the `task` command */
  export type Task = {}
  /** Arguments passed to the `tasks` command */
  export type Tasks = {}
  /** Arguments passed to the `inbox` command */
  export type Inbox = {}
  /** Arguments passed to the `voice` command */
  export type Voice = {}
  /** Arguments passed to the `meeting` command */
  export type Meeting = {}
}

