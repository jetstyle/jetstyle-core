/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@jetstyle/eslint-config/next-v2.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "dist/**"
  ],
}; 
