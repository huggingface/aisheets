import {
  detectMimeType,
  getMimeTypeCategory,
  isMimeTypeSupported,
} from './mime-types';

export const createDataURI = async (
  bytes: Uint8Array,
  mimeType: string,
): Promise<string> => {
  const blob = new Blob([bytes], { type: mimeType });
  const reader = new FileReader();

  return new Promise<string>((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
};

export const processMediaContent = async (
  value: any,
  isExpanded = false,
): Promise<string | undefined> => {
  if (!value) return undefined;

  // Handle array of binary content
  if (Array.isArray(value)) {
    const allValue = await Promise.all(
      value.map((v) => processMediaContent(v, isExpanded)),
    );
    return allValue.filter(Boolean).join('\n');
  }

  // Handle binary content
  for (const key in value) {
    if (value[key] instanceof Uint8Array) {
      const bytes = value[key];
      const path = value.path ?? '';
      const mimeType = value.mimeType ?? detectMimeType(bytes, path);
      const category = getMimeTypeCategory(mimeType);

      try {
        const dataURI = await createDataURI(bytes, mimeType);

        if (!isMimeTypeSupported(mimeType)) {
          return createUnsupportedContent(category, mimeType, path);
        }

        const filenameDisplay = path
          ? `<div class="text-xs text-gray-500 mb-1">${path}</div>`
          : '';

        switch (category) {
          case 'VIDEO':
            return createVideoContent(
              dataURI,
              mimeType,
              filenameDisplay,
              isExpanded,
            );
          case 'AUDIO':
            return createAudioContent(dataURI, filenameDisplay, isExpanded);
          case 'IMAGE':
            return createImageContent(
              dataURI,
              path,
              filenameDisplay,
              isExpanded,
            );
          default:
            return createUnsupportedContent(category, mimeType, path);
        }
      } catch (error: unknown) {
        console.error('Error processing binary content:', error);
        return createErrorContent(error);
      }
    }
  }

  return undefined;
};

const createVideoContent = (
  dataURI: string,
  mimeType: string,
  filenameDisplay: string,
  isExpanded: boolean,
): string => {
  return `<div class="flex flex-col">
    ${filenameDisplay}
    <video controls playsinline style="width: 100%; max-width: ${isExpanded ? '100%' : '600px'};">
      <source src="${dataURI}" type="${mimeType}">
      Your browser does not support the video tag.
    </video>
  </div>`;
};

const createAudioContent = (
  dataURI: string,
  filenameDisplay: string,
  isExpanded: boolean,
): string => {
  return `<div class="flex flex-col">
    ${filenameDisplay}
    <audio controls src="${dataURI}" style="width: 100%; max-width: ${isExpanded ? '100%' : '400px'};"></audio>
  </div>`;
};

const createImageContent = (
  dataURI: string,
  path: string,
  filenameDisplay: string,
  isExpanded: boolean,
): string => {
  return `<div class="flex flex-col">
    ${filenameDisplay}
    <div class="relative w-full h-full flex items-center justify-center">
      <img 
        src="${dataURI}" 
        alt="${path}" 
        class="${isExpanded ? 'max-w-full h-auto' : 'max-w-full max-h-[80px] object-contain'} rounded-sm"
        style="width: auto;"
      />
    </div>
  </div>`;
};

const createUnsupportedContent = (
  category: string,
  mimeType: string,
  path: string,
): string => {
  return `<div class="unsupported-content">
    <p class="text-gray-500">
      ${category} content type not supported yet
      <br/>
      <span class="text-xs">${mimeType || 'Unknown type'}</span>
      ${path ? `<br/><span class="text-xs">File: ${path}</span>` : ''}
    </p>
  </div>`;
};

const createErrorContent = (error: unknown): string => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return `<div class="error-content">
    <p class="text-red-500">
      Error processing content
      <br/>
      <span class="text-xs">${errorMessage}</span>
    </p>
  </div>`;
};
