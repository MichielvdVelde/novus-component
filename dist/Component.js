'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Component = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _mqtt = require('mqtt');

var mqtt = _interopRequireWildcard(_mqtt);

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _mqttRegex = require('mqtt-regex');

var _mqttRegex2 = _interopRequireDefault(_mqttRegex);

var _novusComponentStoreMemory = require('novus-component-store-memory');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Default options to use for new routes
**/
var DEFAULT_ROUTE_OPTIONS = {
  subscribe: true,
  once: false
};

/**
 * Component class
**/

var Component = function (_EventEmitter) {
  _inherits(Component, _EventEmitter);

  /**
   * Constructor
  **/

  function Component(componentId) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Component);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Component).call(this));

    _this._componentId = componentId;
    options.clientId = options.clientId || componentId;
    _this._options = options;
    _this._store = _this._options.store || new _novusComponentStoreMemory.MemoryStore();

    _this._connected = false;
    _this._mqtt = null;
    _this._routes = [];

    _this.methods = {};
    _this.plugins = {};
    return _this;
  }

  /**
   * Getter for the component ID
  **/


  _createClass(Component, [{
    key: 'set',


    /**
     * Set a key to a value in the Store
    **/
    value: function set(key, value) {
      var override = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

      if (this._store.get(key) !== null || this._store.get(key) === null && override) {
        this._store.set(key, value, override);
      }
    }

    /**
     * Get the value for a key in the Store
    **/

  }, {
    key: 'get',
    value: function get(key) {
      var def = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

      return this._store.get(key, def);
    }

    /**
     * Returns true if connected to MQTT broker
    **/

  }, {
    key: 'isConnected',
    value: function isConnected() {
      return this._mqtt !== null && this._connected;
    }

    /**
     * Register one or more plugins
    **/

  }, {
    key: 'register',
    value: function register(_register) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (typeof _register === 'function') {
        _register = [{
          register: _register,
          options: options
        }];
      } else if (!Array.isArray(_register)) {
        _register = [_register];
      }

      var promises = [];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _register[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var plugin = _step.value;

          promises.push(plugin.register(this, plugin.options || {}));
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return promises;
    }

    /**
     * Add one or more routes
    **/

  }, {
    key: 'route',
    value: function route(routes) {
      var handler = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      if (typeof handler === 'function') {
        routes = [{
          route: routes,
          handler: handler,
          options: options
        }];
      } else if (!Array.isArray(routes)) {
        routes = [routes];
      }
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = routes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var route = _step2.value;

          route.route = this._replacePlaceholders(route.route);
          route.options = (0, _extend2.default)(true, {}, DEFAULT_ROUTE_OPTIONS, route.options || {});
          var regex = (0, _mqttRegex2.default)(route.route);
          route.topic = regex.topic;
          route.match = regex.exec;
          this._routes.push(route);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }

    /**
     * Publish a message on a topic
    **/

  }, {
    key: 'publish',
    value: function publish(topic, message) {
      var _this2 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      return new Promise(function (resolve, reject) {
        if (!_this2.isConnected()) {
          return reject(new Error('not connected to broker'));
        }
        topic = _this2._replacePlaceholders(topic);
        _this2._mqtt.publish(topic, message, options, function (err) {
          if (err) return reject(err);
          return resolve();
        });
      });
    }

    /**
     * Subscribe to a topic
    **/

  }, {
    key: 'subscribe',
    value: function subscribe(topic) {
      var _this3 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return new Promise(function (resolve, reject) {
        if (!_this3.isConnected()) {
          return reject(new Error('not connected to broker'));
        }
        topic = _this3._replacePlaceholders(topic);
        _this3._mqtt.subscribe(topic, options, function (err, granted) {
          if (err) return reject(err);
          return resolve(granted);
        });
      });
    }

    /**
     * Unsubscribe from a topic
    **/

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(topic) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        if (!_this4.isConnected()) {
          return reject(new Error('not connected'));
        }
        topic = _this4._replacePlaceholders(topic);
        _this4._mqtt.unsubscribe(topic, function () {
          return resolve();
        });
      });
    }

    /**
     * Start the Component
    **/

  }, {
    key: 'start',
    value: function start() {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        if (_this5._mqtt !== null) {
          return reject(new Error('already started'));
        }

        var promiseDone = false;
        var onError = function onError(err) {
          if (!promiseDone) {
            reject(err);
            promiseDone = true;
          }
        };

        var onClose = function onClose() {
          _this5._connected = false;
          if (!promiseDone) {
            reject(new Error('connection closed'));
            promiseDone = true;
          }
        };

        var onConnect = function onConnect(connack) {
          _this5._connected = true;
          _this5._mqtt.removeListener('error', onError);
          _this5._mqtt.removeListener('close', onClose);

          _this5._attachListeners();
          _this5._subscribeToRoutes();
          return resolve(connack);
        };

        _this5._mqtt = mqtt.connect(_this5._options.url || _this5._options, _this5._options);
        _this5._mqtt.once('connect', onConnect);
        _this5._mqtt.once('error', onError);
        _this5._mqtt.once('close', onClose);
      });
    }

    /**
     * End the connection to the MQTT broker
    **/

  }, {
    key: 'end',
    value: function end() {
      var _this6 = this;

      var force = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      return new Promise(function (resolve, reject) {
        if (!_this6.isConnected()) {
          return reject(new Error('connection already closed'));
        }
        _this6._mqtt.end(force, function () {
          return resolve();
        });
      });
    }

    /**
     * Attach MQTT listeners
    **/

  }, {
    key: '_attachListeners',
    value: function _attachListeners() {
      var _this7 = this;

      var onMessage = function onMessage(topic, message, packet) {
        var route = _this7._matchTopicToRoute(topic);
        if (route !== null) {
          packet.params = route.match(topic);
          route.handler(packet, _this7);
        }
      };

      var onError = function onError(err) {
        _this7.emit('error', err);
      };

      var onClose = function onClose() {
        _this7.emit('close');
        _this7._connected = false;
        _this7._mqtt = null;
      };

      this._mqtt.on('message', onMessage);
      this._mqtt.on('error', onError);
      this._mqtt.once('close', onClose);
    }

    /**
     * Subscribe to routes
    */

  }, {
    key: '_subscribeToRoutes',
    value: function _subscribeToRoutes() {
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this._routes[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var route = _step3.value;

          if (route.options.subscribe) {
            this._mqtt.subscribe(route.topic);
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }

    /**
     * Match a topic to a route
    **/

  }, {
    key: '_matchTopicToRoute',
    value: function _matchTopicToRoute(topic) {
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = this._routes[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var route = _step4.value;

          if (route.match(topic)) {
            if (route.options.once) {
              this.unsubscribe(route.topic);
            }
            return route;
          }
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      return null;
    }

    /**
     * Replaces Component-specific keys in topics
    **/

  }, {
    key: '_replacePlaceholders',
    value: function _replacePlaceholders(topic) {
      topic = topic.replace('{$componentId}', this._componentId);
      return topic;
    }
  }, {
    key: 'componentId',
    get: function get() {
      return this._componentId;
    }
  }]);

  return Component;
}(_events.EventEmitter);

exports.Component = Component;