import { component$ } from '@builder.io/qwik';

export const TableSandbox = component$<{ content: string }>(({ content }) => {
  const escapedContent = content.replace(/<\/script>/g, '<\\/script>');

  return (
    <div
      class="table-sandbox-content"
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        fontSize: '14px',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
      dangerouslySetInnerHTML={escapedContent}
    />
  );
});
