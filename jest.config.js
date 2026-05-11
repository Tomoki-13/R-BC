/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "<rootDir>/src/__tests__/**/*.ts",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/src/__tests__/inputFiles/",
    "/src/__tests__/outputFiles/",
    "/Sample/",
    "/allrepos/",
    "/allrepos-origin/"
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/Sample/",
    "<rootDir>/allrepos/",
    "<rootDir>/allrepos-origin/",
    "<rootDir>/allupdateSuccessClient/",
    "<rootDir>/alldataset_clients_sub",
    "<rootDir>/alldataset_clients",
    "<rootDir>/sample_clients"
  ],
};