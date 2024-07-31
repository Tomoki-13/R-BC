/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "<rootDir>/src/__tests__/**/*.ts",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/src/__tests__/InputFile/", 
    "/Sample/",
    "/allrepos/"
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/Sample/",
    "<rootDir>/allrepos/"
  ],
};