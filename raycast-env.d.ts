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
  "claudeApiKey"?: string
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
}

