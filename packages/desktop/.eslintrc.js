module.exports = {
  root: true,
  extends: ['@quiet/eslint-config'],
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.cypress.json'],
  },
  overrides: [
    {
      files: ['**/*.cy.ts', '**/*.cy.tsx'],
      rules: {
        '@typescript-eslint/no-namespace': 'off', // Allow namespaces in Cypress files
      },
    },
  ],
}
