import { matchesDeclaredImageType } from './image-signature.util';

const asFile = (mimetype: string, buffer: Buffer): Express.Multer.File =>
  ({ mimetype, buffer }) as Express.Multer.File;

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('matchesDeclaredImageType', () => {
  it('accepts a buffer whose signature matches its mimetype', () => {
    expect(matchesDeclaredImageType(asFile('image/jpeg', JPEG))).toBe(true);
    expect(matchesDeclaredImageType(asFile('image/png', PNG))).toBe(true);
  });

  it('rejects a buffer whose signature does not match its mimetype', () => {
    expect(matchesDeclaredImageType(asFile('image/png', JPEG))).toBe(false);
  });

  it('rejects an unknown mimetype', () => {
    expect(matchesDeclaredImageType(asFile('image/gif', JPEG))).toBe(false);
  });

  it('rejects Object.prototype keys instead of invoking them', () => {
    for (const key of [
      'constructor',
      'toString',
      'hasOwnProperty',
      '__proto__',
    ]) {
      expect(matchesDeclaredImageType(asFile(key, JPEG))).toBe(false);
    }
  });
});
