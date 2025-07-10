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
              width: 100px;
              height: 90px;
              overflow: hidden;
            }
            img, svg {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>${content}</body>
      </html>`}
      style={{
        width: '100px',
        height: '90px',
        border: 'none',
        overflow: 'hidden',
      }}
    />
  );
});
