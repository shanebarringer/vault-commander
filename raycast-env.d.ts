/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Vault Path - Path to your Obsidian vault */
  "vaultPath": string,
  /** Todoist API Key - Todoist API key for task management features (task, tasks, inbox commands) */
  "todoistApiKey"?: string
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
  /** Preferences accessible in the `task` command */
  export type Task = ExtensionPreferences & {}
  /** Preferences accessible in the `tasks` command */
  export type Tasks = ExtensionPreferences & {}
  /** Preferences accessible in the `inbox` command */
  export type Inbox = ExtensionPreferences & {}
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
  /** Arguments passed to the `task` command */
  export type Task = {}
  /** Arguments passed to the `tasks` command */
  export type Tasks = {}
  /** Arguments passed to the `inbox` command */
  export type Inbox = {}
}

