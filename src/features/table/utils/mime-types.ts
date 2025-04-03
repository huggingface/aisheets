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
  const header = bytes.slice(0, 16);

  // Video formats
  if (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return 'video/mp4';
  }
  if (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    return 'video/webm';
  }
  if (
    header[4] === 0x6d &&
    header[5] === 0x6f &&
    header[6] === 0x6f &&
    header[7] === 0x76
  ) {
    return 'video/quicktime';
  }

  // Audio formats
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46
  ) {
    return 'audio/wav';
  }

  // Image formats
  if (header[0] === 0xff && header[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return 'image/png';
  }

  return 'application/octet-stream';
};
