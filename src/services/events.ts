type Handler = (payload?: any) => void;

const map = new Map<string, Set<Handler>>();

export function on(event: string, handler: Handler) {
  if (!map.has(event)) map.set(event, new Set());
  map.get(event)!.add(handler);
  return () => map.get(event)!.delete(handler);
}

export function emit(event: string, payload?: any) {
  const set = map.get(event);
  if (!set) return;
  for (const h of set) {
    try {
      h(payload);
    } catch (e) {
      console.error(e);
    }
  }
}
