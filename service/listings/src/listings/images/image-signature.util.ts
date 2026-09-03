// Nest's FileTypeValidator (see listings.controller.ts) only checks the
// client-supplied Content-Type header, which costs nothing to spoof - a
// renamed/relabelled file of any type sails through it. This checks the
// file's actual leading bytes against the signature its declared mimetype
// implies, as a second, content-based layer behind that header check.
// Map, not a plain object: lookup by the client-supplied mimetype never
// reaches Object.prototype members like `constructor`.
const SIGNATURES = new Map<string, (buf: Buffer) => boolean>([
  [
    'image/jpeg',
    (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  ],
  [
    'image/png',
    (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  ],
  [
    'image/webp',
    (buf) =>
      buf.length >= 12 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP',
  ],
]);

export function matchesDeclaredImageType(file: Express.Multer.File): boolean {
  const signature = SIGNATURES.get(file.mimetype);
  return signature !== undefined && signature(file.buffer);
}
