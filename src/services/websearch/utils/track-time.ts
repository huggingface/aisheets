type GenericIdentityFn<T> = () => Promise<T>;

export const trackTime = async <T>(func: GenericIdentityFn<T>): Promise<T> => {
  const a = performance.now();

  try {
    return await func();
  } finally {
    const b = performance.now();
    console.log(`Execution time: ${b - a} milliseconds`);
  }
};
