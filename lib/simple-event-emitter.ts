export type Listener = (...args: any[]) => void;

/**
 * Very small EventEmitter implementation that works in React Native.
 * Supports: on, off, once, emit.
 */
export class SimpleEventEmitter {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Listener) {
    const arr = this.listeners[event];
    if (!arr) return this;
    this.listeners[event] = arr.filter((l) => l !== listener);
    return this;
  }

  once(event: string, listener: Listener) {
    const wrapper: Listener = (...args: any[]) => {
      this.off(event, wrapper);
      listener(...args);
    };
    this.on(event, wrapper);
    return this;
  }

  emit(event: string, ...args: any[]) {
    const arr = this.listeners[event];
    if (!arr || arr.length === 0) return false;
    // Copy to avoid issues if listeners modify the array during emit
    [...arr].forEach((listener) => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`Error in listener for event "${event}":`, e);
      }
    });
    return true;
  }
}



