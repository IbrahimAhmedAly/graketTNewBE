import * as bcrypt from 'bcrypt';

/**
 * Default number of salt rounds for bcrypt
 */
export const DEFAULT_SALT_ROUNDS = 12;

/**
 * Hashes a password using bcrypt
 * @param password - The plain text password to hash
 * @param saltRounds - The number of salt rounds to use (default: 12)
 * @returns Promise containing the hashed password
 */
export async function hashPassword(
  password: string,
  saltRounds: number = DEFAULT_SALT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plain text password with a hashed password
 * @param plainPassword - The plain text password to check
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise containing a boolean indicating if the passwords match
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
