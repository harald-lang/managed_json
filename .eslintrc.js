module.exports = {
  'env': {
    'browser': false,
    'commonjs': true,
    'es6': true,
    'es2017': true,
    'es2020': true,
    'jest': true,
    'node': true,
  },
  'rules': {
    'indent': ['error', 2, {
      'SwitchCase': 1
    }],

    'max-len': ['error', {
      'code': 100,
      'ignoreComments': true,
      'ignoreRegExpLiterals': true
    }],

    'brace-style': ['error', 'stroustrup', {
      'allowSingleLine': false
    }],

    'no-unused-vars': ['error', {
      'args': 'none',
      'vars': 'all'
    }],

    'quotes': ['error', 'single', {
      'allowTemplateLiterals': true,
      'avoidEscape': true
    }],

    'space-before-blocks': ['error', 'always'],

    'space-before-function-paren': ['error', 'never'],

    'space-in-parens': ['error', 'never'],

    'space-unary-ops': ['error', {
      'nonwords': false,
      'overrides': {}
    }],

    'arrow-body-style': ['error', 'as-needed', {
      'requireReturnForObjectLiteral': false
    }],

    'arrow-parens': ['error', 'always'],

    'arrow-spacing': ['error', {
      'after': true,
      'before': true
    }],

    'prefer-arrow-callback': ['error', {
      'allowNamedFunctions': false,
      'allowUnboundThis': true
    }],

    'curly': ['error', 'all'],
    'template-curly-spacing': ['error', 'never']
  }
};
