import routeChecker from './routeChecker.plugin';
import databaseChecker from './databaseChecker.plugin';
import securityAnalyzer from './securityAnalyzer.plugin';

export const plugins = [
  routeChecker,
  databaseChecker,
  securityAnalyzer
];

export default plugins; 