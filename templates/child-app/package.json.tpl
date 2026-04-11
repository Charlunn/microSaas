{
  "name": "@factory/__SLUG__",
  "version": "__VERSION__",
  "private": true,
  "type": "module",
  "main": "manifest.ts",
  "types": "manifest.ts",
  "scripts": {
    "build": "echo \"No build needed\"",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "echo \"No lint configured\""
  },
  "dependencies": {
    "@factory/core-sdk": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.10.1",
    "typescript": "^5.6.3"
  }
}
