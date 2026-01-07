/**
 * Vitest setup file
 *
 * @raycast/api is aliased in vitest.config.ts to use our mock.
 * This file handles any global test setup.
 */

// Set test timezone for consistent date testing
process.env.TZ = 'America/Chicago'
