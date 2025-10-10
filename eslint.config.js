// eslint.config.js
export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "dist/**"],  // <--- здесь указываем игнорируемые папки
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly"
      }
    },
    rules: {
      semi: ["error", "always"],
      "no-console": "error",
      "no-unused-vars": "error",
      "no-var": "error",
      "no-undef": "error"
    }
  }
];
