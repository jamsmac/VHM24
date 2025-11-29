/**
 * lint-staged configuration for VendHub monorepo
 *
 * Runs ESLint and Prettier on staged files
 */

const path = require('path');

module.exports = {
  // Backend TypeScript files - run from backend directory
  'backend/**/*.ts': (filenames) => {
    // Convert absolute paths to relative paths from backend/
    const relativePaths = filenames.map(f => {
      const rel = path.relative(path.join(__dirname, 'backend'), f);
      return rel;
    });
    return [
      `cd backend && npx eslint --fix ${relativePaths.join(' ')}`,
      `cd backend && npx prettier --write ${relativePaths.join(' ')}`,
    ];
  },

  // Frontend TypeScript/TSX files
  'frontend/**/*.{ts,tsx}': (filenames) => {
    const relativePaths = filenames.map(f => {
      const rel = path.relative(path.join(__dirname, 'frontend'), f);
      return rel;
    });
    return [
      `cd frontend && npx eslint --fix ${relativePaths.join(' ')} || true`,
      `cd frontend && npx prettier --write ${relativePaths.join(' ')} || true`,
    ];
  },

  // JSON files - use root prettier
  '*.json': ['prettier --write'],

  // Markdown files
  '*.md': ['prettier --write'],
};
