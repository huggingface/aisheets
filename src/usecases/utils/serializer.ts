export const bigIntStringify = (_: string, value: any) => {
  return typeof value === 'bigint' ? Number(value) : value;
};
