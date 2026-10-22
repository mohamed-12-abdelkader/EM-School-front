type Listener = () => void;

const unauthorizedListeners = new Set<Listener>();

export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function emitUnauthorized() {
  unauthorizedListeners.forEach((listener) => listener());
}
