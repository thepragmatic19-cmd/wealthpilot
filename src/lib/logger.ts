const isDev = process.env.NODE_ENV === "development";

export const logger = {
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
};
