'use strict';

/**
 * Memory store
*/

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MemoryStore = exports.MemoryStore = function () {
  function MemoryStore() {
    _classCallCheck(this, MemoryStore);

    this._store = {};
  }

  /**
   * Parse valid JSON or return original value
  **/


  _createClass(MemoryStore, [{
    key: '_tryParseJSON',
    value: function _tryParseJSON(str) {
      try {
        str = JSON.parse(str);
      } catch (e) {}
      return str;
    }

    /**
     * Stringify JSON or return original value
    **/

  }, {
    key: '_tryStringifyJSON',
    value: function _tryStringifyJSON(obj) {
      try {
        obj = JSON.stringify(obj);
      } catch (e) {}
      return obj;
    }

    /**
     * Set a key to a value
    **/

  }, {
    key: 'set',
    value: function set(key, value) {
      var override = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

      if (!this._store[key] || this._store[key] && override) {
        this._store[key] = this._tryStringifyJSON(value);
      }
    }

    /**
     * Get a key value, or the default if the key isn't set
    **/

  }, {
    key: 'get',
    value: function get(key) {
      var def = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

      if (this._store[key]) {
        return this._tryParseJSON(this._store[key]);
      }
      return def;
    }
  }]);

  return MemoryStore;
}();