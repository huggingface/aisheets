import { component$ } from '@builder.io/qwik';

export const Sandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      srcdoc={`<html>
          <head>
            <style>
              body { margin: 0; padding: 0; maxHeight: 500px; maxWidth: 800px; }
              iframe { width: 100%; height: 100%; border: none; }
              svg { width: 100%; height: 100%; }
              img { max-width: 100%; height: auto; }
              pre { margin: 0; padding: 0; }
              code { font-family: monospace; }
            </style>
          </head>
          <body>${content}</body>
        </html>`}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
});
