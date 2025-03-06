const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended", "prettier"],
  // It was copy-paste from turbo template :-\
  plugins: [
    // "only-warn"
    "@typescript-eslint",
    "import",
  ],
  globals: {
    React: true,
    JSX: true,
    Bun: "readonly"
  },
  env: {
    node: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
  ],
  overrides: [
    {
      files: ["*.js?(x)", "*.ts?(x)"],
    },
  ],
  "rules": {
    "indent": [
      "error",
      2,
    ],
    "linebreak-style": [
      "error",
      "unix",
    ],
    "quotes": [
      "error",
      "single",
    ],
    "semi": [
      "error",
      "never",
    ],
    // "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-constant-condition": ["error", { "checkLoops": false }],
    "no-trailing-spaces": "error",
    "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 1 }],
    "space-before-function-paren": ["error", {
      "anonymous": "always",
      "named": "never",
      "asyncArrow": "always",
    }],
    "object-curly-spacing": ["error", "always"],
    "no-unused-vars": "off",
    "no-redeclare": "off",
    "@typescript-eslint/no-redeclare": ["error"],
    "@typescript-eslint/no-unused-vars": ["error"],
    "import/order": [
      "warn",
      {
        "pathGroups": [
          {
            "pattern": '@jetstyle/**',
            "group": 'internal',
            "position": 'before'
          },
        ],
        "groups": [
          ["builtin"],   // Native Node.js modules (e.g., fs, path)
          ["external"],  // node_modules imports
          ["internal"],  // Internal aliases if defined
          ["parent", "sibling", "index"], // Relative imports
        ],
        "newlines-between": "always", // Enforces newlines between groups
        "alphabetize": {
          "order": "asc", // Sort within each group alphabetically
          "caseInsensitive": true
        },
        "pathGroupsExcludedImportTypes":  ["internal"]
      }
    ],
    "curly": ["error", "all"],
    "@typescript-eslint/array-type": [
      "warn",
      {
        "default": "generic",
        "readonly": "generic"
      }
    ],
    "@typescript-eslint/consistent-type-definitions": [
      "warn",
      "type"
    ]
  },
};
