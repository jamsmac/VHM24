module.exports = {
  // Run ESLint on TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'eslint --max-warnings=50', // Allow some warnings but not too many
  ],

  // Run Prettier on all supported files
  '*.{js,jsx,ts,tsx,json,css,scss,md}': [
    'prettier --write',
  ],

  // Type-check TypeScript files
  '*.{ts,tsx}': () => 'tsc --noEmit',
}
