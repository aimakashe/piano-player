module.exports = {
  // Указываем, что код предназначен для браузера и использует ES6
  env: {
    browser: true,
    es2021: true,
  },
  // Правила, обязательные по заданию
  rules: {
    "semi": ["error", "always"], // Точка с запятой обязательна
    "no-console": "error", // Запрет console.log
    "no-unused-vars": "error", // Запрет неиспользуемых переменных
    "no-var": "error", // Запрет var (использовать let/const)
    "no-undef": "error", // Запрет использования необъявленных переменных
    // Дополнительные правила для избежания ошибок с DOM
    "no-use-before-define": ["error", { "functions": true, "classes": true, "variables": true }],
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
};