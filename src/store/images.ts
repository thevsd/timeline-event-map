/**
 * A portrait a user adds is stored inside the document as a data: URL, so a timeline stays one
 * file. It is scaled down and compressed to a size limit on the way in: the file then grows by
 * a known amount per portrait, whatever the camera produced. Events take no stored pictures:
 * they show a pictogram, or a picture linked by its web address.
 */

/** What a stored picture may be: its longest side in pixels, and its size in bytes. */
export interface PictureLimit {
  side: number;
  bytes: number;
}

export const PORTRAIT: PictureLimit = { side: 480, bytes: 50_000 };

/** Tried in order until the picture fits; below the last one it is made smaller instead. */
const QUALITIES = [0.82, 0.72, 0.6];
/** A picture is never scaled below this share of its allowed side; a little over the limit is then accepted. */
const SMALLEST = 0.5;

/** Bytes a data: URL decodes to. */
export const dataUrlBytes = (url: string) => Math.round(((url.length - url.indexOf(',') - 1) * 3) / 4);

/** Read an image file and return it as a data: URL within `limit`. */
export async function imageToDataUrl(file: Blob, limit: PictureLimit): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const longest = Math.max(bitmap.width, bitmap.height);
    for (let side = Math.min(limit.side, longest); ; side = Math.round(side * 0.8)) {
      const scale = side / longest;
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let url = '';
      for (const quality of QUALITIES) {
        // WebP where the browser can write it; otherwise the call falls back to PNG, so ask for JPEG instead.
        url = canvas.toDataURL('image/webp', quality);
        if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
        if (dataUrlBytes(url) <= limit.bytes) return url;
      }
      if (side * 0.8 < limit.side * SMALLEST) return url;
    }
  } finally {
    bitmap.close();
  }
}

/** Whether a picture is stored in the document, as opposed to linked by its web address. */
export const isEmbedded = (image: string | undefined): image is string => !!image && image.startsWith('data:');
