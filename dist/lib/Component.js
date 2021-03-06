'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Component = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _mqtt = require('mqtt');

var mqtt = _interopRequireWildcard(_mqtt);

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _novusComponentStoreMemory = require('novus-component-store-memory');

var _Route = require('./Route');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Default component options
**/
var DEFAULT_OPTIONS = {
	subscribeWhileConnected: false
};

/**
 * Component class
**/

var Component = exports.Component = function (_EventEmitter) {
	_inherits(Component, _EventEmitter);

	/**
  * Constructor
 **/

	function Component(componentId) {
		var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

		_classCallCheck(this, Component);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Component).call(this));

		_this._componentId = componentId;
		if (!options.clientId) options.clientId = componentId;
		_this._store = options.store ? options.store : new _novusComponentStoreMemory.MemoryStore();
		_this._options = (0, _extend2.default)({}, DEFAULT_OPTIONS, options);

		_this._mqttClient = null;
		_this._routes = [];

		return _this;
	}

	/**
  * Convenience method for getting settings variables
 **/


	_createClass(Component, [{
		key: 'get',
		value: function get(key) {
			var def = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

			return this._store.get(key, def);
		}

		/**
   * Convenience method for setting settings variables
  **/

	}, {
		key: 'set',
		value: function set(key, value) {
			return this._store.set(key, value);
		}

		/**
   * Returns true if the component is connected to an MQTT broker
  **/

	}, {
		key: 'start',


		/**
   * Start the component and connect to the MQTT broker
  **/
		value: function start() {
			var _this2 = this;

			var url = arguments.length <= 0 || arguments[0] === undefined ? this._options.url || null : arguments[0];

			return new Promise(function (resolve, reject) {

				var onConnect = function onConnect(connack) {
					_this2._mqttClient.connected = true;
					_this2._mqttClient.removeAllListeners();
					_this2._attachListeners().then(function () {
						if (connack.sessionPresent) return true;
						return _this2._subscribeToRoutes();
					}).then(function () {
						return resolve(connack);
					}).catch(function (err) {
						return reject(err);
					});
				};

				var onError = function onError(err) {
					_this2._mqttClient.removeAllListeners();
					_this2._mqttClient = null;
					return reject(err);
				};

				_this2._mqttClient = url !== null ? mqtt.connect(url, _this2._options) : mqtt.connect(_this2._options);
				_this2._mqttClient.once('connect', onConnect);
				_this2._mqttClient.once('error', onError);
			});
		}

		/**
   * Subscribe to one or more topics
  **/

	}, {
		key: 'subscribe',
		value: function subscribe(topic) {
			var _this3 = this;

			var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

			return new Promise(function (resolve, reject) {
				if (!_this3.connected) {
					return reject(new Error('not connected to broker'));
				}

				options = (0, _extend2.default)({
					qos: 0
				}, options);

				topic = _this3._normalizeTopic(topic);
				_this3._mqttClient.subscribe(topic, options, function (err, granted) {
					if (err) return reject(err);
					return resolve(granted);
				});
			});
		}

		/**
   * Unsubscribe from one or more topics
  **/

	}, {
		key: 'unsubscribe',
		value: function unsubscribe(topic) {
			var _this4 = this;

			var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

			return new Promise(function (resolve, reject) {
				if (!_this4.connected) {
					return reject(new Error('not connected to broker'));
				}

				topic = _this4._normalizeTopic(topic);
				_this4._mqttClient.unsubscribe(topic, options, function () {
					return resolve();
				});
			});
		}

		/**
   * Publish a message on a topic
  **/

	}, {
		key: 'publish',
		value: function publish(topic, message) {
			var _this5 = this;

			var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

			return new Promise(function (resolve, reject) {
				if (!_this5.connected) {
					return reject(new Error('not connected to broker'));
				}

				options = (0, _extend2.default)({
					qos: 0,
					retain: false
				}, options);

				if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object') {
					if (message.toString) {
						message = message.toString();
					} else {
						message = JSON.stringify(message);
					}
				}

				topic = _this5._normalizeTopic(topic);
				_this5._mqttClient.publish(topic, message, options, function () {
					return resolve();
				});
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
				if (!_this6.connected) {
					return reject(new Error('not connected to broker'));
				}

				_this6._mqttClient.end(force, function () {
					_this6._mqttClient.removeAllListeners();
					_this6._mqttClient = null;
					return resolve();
				});
			});
		}

		//

		/**
   * Add one or more new routes
  **/

	}, {
		key: 'route',
		value: function route(topic) {
			var _this7 = this;

			var handler = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
			var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

			if (typeof handler === 'function') {
				topic = {
					topic: topic,
					handler: handler,
					options: options
				};
			}

			if (!Array.isArray(topic)) {
				topic = [topic];
			}

			topic.forEach(function (item) {
				item.topic = _this7._normalizeTopic(item.topic);
				_this7._routes.push(new _Route.Route(item, _this7));
				if (!_this7.connected || _this7.connected && _this7._options.subscribeWhileConnected) {
					_this7._subscribeToRoutes([_this7._routes[_this7._routes.length - 1]]);
				}
			});
		}

		/**
   * Attach MQTT listeners
  **/

	}, {
		key: '_attachListeners',
		value: function _attachListeners() {
			var _this8 = this;

			return new Promise(function (resolve) {

				var onConnect = function onConnect() {
					_this8._mqttClient.connected = true;
				};

				var onOffline = function onOffline() {
					_this8._mqttClient.connected = false;
				};

				var onClose = function onClose() {
					onOffline();
				};

				var onError = function onError(err) {
					// TODO: Better error handling
					throw err;
				};

				var onMessage = function onMessage(topic, message, packet) {
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = _this8._routes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var route = _step.value;

							var match = route.match(topic);
							if (match) {
								packet.params = match;
								return route.execute(packet);
							}
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

					return _this8.emit('message', topic, message, packet);
				};

				_this8._mqttClient.on('connect', onConnect);
				_this8._mqttClient.on('offline', onOffline);
				_this8._mqttClient.on('close', onClose);
				_this8._mqttClient.on('error', onError);
				_this8._mqttClient.on('message', onMessage);

				return resolve();
			});
		}

		/**
   * Subscribe to all registered routes
  **/

	}, {
		key: '_subscribeToRoutes',
		value: function _subscribeToRoutes() {
			var routes = arguments.length <= 0 || arguments[0] === undefined ? this._routes : arguments[0];

			var i = 0;
			var subscriptions = {};
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = routes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var route = _step2.value;

					if (!route.subscribe) continue;
					if (subscriptions[route.topic.topic]) continue;
					subscriptions[route.topic.topic] = route.qos;
					i++;
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

			return i > 0 ? this.subscribe(subscriptions) : true;
		}

		/**
   * Normalize topic names
  **/

	}, {
		key: '_normalizeTopic',
		value: function _normalizeTopic(topic) {
			var _this9 = this;

			var normalize = function normalize(t) {
				t = t.replace('{$componentId}', _this9._componentId);
				return t;
			};

			// Handle topic arrays
			if (Array.isArray(topic)) {
				return topic.map(normalize);
			}

			// Handle topic objects
			if ((typeof topic === 'undefined' ? 'undefined' : _typeof(topic)) === 'object') {
				var newObj = {};
				for (var t in topic) {
					newObj[normalize(t)] = topic[t];
				}
				return newObj;
			}

			// Handle strings
			return normalize(topic);
		}

		/**
   * Parse JSON or return original value
  **/

	}, {
		key: '_tryParseJSON',
		value: function _tryParseJSON(value) {
			try {
				value = JSON.parse(value);
			} catch (e) {}
			return value;
		}

		/**
   * Stringify JSON or return origial value
  **/

	}, {
		key: '_tryStringifyJSON',
		value: function _tryStringifyJSON(value) {
			try {
				value = JSON.stringify(value);
			} catch (e) {}
			return value;
		}
	}, {
		key: 'connected',
		get: function get() {
			return this._mqttClient !== null && this._mqttClient.connected;
		}

		/**
   * Returns the component's ID
  **/

	}, {
		key: 'componentId',
		get: function get() {
			return this._componentId;
		}
	}]);

	return Component;
}(_events.EventEmitter);