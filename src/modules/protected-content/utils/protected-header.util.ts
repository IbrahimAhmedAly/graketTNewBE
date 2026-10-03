/**
 * Reader for the header of a Graket protected file (.gkv video, .gkd PDF).
 *
 * The format is defined in graket-desktop/shared/protected-format/format.ts.
 * The server only ever reads the header (to unwrap the content key), never the
 * encrypted chunks, so this mirrors just that part. Keep the two in step if
 * the format changes.
 *
 *   offset  size  field
 *   0       4     magic "GRKP"
 *   4       1     version (1)
 *   5       1     kind (1 = MP4 video, 2 = PDF document)
 *   6       2     headerLength
 *   8       16    fileId
 *   24      8     keyId (first 8 bytes of SHA-256 over the wrapping key's SPKI)
 *   32      4     chunkSize
 *   36      8     plaintextSize
 *   44      7     noncePrefix
 *   51      1     reserved
 *   52      2     wrappedKeyLength
 *   54      n     wrappedKey (RSA-OAEP, SHA-256)
 */
export const PROTECTED_MAGIC = Buffer.from('GRKP', 'ascii');
export const PROTECTED_FORMAT_VERSION = 1;
export const PROTECTED_FIXED_HEADER_LENGTH = 54;
export const PROTECTED_MAX_HEADER_LENGTH = 4096;

export const ProtectedKind = {
  VIDEO: 1,
  PDF: 2,
} as const;

export interface ProtectedFileHeader {
  kind: number;
  headerLength: number;
  fileId: Buffer;
  keyId: Buffer;
  plaintextSize: number;
  wrappedKey: Buffer;
}

export class ProtectedHeaderError extends Error {}

/** Header length from the first 8 bytes, so a caller knows how much to read. */
export function peekProtectedHeaderLength(bytes: Buffer): number {
  if (bytes.length < 8 || !bytes.subarray(0, 4).equals(PROTECTED_MAGIC)) {
    throw new ProtectedHeaderError('Not a Graket protected file');
  }
  if (bytes.readUInt8(4) !== PROTECTED_FORMAT_VERSION) {
    throw new ProtectedHeaderError('Unsupported protected file version');
  }
  const headerLength = bytes.readUInt16BE(6);
  if (
    headerLength < PROTECTED_FIXED_HEADER_LENGTH ||
    headerLength > PROTECTED_MAX_HEADER_LENGTH
  ) {
    throw new ProtectedHeaderError('Invalid protected file header');
  }
  return headerLength;
}

export function parseProtectedHeader(bytes: Buffer): ProtectedFileHeader {
  const headerLength = peekProtectedHeaderLength(bytes);
  if (bytes.length < headerLength) {
    throw new ProtectedHeaderError('Protected file header is truncated');
  }

  const kind = bytes.readUInt8(5);
  if (kind !== ProtectedKind.VIDEO && kind !== ProtectedKind.PDF) {
    throw new ProtectedHeaderError('Unknown protected file kind');
  }

  const wrappedKeyLength = bytes.readUInt16BE(52);
  if (PROTECTED_FIXED_HEADER_LENGTH + wrappedKeyLength !== headerLength) {
    throw new ProtectedHeaderError('Invalid protected file header');
  }

  return {
    kind,
    headerLength,
    fileId: Buffer.from(bytes.subarray(8, 24)),
    keyId: Buffer.from(bytes.subarray(24, 32)),
    plaintextSize: Number(bytes.readBigUInt64BE(36)),
    wrappedKey: Buffer.from(
      bytes.subarray(PROTECTED_FIXED_HEADER_LENGTH, headerLength),
    ),
  };
}
