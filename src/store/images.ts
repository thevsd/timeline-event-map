/**
 * Pictures a user adds are stored inside the document as data: URLs, so a timeline stays one
 * file. They are scaled down on the way in to keep that file small.
 */

/** Longest side, in pixels, of a stored picture. */
export const EVENT_IMAGE_SIDE = 720;
export const PORTRAIT_SIDE = 480;

const QUALITY = 0.82;

/** Read an image file and return it as a data: URL no larger than `maxSide` on its longest side. */
export async function imageToDataUrl(file: Blob, maxSide: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // WebP where the browser can write it; otherwise the call falls back to PNG, so ask for JPEG instead.
    const webp = canvas.toDataURL('image/webp', QUALITY);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', QUALITY);
  } finally {
    bitmap.close();
  }
}
