// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],

  // An array of regexp pattern strings, matched against all module paths before considered
  // 'visible' to the module loader
  modulePathIgnorePatterns: ['<rootDir>/node_modules'],

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // An array of regexp pattern strings that are matched against all test paths, matched tests
  // are skipped
  testPathIgnorePatterns: [
    '/node_modules/'
  ],

};
