const path = require("path")

module.exports = {
  appId: "com.calclock.app",
  productName: "CalClock",
  copyright: "Copyright © 2024",

  directories: {
    output: "dist",
    buildResources: "build",
  },

  files: [
    "electron/**/*",
    ".next/**/*",
    "public/**/*",
    "package.json",
    "next.config.ts",
    "!node_modules/.cache/**/*",
    "!**/node_modules/**/*.{md,map}",
    "!**/node_modules/**/test/**",
    "!**/node_modules/**/tests/**",
    "!**/node_modules/**/__tests__/**",
    "!**/node_modules/**/*.d.ts",
    "!**/node_modules/.bin/**",
  ],

  extraFiles: [
    {
      from: "node_modules",
      to: "node_modules",
      filter: [
        "**/*",
        "!**/*.md",
        "!**/*.map",
        "!**/test/**",
        "!**/tests/**",
        "!**/__tests__/**",
        "!**/*.d.ts",
        "!**/.bin/**",
      ],
    },
  ],

  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
    icon: "public/icons/icon-512x512.png",
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "CalClock",
  },

  mac: {
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"],
      },
    ],
    icon: "public/icons/icon-512x512.png",
    category: "public.app-category.business",
    hardenedRuntime: false,
    gatekeeperAssess: false,
  },

  dmg: {
    contents: [
      {
        x: 410,
        y: 150,
        type: "link",
        path: "/Applications",
      },
      {
        x: 130,
        y: 150,
        type: "file",
      },
    ],
  },

  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64"],
      },
    ],
    icon: "public/icons/icon-512x512.png",
    category: "Office",
  },

  publish: null,
}
