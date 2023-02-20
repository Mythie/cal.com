/**
 * A simple timing function that returns a function that can be called
 * to log the time that an operation took.
 *
 * @note We don't use performance.now() since this should be isomorphic.
 */
export const timing = (message: string) => {
  const start = Date.now();

  return () => {
    const end = Date.now();

    console.debug(`[PERF]: ${message} took ${end - start}ms`);
  };
};
