export function safeAsync(
  fn: () => Promise<void>,
  onError?: (e: any) => void
) {
  fn().catch((e) => {
    console.error(e);
    onError?.(e);
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  tries = 5,
  delay = 80
): Promise<T> {
  let last;

  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }

  throw last;
}
