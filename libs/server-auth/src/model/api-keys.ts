import { randomBytes } from 'node:crypto'
import bcrypt from 'bcrypt'

/**
 * Generate API key prefix (hex string, 16 chars)
 * 8 random bytes -> 16 hex chars
 */
export function genApiKeyPrefix(): string {
  return randomBytes(8).toString('hex')
}

/**
 * Generate API key secret (hex string, 64 chars)
 * 32 random bytes -> 64 hex chars; under bcrypt 72-byte input limit
 */
export function genApiKeySecret(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Convenience: generate both prefix and secret
 */
export function genApiKeyPair(): { prefix: string; secret: string } {
  return { prefix: genApiKeyPrefix(), secret: genApiKeySecret() }
}

/**
 * Hash API key secret with bcrypt
 * Default salt rounds = 11 unless provided
 */
export async function hashApiKeySecret(secret: string, saltRounds = 11): Promise<string> {
  // secret is ASCII hex; length 64 chars by our generator, safe for bcrypt
  return bcrypt.hash(secret, saltRounds)
}

/**
 * Verify API key secret against stored bcrypt hash
 */
export async function verifyApiKeySecret(secret: string, secretHash: string): Promise<boolean> {
  return bcrypt.compare(secret, secretHash)
}

/**
 * Compose full API key value for display/transport
 */
export function composeFullApiKey(prefix: string, secret: string): string {
  return `${prefix}.${secret}`
}

/**
 * Split full API key value back to prefix/secret
 */
export function splitFullApiKey(full: string): { prefix: string; secret: string } | null {
  const dot = full.indexOf('.')
  if (dot <= 0 || dot === full.length - 1) {
    return null
  }
  return { prefix: full.slice(0, dot), secret: full.slice(dot + 1) }
}
