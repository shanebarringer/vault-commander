/**
 * Claude API client for Vault Commander
 *
 * Provides AI-powered features using Anthropic's Claude API:
 * - Vault querying (ask questions about your notes)
 * - Note summarization
 * - Stoic reflection prompts
 *
 * @module claude
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SearchIndex } from '../types'
import { searchVault } from './search'

/** Default model for Claude API calls */
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022'

/** Max tokens for response generation */
const MAX_TOKENS = 4096

/** Number of relevant notes to include as context */
const CONTEXT_NOTES_LIMIT = 8

/**
 * Create Claude API client
 */
export const createClaudeClient = (apiKey: string): Anthropic => {
  return new Anthropic({ apiKey })
}

/**
 * Extract text content from Claude message response
 *
 * Claude responses contain an array of content blocks. This helper
 * finds the first text block and extracts its content.
 */
const extractTextResponse = (message: Anthropic.Message, fallback: string): string => {
  const textBlock = message.content.find((block) => block.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : fallback
}

/**
 * Find relevant context from vault for a query
 */
export const findRelevantContext = (index: SearchIndex, query: string): string => {
  const results = searchVault(index, query).slice(0, CONTEXT_NOTES_LIMIT)

  if (results.length === 0) {
    return 'No relevant notes found in the vault.'
  }

  return results.map((r, i) => `[Note ${i + 1}: ${r.filename}]\n${r.preview}`).join('\n\n')
}

/**
 * Ask a question about your vault
 */
export const askVault = async (
  client: Anthropic,
  index: SearchIndex,
  question: string
): Promise<string> => {
  const context = findRelevantContext(index, question)

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are a helpful assistant that answers questions based on the user's personal notes from their Obsidian vault.
Use the provided context from their notes to answer questions accurately.
If the context doesn't contain relevant information, say so honestly.
Keep responses concise and actionable.`,
    messages: [
      {
        role: 'user',
        content: `Here are relevant excerpts from my notes:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
  })

  return extractTextResponse(message, 'Unable to generate response.')
}

/**
 * Summarize a note or collection of notes
 */
export const summarizeNotes = async (
  client: Anthropic,
  content: string,
  style: 'brief' | 'detailed' | 'bullets' = 'brief'
): Promise<string> => {
  const styleInstructions = {
    brief: 'Provide a 2-3 sentence summary capturing the key points.',
    detailed: 'Provide a comprehensive summary with all important details.',
    bullets: 'Summarize as bullet points, one per key insight or action item.',
  }

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are an expert at summarizing personal notes and knowledge. ${styleInstructions[style]}`,
    messages: [
      {
        role: 'user',
        content: `Please summarize the following notes:\n\n${content}`,
      },
    ],
  })

  return extractTextResponse(message, 'Unable to generate summary.')
}

/**
 * Generate a Stoic reflection prompt based on vault content
 */
export const generateReflection = async (
  client: Anthropic,
  index: SearchIndex,
  theme?: string
): Promise<string> => {
  // Find recent notes for context
  const context = theme ? findRelevantContext(index, theme) : findRelevantContext(index, '')

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are a thoughtful guide versed in Stoic philosophy.
Generate a reflection prompt that helps the user think deeply about their work, goals, or personal growth.
Draw inspiration from Stoic thinkers like Marcus Aurelius, Seneca, and Epictetus.
The prompt should be personal and actionable, not abstract philosophy.
Keep it concise - one powerful question or observation that invites genuine reflection.`,
    messages: [
      {
        role: 'user',
        content: theme
          ? `Based on my recent notes about "${theme}":\n\n${context}\n\nGenerate a Stoic reflection prompt that connects to this theme.`
          : `Based on my recent notes:\n\n${context}\n\nGenerate a Stoic reflection prompt for my evening review.`,
      },
    ],
  })

  return extractTextResponse(message, 'Unable to generate reflection.')
}

// Export types
export type SummaryStyle = 'brief' | 'detailed' | 'bullets'
