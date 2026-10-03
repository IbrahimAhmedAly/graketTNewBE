import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  constants,
  createHash,
  createPrivateKey,
  createPublicKey,
  KeyObject,
  privateDecrypt,
  sign,
} from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { envConfig } from '../../config/env.config';
import { deriveLicenseSigningKey } from './utils/license-crypto.util';

/** Default location, next to the JWT keys. Never commit this file. */
const DEFAULT_KEY_FILE = 'content-private.key';

/**
 * Holds the private half of the platform content key.
 *
 * The Graket encryptor wraps every file's content key with the matching
 * public key, so this key is the only thing that can open protected files.
 * If it is lost, every protected file must be encrypted again. Keep a backup
 * somewhere safe.
 *
 * The key is optional so the API still boots without it. Only license
 * requests fail.
 */
@Injectable()
export class ContentKeyService implements OnModuleInit {
  private readonly logger = new Logger(ContentKeyService.name);
  private privateKey: KeyObject | null = null;
  private signingKey: KeyObject | null = null;
  private keyId: Buffer | null = null;

  onModuleInit() {
    try {
      const pem = this.readPem();
      if (!pem) {
        this.logger.warn(
          'Protected content key not configured; desktop playback is disabled. ' +
            `Set CONTENT_PRIVATE_KEY, CONTENT_PRIVATE_KEY_PATH, or add ${DEFAULT_KEY_FILE}.`,
        );
        return;
      }

      const key = createPrivateKey(pem);
      if (key.asymmetricKeyType !== 'rsa') {
        throw new Error('the content key must be an RSA private key');
      }

      const spki = createPublicKey(key).export({ type: 'spki', format: 'der' });
      this.keyId = createHash('sha256').update(spki).digest().subarray(0, 8);
      this.signingKey = deriveLicenseSigningKey(key);
      this.privateKey = key;
      this.logger.log(
        `Protected content key loaded (key id ${this.keyId.toString('hex')})`,
      );
    } catch (error) {
      this.logger.error(
        `Protected content key could not be loaded; desktop playback is disabled: ${String(error)}`,
      );
    }
  }

  private readPem(): string | null {
    const { privateKey, privateKeyPath } = envConfig.contentProtection;

    // Hosting dashboards often store multi-line secrets with literal "\n".
    if (privateKey) return privateKey.replace(/\\n/g, '\n');

    const path = privateKeyPath ?? join(process.cwd(), DEFAULT_KEY_FILE);
    if (!existsSync(path)) {
      if (privateKeyPath) {
        throw new Error(`CONTENT_PRIVATE_KEY_PATH points to a missing file`);
      }
      return null;
    }
    return readFileSync(path, 'utf8');
  }

  isConfigured(): boolean {
    return this.privateKey !== null;
  }

  /** Whether a file header's key id names this key. */
  matchesKeyId(keyId: Buffer): boolean {
    return this.keyId !== null && this.keyId.equals(keyId);
  }

  /** Signs a license, so the player can tell it came from this server. */
  signLicense(message: Buffer): Buffer {
    if (!this.signingKey) throw new Error('Content key is not configured');
    return sign(null, message, this.signingKey);
  }

  /** Recovers a file's content key from its header. */
  unwrap(wrappedKey: Buffer): Buffer {
    if (!this.privateKey) throw new Error('Content key is not configured');

    const contentKey = privateDecrypt(
      {
        key: this.privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      wrappedKey,
    );
    if (contentKey.length !== 32) {
      throw new Error('Unwrapped content key has the wrong length');
    }
    return contentKey;
  }
}
