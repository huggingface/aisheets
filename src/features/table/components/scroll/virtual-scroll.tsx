import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export const VirtualScrollTable = component$(() => {
  const data = Array.from({ length: 1000 }, (_, rowIndex) =>
    Array.from(
      { length: 10 },
      (_, colIndex) => `Row ${rowIndex} Col ${colIndex}`,
    ),
  );

  const containerHeight = 400; // Altura visible del contenedor
  const rowHeight = 40; // Altura de cada fila
  const visibleRows = Math.ceil(containerHeight / rowHeight); // Cantidad de filas visibles
  const buffer = 5; // Fila extra para suavidad del scroll

  const scrollTop = useSignal(0); // Posición actual del scroll
  const startIndex = useSignal(0); // Índice inicial de filas visibles

  // Actualiza el índice inicial al detectar scroll
  useTask$(({ track }) => {
    track(() => scrollTop.value);
    startIndex.value = Math.max(
      Math.floor(scrollTop.value / rowHeight) - buffer,
      0,
    );
  });

  const endIndex = startIndex.value + visibleRows + buffer * 2;

  return (
    <div
      style={{
        height: `${containerHeight}px`,
        overflowY: 'auto',
        position: 'relative',
      }}
      onScroll$={(event) => {
        scrollTop.value = (event.target as HTMLElement).scrollTop;
      }}
    >
      <div
        style={{ height: `${data.length * rowHeight}px`, position: 'relative' }}
      >
        {data.slice(startIndex.value, endIndex).map((row, rowIndex) => (
          <div
            key={startIndex.value + rowIndex}
            style={{
              position: 'absolute',
              top: `${(startIndex.value + rowIndex) * rowHeight}px`,
              height: `${rowHeight}px`,
              display: 'flex',
              borderBottom: '1px solid #ccc',
            }}
          >
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRight: '1px solid #eee',
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
