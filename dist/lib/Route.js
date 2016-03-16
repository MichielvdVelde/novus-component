'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Route = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _mqttRegex = require('mqtt-regex');

var _mqttRegex2 = _interopRequireDefault(_mqttRegex);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Default route options
**/
var DEFAULT_OPTIONS = {
  subscribe: true,
  qos: 0
};

/**
 * Route class
**/

var Route = exports.Route = function () {

  /**
   * Constructor
  **/

  function Route() {
    var route = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

    _classCallCheck(this, Route);

    if (route === null) {
      throw new TypeError('route cannot be null');
    }

    if (typeof route.handler !== 'function') {
      throw new TypeError('handler must be a function');
    }

    this._topic = (0, _mqttRegex2.default)(route.topic);
    this._handler = route.handler;
    this._options = (0, _extend2.default)({
      subscribe: true,
      qos: 0
    }, route.options || {});
  }

  /**
   * Get the topic
  **/


  _createClass(Route, [{
    key: 'match',


    /**
     * Check if the given topic is a match for this route
    **/
    value: function match(topic) {
      var match = this._topic.exec(topic);
      return match ? match : null;
    }

    /**
     * Execute the route's handler
    **/

  }, {
    key: 'execute',
    value: function execute(component, packet) {
      var bound = this._handler.bind(component, this._options);
      return bound(packet);
    }
  }, {
    key: 'topic',
    get: function get() {
      return this._topic;
    }

    /**
     * Get subscribe (bool)
    **/

  }, {
    key: 'subscribe',
    get: function get() {
      return this._options.subscribe;
    }

    /**
     * Get QoS
    **/

  }, {
    key: 'qos',
    get: function get() {
      return this._options.qos;
    }
  }]);

  return Route;
}();