/**
 * Helper script to generate password hash for seeding
 * Usage: tsx src/infrastructure/db/seeds/generate-password-hash.ts
 */

import crypto from 'crypto'

// Password to hash
const password = 'Password'

// BetterAuth uses this function internally
// Simulating bcrypt-like hash with crypto (for demonstration)
// In production, BetterAuth uses its own hashing
async function hashPassword(password: string): Promise<string> {
  // BetterAuth internally uses bcrypt or similar
  // For seeding, we'll use a simpler approach that works with BetterAuth's validation

  // Generate a salt
  const salt = crypto.randomBytes(16).toString('hex')

  // Hash the password with salt using pbkdf2
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')

  // Return in a format similar to bcrypt: $algorithm$cost$salt$hash
  return `$pbkdf2$10000$${salt}$${hash}`
}

hashPassword(password).then(hash => {
  console.log('Password:', password)
  console.log('Hash:', hash)
  console.log('\nNote: BetterAuth uses bcrypt internally.')
  console.log('For proper seeding, we need to use BetterAuth API or bcrypt library.')
})
