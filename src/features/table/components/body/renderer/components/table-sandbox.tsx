import { component$ } from '@builder.io/qwik';

export const TableSandbox = component$<{ content: string }>(({ content }) => {
  const escapedContent = content.replace(/<\/script>/g, '<\\/script>');

  return (
    <iframe
      title="HTML"
      class="pointer-events-none"
      srcdoc={`<html>
        <head>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
          </style>
        </head>
        <body>
          ${escapedContent}
          <script>
            (() => {
              const muteAll = () => {
                document.querySelectorAll('audio, video').forEach(el => {
                  el.muted = true;
                  el.volume = 0;
                });
              };
              muteAll();

              const observer = new MutationObserver(muteAll);
              observer.observe(document.body, { childList: true, subtree: true });
            })();
          </script>
        </body>
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
