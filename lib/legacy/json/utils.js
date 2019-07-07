"use strict";

exports.__esModule = true;
exports.decodePointerFragment = void 0;

require("core-js/modules/es6.regexp.replace");

var SLASH_LIKE_SIGN = /~1/g;
var TILDE_LIKE_SIGN = /~0/g;

var decodePointerFragment = function decodePointerFragment(fragment) {
  return String(fragment).replace(SLASH_LIKE_SIGN, '/').replace(TILDE_LIKE_SIGN, '~');
};

exports.decodePointerFragment = decodePointerFragment;