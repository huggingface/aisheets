import { appConfig } from '~/config';

const _HF_DEFAULT_ENDPOINT = 'https://huggingface.co';
const ENDPOINT = (process.env.HF_ENDPOINT ?? _HF_DEFAULT_ENDPOINT).trim();

const { enableTelemetry } = appConfig;

const buildUserAgent = (userAgent: Record<string, string>): string => {
  const parts = [];
  for (const [key, value] of Object.entries(userAgent)) {
    parts.push(`${key}/${value}`);
  }
  return parts.join(';');
};

const hashedUsername = async (username: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(username);

  // Simple hash function (SHA-256)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const sendTelemetry = async (
  topic: string,
  username: string,
  userAgent: Record<string, any>,
) => {
  if (!enableTelemetry) return;

  try {
    const hashedUser = await hashedUsername(username);
    const response = await fetch(`${ENDPOINT}/api/telemetry/${topic}`, {
      method: 'HEAD',
      headers: {
        'user-agent': buildUserAgent({
          aisheets: '1.0.0',
          userHash: hashedUser,
          ...userAgent,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send telemetry for topic ${topic}: ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error(`Error sending telemetry for topic ${topic}:`, error);
  }
};
