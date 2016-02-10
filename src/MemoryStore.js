'use strict';

/**
 * Memory store
*/
export class MemoryStore {

  constructor() {
    this._store = {};
  }

  /**
   * Parse valid JSON or return original value
  **/
  _tryParseJSON(str) {
    try {
      str = JSON.parse(str);
    }
    catch(e) { }
    return str;
  }

  /**
   * Stringify JSON or return original value
  **/
  _tryStringifyJSON(obj) {
    try {
      obj = JSON.stringify(obj);
    }
    catch(e) { }
    return obj;
  }

  /**
   * Set a key to a value
  **/
  set(key, value, override = true) {
    if((!this._store[key]) || (this._store[key] && override)) {
      this._store[key] = this.__tryStringifyJSON(value);
    }
  }

  /**
   * Get a key value, or the default if the key isn't set
  **/
  get(key, def = null) {
    if(this._store[key]) {
      return this._tryParseJSON(this._store[key]);
    }
    return def;
  }
}
