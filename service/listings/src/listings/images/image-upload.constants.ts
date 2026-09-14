// Shared between the listings endpoints (create/update accept images inline)
// and the listing-images sub-resource endpoints (add/remove images later).
export const MAX_IMAGES_PER_LISTING = 3;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|webp)$/;

export const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
