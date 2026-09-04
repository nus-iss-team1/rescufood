// Nest's FileTypeValidator (see listings.controller.ts) only checks the
// client-supplied Content-Type header, which costs nothing to spoof - a
// renamed/relabelled file of any type sails through it. This checks the
// file's actual leading bytes against the signature its declared mimetype
// implies, as a second, content-based layer behind that header check.

function isJpeg(buf: Buffer): boolean {
  return (
    buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  );
}

function isPng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function isWebp(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  );
}

// Dispatch on literal cases so the client-supplied mimetype only ever
// selects a fixed checker, never an arbitrary property or method.
export function matchesDeclaredImageType(file: Express.Multer.File): boolean {
  const buf = file.buffer;
  switch (file.mimetype) {
    case 'image/jpeg':
      return isJpeg(buf);
    case 'image/png':
      return isPng(buf);
    case 'image/webp':
      return isWebp(buf);
    default:
      return false;
  }
}
