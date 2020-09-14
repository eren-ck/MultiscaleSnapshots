module.exports = {
  env: {
    node: true,
    es6: true
  },
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-console': 'off'
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      modules: true,
      experimentalObjectRestSpread: true
    }
  }
};
