/** @type {import('jest').Config} */
const config = {
    testMatch: ["**/__tests__/**/*.test.js"],
    transform: {},          // no transform needed — Node supports ESM natively via --experimental-vm-modules
    testEnvironment: "node"
};

export default config;
