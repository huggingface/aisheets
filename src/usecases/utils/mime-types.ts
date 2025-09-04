export const detectMimeTypeFromBytes = (bytes: Uint8Array): string => {
  const header = bytes.slice(0, 16);

  // Video formats
  if (
    header[4] === 0x66 && // 'f'
    header[5] === 0x74 && // 't'
    header[6] === 0x79 && // 'y'
    header[7] === 0x70 // 'p'
  ) {
    return 'video/mp4';
  }
  // Detect WebM (EBML header)
  if (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    return 'video/webm';
  }
  // Detect QuickTime (MOV) files: 'moov' at offset 4
  if (
    header[4] === 0x6d && // 'm'
    header[5] === 0x6f && // 'o'
    header[6] === 0x6f && // 'o'
    header[7] === 0x76 // 'v'
  ) {
    return 'video/quicktime';
  }

  // Detect JPEG: FF D8 at the start
  if (header[0] === 0xff && header[1] === 0xd8) {
    return 'image/jpeg';
  }
  // Detect PNG: 89 50 4E 47 at the start
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    header[0] === 0x52 && // 'R'
    header[1] === 0x49 && // 'I'
    header[2] === 0x46 && // 'F'
    header[3] === 0x46 &&
    header[8] === 0x57 && // 'W'
    header[9] === 0x45 && // 'E'
    header[10] === 0x42 && // 'B'
    header[11] === 0x50 // 'P'
  ) {
    return 'image/webp';
  }

  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }
  if (
    header[0] === 0x52 && // 'R'
    header[1] === 0x49 && // 'I'
    header[2] === 0x46 && // 'F'
    header[3] === 0x46 &&
    header[8] === 0x57 && // 'W'
    header[9] === 0x41 && // 'A'
    header[10] === 0x56 && // 'V'
    header[11] === 0x45 // 'E'
  ) {
    return 'audio/wav';
  }

  return 'application/octet-stream';
};
