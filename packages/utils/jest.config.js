module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    "src/**/*.{ts,js}",
    "!src/index.ts"
  ],
  setupFiles: [],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{ts,js}",
    "<rootDir>/src/**/?(*.)(spec|test).{ts,js}"
  ],
  snapshotSerializers: [],
  roots: [
    "<rootDir>/src"
  ],
  globals: {},
  "transform": {
    "\\.tsx?$": "ts-jest"
  },
  transformIgnorePatterns: [
    "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs)$",
  ],
  moduleNameMapper: {
  },
  moduleFileExtensions: [
    "ts",
    "js",
    "json"
  ]
};
