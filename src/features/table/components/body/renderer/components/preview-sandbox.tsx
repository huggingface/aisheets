import { component$ } from '@builder.io/qwik';

export const PreviewSandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      class="pointer-events-none"
      srcdoc={`<html>
          <head>
            <style>
              body { margin: 0; padding: 0; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>${content}</body>
        </html>`}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        overflow: 'hidden',
      }}
    />
  );
});
