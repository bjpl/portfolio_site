module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    tailwindcss: {},
    'postcss-preset-env': {
      stage: 1,
      features: {
        'nesting-rules': false, // handled by tailwindcss/nesting
      },
    },
    'postcss-custom-properties': {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' 
      ? { 
          cssnano: {
            preset: ['default', {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              colormin: true,
              convertValues: true,
              discardEmpty: true,
              discardUnused: true,
              mergeIdents: true,
              mergeRules: true,
              minifyFontValues: true,
              minifyGradients: true,
              minifyParams: true,
              minifySelectors: true,
              normalizeCharset: true,
              normalizeDisplayValues: true,
              normalizePositions: true,
              normalizeRepeatStyle: true,
              normalizeString: true,
              normalizeTimingFunctions: true,
              normalizeUnicode: true,
              normalizeUrl: true,
              orderedValues: true,
              reduceIdents: true,
              reduceInitial: true,
              reduceTransforms: true,
              svgo: true,
              uniqueSelectors: true,
            }],
          },
          'postcss-combine-media-query': {},
          'postcss-sort-media-queries': {
            sort: 'mobile-first',
          },
        } 
      : {}),
  },
};