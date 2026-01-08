import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchIndex, SearchResult } from '../../types'

// Use vi.hoisted to ensure mock is available during hoisting
const { MockAnthropic, mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  // Must use a proper class/function constructor
  class MockAnthropic {
    messages = { create: mockCreate }
    constructor(_config: { apiKey: string }) {}
  }
  return { MockAnthropic, mockCreate }
})

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: MockAnthropic,
}))

// Mock the search module
vi.mock('../../lib/search', () => ({
  searchVault: vi.fn(),
}))

import Anthropic from '@anthropic-ai/sdk'
import {
  askVault,
  createClaudeClient,
  findRelevantContext,
  generateReflection,
  summarizeNotes,
} from '../../lib/claude'
import { searchVault } from '../../lib/search'

const mockSearchVault = vi.mocked(searchVault)

describe('claude', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createClaudeClient', () => {
    it('should create an Anthropic client with the provided API key', () => {
      const client = createClaudeClient('test-api-key')
      // Verify client is an instance with expected shape
      expect(client).toBeDefined()
      expect(client.messages).toBeDefined()
      expect(client.messages.create).toBeDefined()
    })
  })

  describe('findRelevantContext', () => {
    // SearchIndex is readonly IndexEntry[]
    const mockIndex: SearchIndex = []

    it('should return formatted context from search results', () => {
      const mockResults: SearchResult[] = [
        { path: '/vault/note1.md', filename: 'note1.md', preview: 'Content 1', score: 0.1 },
        { path: '/vault/note2.md', filename: 'note2.md', preview: 'Content 2', score: 0.2 },
      ]
      mockSearchVault.mockReturnValue(mockResults)

      const result = findRelevantContext(mockIndex, 'test query')

      expect(mockSearchVault).toHaveBeenCalledWith(mockIndex, 'test query')
      expect(result).toContain('[Note 1: note1.md]')
      expect(result).toContain('Content 1')
      expect(result).toContain('[Note 2: note2.md]')
      expect(result).toContain('Content 2')
    })

    it('should return message when no results found', () => {
      mockSearchVault.mockReturnValue([])

      const result = findRelevantContext(mockIndex, 'no results')

      expect(result).toBe('No relevant notes found in the vault.')
    })

    it('should limit results to 5 notes', () => {
      const mockResults: SearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        path: `/vault/note${i}.md`,
        filename: `note${i}.md`,
        preview: `Content ${i}`,
        score: i * 0.1,
      }))
      mockSearchVault.mockReturnValue(mockResults)

      const result = findRelevantContext(mockIndex, 'many results')

      // Should only have 5 notes
      expect(result.match(/\[Note \d+:/g)?.length).toBe(5)
      expect(result).toContain('[Note 5:')
      expect(result).not.toContain('[Note 6:')
    })
  })

  describe('askVault', () => {
    const mockIndex: SearchIndex = []

    it('should call Claude API with question and context', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test answer' }],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      mockSearchVault.mockReturnValue([
        { path: '/vault/note.md', filename: 'note.md', preview: 'Relevant content', score: 0.1 },
      ])

      const result = await askVault(mockClient, mockIndex, 'What is X?')

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('What is X?'),
            }),
          ]),
        })
      )
      expect(result).toBe('Test answer')
    })

    it('should return fallback when no text response', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', id: 'test' }],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      mockSearchVault.mockReturnValue([])

      const result = await askVault(mockClient, mockIndex, 'Question')

      expect(result).toBe('Unable to generate response.')
    })
  })

  describe('summarizeNotes', () => {
    it('should summarize with brief style by default', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Brief summary' }],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      const result = await summarizeNotes(mockClient, 'Test content')

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('2-3 sentence summary'),
        })
      )
      expect(result).toBe('Brief summary')
    })

    it('should summarize with detailed style', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Detailed summary' }],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      await summarizeNotes(mockClient, 'Test content', 'detailed')

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('comprehensive summary'),
        })
      )
    })

    it('should summarize with bullets style', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '• Point 1\n• Point 2' }],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      await summarizeNotes(mockClient, 'Test content', 'bullets')

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('bullet points'),
        })
      )
    })
  })

  describe('generateReflection', () => {
    const mockIndex: SearchIndex = []

    it('should generate reflection without theme', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Reflection prompt' }],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      mockSearchVault.mockReturnValue([])

      const result = await generateReflection(mockClient, mockIndex)

      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Stoic philosophy'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('evening review'),
            }),
          ]),
        })
      )
      expect(result).toBe('Reflection prompt')
    })

    it('should generate reflection with theme', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Themed reflection' }],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      mockSearchVault.mockReturnValue([
        { path: '/vault/goals.md', filename: 'goals.md', preview: 'My goals', score: 0.1 },
      ])

      const result = await generateReflection(mockClient, mockIndex, 'productivity')

      expect(mockSearchVault).toHaveBeenCalledWith(mockIndex, 'productivity')
      expect(mockCreateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('productivity'),
            }),
          ]),
        })
      )
      expect(result).toBe('Themed reflection')
    })

    it('should return fallback when no text response', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [],
      })
      const mockClient = { messages: { create: mockCreateFn } } as unknown as Anthropic

      mockSearchVault.mockReturnValue([])

      const result = await generateReflection(mockClient, mockIndex)

      expect(result).toBe('Unable to generate reflection.')
    })
  })
})
