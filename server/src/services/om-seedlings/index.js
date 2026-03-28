/**
 * OM Seedlings — Main entry point
 *
 * Re-exports all submodules for convenient access.
 */

const scopeMatrix = require('./scopeMatrix');
const churchSelector = require('./churchSelector');
const recordGenerators = require('./recordGenerators');
const seedingEngine = require('./seedingEngine');

module.exports = {
  ...scopeMatrix,
  ...churchSelector,
  ...recordGenerators,
  ...seedingEngine,
};
