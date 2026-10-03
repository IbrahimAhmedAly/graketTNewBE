import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
} from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { deriveLicenseSigningKey } from '../src/modules/protected-content/utils/license-crypto.util';

/**
 * Creates the key for protected desktop content.
 *
 *   content-private.key          stays on the API server (never commit it)
 *   content-public.pem           goes into the Graket encryptor
 *                                (graket-desktop/encryptor/resources/)
 *   license-signing-public.pem   goes into the Graket player
 *                                (graket-desktop/player/resources/)
 *
 * The private key is the only thing that can open protected files. If it is
 * lost, every protected file has to be encrypted again, so back it up. The
 * license signing key is derived from it, so there is nothing else to keep.
 *
 * When content-private.key already exists it is left alone and only the two
 * public files are written again from it.
 */
const PRIVATE_KEY_FILE = join(process.cwd(), 'content-private.key');
const PUBLIC_KEY_FILE = join(process.cwd(), 'content-public.pem');
const SIGNING_PUBLIC_KEY_FILE = join(
  process.cwd(),
  'license-signing-public.pem',
);

/** Matches keyIdFor() in graket-desktop/shared/protected-format/format.ts. */
function keyId(publicKeyDer: Buffer): string {
  return createHash('sha256')
    .update(publicKeyDer)
    .digest()
    .subarray(0, 8)
    .toString('hex');
}

function main() {
  let privatePem: string;

  if (existsSync(PRIVATE_KEY_FILE)) {
    console.log(`${PRIVATE_KEY_FILE} already exists; keeping it.`);
    privatePem = readFileSync(PRIVATE_KEY_FILE, 'utf8');
  } else {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 3072 });
    privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    writeFileSync(PRIVATE_KEY_FILE, privatePem, { mode: 0o600, flag: 'wx' });
    console.log(`Wrote ${PRIVATE_KEY_FILE}`);
  }

  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(privateKey);
  writeFileSync(
    PUBLIC_KEY_FILE,
    publicKey.export({ type: 'spki', format: 'pem' }) as string,
  );
  console.log(`Wrote ${PUBLIC_KEY_FILE}`);

  const signingPublicKey = createPublicKey(deriveLicenseSigningKey(privateKey));
  writeFileSync(
    SIGNING_PUBLIC_KEY_FILE,
    signingPublicKey.export({ type: 'spki', format: 'pem' }) as string,
  );
  console.log(`Wrote ${SIGNING_PUBLIC_KEY_FILE}`);

  console.log(
    `Key id: ${keyId(publicKey.export({ type: 'spki', format: 'der' }))}`,
  );
  console.log(
    'Copy content-public.pem to graket-desktop/encryptor/resources/, ' +
      'license-signing-public.pem to graket-desktop/player/resources/, ' +
      'and back up content-private.key.',
  );
}

main();
