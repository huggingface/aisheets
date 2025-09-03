import { detectMimeTypeFromBytes } from '~/usecases/utils/mime-types';

export type SupportedMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/ogg'
  | 'video/mp4'
  | 'video/webm'
  | 'video/ogg'
  | 'video/quicktime';

export type MimeCategory = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'UNKNOWN';

export const SUPPORTED_MIME_TYPES: Record<
  Exclude<MimeCategory, 'UNKNOWN'>,
  SupportedMimeType[]
> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
} as const;

export const isMimeTypeSupported = (
  mimeType: string | undefined,
): mimeType is SupportedMimeType => {
  if (!mimeType) return false;
  return Object.values(SUPPORTED_MIME_TYPES)
    .flat()
    .includes(mimeType as SupportedMimeType);
};

export const getMimeTypeCategory = (
  mimeType: string | undefined,
): MimeCategory => {
  if (!mimeType) return 'UNKNOWN';

  for (const [category, types] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (types.includes(mimeType as SupportedMimeType)) {
      return category as Exclude<MimeCategory, 'UNKNOWN'>;
    }
  }

  const generalType = mimeType.split('/')[0].toUpperCase();
  return generalType as MimeCategory;
};

export const detectMimeType = (bytes: Uint8Array, path: string): string => {
  // Try to detect from file extension first
  if (path) {
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext) {
      switch (ext) {
        // Video formats
        case 'mp4':
          return 'video/mp4';
        case 'webm':
          return 'video/webm';
        case 'ogv':
        case 'ogg':
          return 'video/ogg';
        case 'mov':
          return 'video/quicktime';
        // Audio formats
        case 'mp3':
          return 'audio/mpeg';
        case 'wav':
          return 'audio/wav';
        case 'oga':
          return 'audio/ogg';
        // Image formats
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'gif':
          return 'image/gif';
        case 'webp':
          return 'image/webp';
      }
    }
  }
  // Fallback to magic number detection
  return detectMimeTypeFromBytes(bytes);
};
