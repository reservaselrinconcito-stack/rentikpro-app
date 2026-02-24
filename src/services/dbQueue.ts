type Task<T> = () => Promise<T>;

let chain = Promise.resolve();

export function dbQueue<T>(task: Task<T>): Promise<T> {
  const run = async () => task();
  const next = chain.then(run, run);
  // Mantener viva la cola aunque falle un task
  chain = next.then(() => undefined, () => undefined);
  return next;
}
