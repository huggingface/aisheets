import { component$ } from '@builder.io/qwik';

export const TableSandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      class="pointer-events-none"
      srcdoc={`<html>
        <head>
          <style>
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            img, svg {
              width: 100px;
              height: 90px;
              object-fit: contain;
              display: block;
            }
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
