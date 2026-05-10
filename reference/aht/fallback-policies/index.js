'use strict';

/**
 * Registry of recognized AHT Fallback Policy classes (RFC 0027 section 3.4a).
 * Implementers may register additional classes by extending this map.
 */

module.exports = {
  POAM:    require('./poam-stub'),
  PLASTIC: require('./plastic-stub'),
  AATEAM:  require('./aateam-stub'),
  ROTATE:  require('./rotate-stub'),
  Custom:  require('./custom-stub'),
};
