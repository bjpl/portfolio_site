module.exports = {
  root: true, // Don't look for parent configs
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Allow console for logging
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    
    // Max line length
    'max-len': ['error', { code: 120, ignoreComments: true, ignoreStrings: true }],
    
    // Allow underscore dangle for private methods and MongoDB _id
    'no-underscore-dangle': ['error', { allow: ['_id', '_doc'] }],
    
    // Allow ForOfStatement
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      'LabeledStatement',
      'WithStatement'
    ],
    
    // Comma dangle
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never'
    }],
    
    // Import extensions
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never'
    }],
    
    // Allow async without await
    'require-await': 'off',
    
    // Allow ++ in for loops
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    
    // Allow continue
    'no-continue': 'off',
    
    // Allow reassignment for req, res, next parameters
    'no-param-reassign': ['error', {
      props: true,
      ignorePropertyModificationsFor: ['req', 'res', 'next', 'session', 'socket']
    }],
    
    // Consistent return
    'consistent-return': 'off',
    
    // Prefer destructuring
    'prefer-destructuring': ['error', {
      array: false,
      object: true
    }],
    
    // Arrow function parentheses
    'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
    
    // Object curly newline
    'object-curly-newline': ['error', {
      ObjectExpression: { multiline: true, consistent: true },
      ObjectPattern: { multiline: true, consistent: true },
      ImportDeclaration: { multiline: true, consistent: true },
      ExportDeclaration: { multiline: true, consistent: true }
    }],
    
    // Function paren newline
    'function-paren-newline': ['error', 'consistent'],
    
    // Implicit arrow linebreak
    'implicit-arrow-linebreak': 'off',
    
    // Operator linebreak
    'operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }],
    
    // Import order
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    
    // No unused vars
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_'
    }],
    
    // Prefer const
    'prefer-const': ['error', {
      destructuring: 'any',
      ignoreReadBeforeAssign: false
    }],
    
    // No shadow
    'no-shadow': ['error', {
      builtinGlobals: false,
      hoist: 'functions',
      allow: ['err', 'error', 'res', 'response', 'cb', 'callback']
    }],
    
    // Radix
    'radix': ['error', 'as-needed'],
    
    // No use before define
    'no-use-before-define': ['error', {
      functions: false,
      classes: true,
      variables: true
    }],
    
    // Camelcase
    'camelcase': ['error', {
      properties: 'never',
      ignoreDestructuring: true,
      ignoreImports: true
    }]
  },
  overrides: [
    {
      files: ['*.test.js', '*.spec.js'],
      rules: {
        'no-unused-expressions': 'off',
        'prefer-arrow-callback': 'off',
        'func-names': 'off'
      }
    }
  ]
};