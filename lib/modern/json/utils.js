"use strict";

exports.__esModule = true;
exports.decodePointerFragment = void 0;
const SLASH_LIKE_SIGN = /~1/g;
const TILDE_LIKE_SIGN = /~0/g;

const decodePointerFragment = fragment => String(fragment).replace(SLASH_LIKE_SIGN, '/').replace(TILDE_LIKE_SIGN, '~');

exports.decodePointerFragment = decodePointerFragment;