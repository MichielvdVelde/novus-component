'use strict';

/**
 * Memory store
*/
export class MemoryStore {

  constructor() {
    this._store = {};
  }

  /**
   * Set a key to a value
  **/
  set(key, value, override = true) {
    if((!this._store[key]) || (this._store[key] && override)) {
      this._store[key] = value;
    }
  }

  /**
   * Get a key value, or the default if the key isn't set
  **/
  get(key, def = null) {
    if(this._store[key]) {
      return this._store[key];
    }
    return def;
  }
}
