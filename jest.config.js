/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "<rootDir>/src/__tests__/**/*.ts",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/reposgv7failure/",
    "/reposv7\\.0\\.0failure/",
    "/src/__tests__/InputFile/", 
    "/reposv7\\.0\\.0success/",
    "/reposv8\\.0\\.0failure/",
    "/reposv8\\.0\\.0success/",
    "/Sample/"
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/reposgv7failure/",
    "<rootDir>/reposv7\\.0\\.0failure/",
    "<rootDir>/reposv7\\.0\\.0success/",
    "<rootDir>/reposv8\\.0\\.0failure/",
    "<rootDir>/reposv8\\.0\\.0success/",
    "<rootDir>/Sample/"
  ],
};