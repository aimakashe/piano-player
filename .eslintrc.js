module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module"
  },
  rules: {
    semi: ["error", "always"],
    "no-console": "error",
    "no-unused-vars": "error",
    "no-var": "error",
    "no-undef": "error"
  }
};
