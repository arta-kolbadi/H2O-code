/** Small typed-by-contract in-process event bus shared by CLI and Dashboard. */
export class EventBus {
  #listeners = new Map();
  on(type, listener) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function");
    const set = this.#listeners.get(type) || new Set();
    set.add(listener);
    this.#listeners.set(type, set);
    return () => this.off(type, listener);
  }
  off(type, listener) {
    const set = this.#listeners.get(type);
    if (!set) return;
    set.delete(listener);
    if (!set.size) this.#listeners.delete(type);
  }
  emit(type, payload = {}) {
    const event = Object.freeze({ type, at: new Date().toISOString(), ...payload });
    for (const listener of this.#listeners.get(type) || []) {
      try { listener(event); } catch (error) {
        for (const listener of this.#listeners.get("listener.error") || []) {
          try { listener({ type: "listener.error", sourceType: type, error }); } catch {}
        }
      }
    }
    for (const listener of this.#listeners.get("*") || []) {
      try { listener(event); } catch {}
    }
    return event;
  }
}
