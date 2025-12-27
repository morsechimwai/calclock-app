/**
 * Preload script - runs in a context that has access to both
 * the DOM and Node.js APIs, but cannot directly access Electron APIs
 */

const { contextBridge } = require("electron")

// Expose protected methods that allow the renderer process to use
// Node.js APIs safely
contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
})

