import {
  createCipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  KeyObject,
} from 'crypto';

/**
 * Seals a content key for one player, for one request.
 *
 * The content key is never sent as plain bytes, not even inside TLS: a
 * student who installs an intercepting proxy and trusts its root certificate
 * can read TLS traffic. The player sends a fresh X25519 public key with each
 * license request. The content key is sealed under a key derived from the
 * shared secret, which only the requesting player can recompute:
 *
 *   wrapKey = HKDF-SHA256(X25519 shared secret, salt = fileId,
 *                         info = "graket-license-v1:" + contentId)
 *   sealed  = AES-256-GCM(wrapKey, iv, aad = fileId, contentKey) || tag
 *
 * Every license is also signed (Ed25519) over all of its fields, including the
 * player's public key. A proxy that swaps in its own key therefore cannot hand
 * the player a license it will accept. The signing key is derived from the
 * content private key, so there is still only one secret to deploy; the
 * player is built with its public half.
 *
 * The player half lives in graket-desktop/shared/protected-format/license.ts.
 * Keep the two in step.
 */
export const LICENSE_INFO_PREFIX = 'graket-license-v1:';
const SIGNATURE_LABEL = 'graket-license-v1';
const SIGNING_KEY_SALT = 'graket-license-signing';
const SIGNING_KEY_INFO = 'ed25519-seed-v1';
/** PKCS#8 DER prefix of an Ed25519 private key; the 32-byte seed follows it. */
const ED25519_PKCS8_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);

export interface SealedLicense {
  fileId: string;
  serverPublicKey: string;
  iv: string;
  wrappedKey: string;
  signature: string;
}

export class InvalidClientKeyError extends Error {}

/** The license signing key, derived from the content private key. */
export function deriveLicenseSigningKey(
  contentPrivateKey: KeyObject,
): KeyObject {
  const der = contentPrivateKey.export({ type: 'pkcs8', format: 'der' });
  const seed = Buffer.from(
    hkdfSync('sha256', der, SIGNING_KEY_SALT, SIGNING_KEY_INFO, 32),
  );
  const pkcs8 = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
  try {
    return createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  } finally {
    der.fill(0);
    seed.fill(0);
    pkcs8.fill(0);
  }
}

/** The bytes that get signed: every field of the exchange, each prefixed with its length. */
export function licenseSigningMessage(
  contentId: string,
  clientPublicKey: string,
  license: Omit<SealedLicense, 'signature'>,
): Buffer {
  const fields = [
    Buffer.from(SIGNATURE_LABEL, 'utf8'),
    Buffer.from(contentId, 'utf8'),
    Buffer.from(license.fileId, 'hex'),
    Buffer.from(clientPublicKey, 'base64'),
    Buffer.from(license.serverPublicKey, 'base64'),
    Buffer.from(license.iv, 'base64'),
    Buffer.from(license.wrappedKey, 'base64'),
  ];
  return Buffer.concat(
    fields.flatMap((field) => {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(field.length);
      return [length, field];
    }),
  );
}

function importClientKey(spkiBase64: string): KeyObject {
  try {
    const key = createPublicKey({
      key: Buffer.from(spkiBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    if (key.asymmetricKeyType === 'x25519') return key;
  } catch {
    // Reported below with the same error as a key of the wrong type.
  }
  throw new InvalidClientKeyError('clientPublicKey must be an X25519 key');
}

export function sealLicense(
  contentKey: Buffer,
  fileId: Buffer,
  contentId: string,
  clientPublicKey: string,
  sign: (message: Buffer) => Buffer,
): SealedLicense {
  const clientKey = importClientKey(clientPublicKey);
  const ephemeral = generateKeyPairSync('x25519');

  const shared = diffieHellman({
    privateKey: ephemeral.privateKey,
    publicKey: clientKey,
  });
  const wrapKey = Buffer.from(
    hkdfSync(
      'sha256',
      shared,
      fileId,
      Buffer.from(LICENSE_INFO_PREFIX + contentId, 'utf8'),
      32,
    ),
  );
  shared.fill(0);

  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', wrapKey, iv, {
      authTagLength: 16,
    });
    cipher.setAAD(fileId);
    const sealed = Buffer.concat([
      cipher.update(contentKey),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    const license = {
      fileId: fileId.toString('hex'),
      serverPublicKey: ephemeral.publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64'),
      iv: iv.toString('base64'),
      wrappedKey: sealed.toString('base64'),
    };
    const signature = sign(
      licenseSigningMessage(contentId, clientPublicKey, license),
    );
    return { ...license, signature: signature.toString('base64') };
  } finally {
    wrapKey.fill(0);
  }
}
