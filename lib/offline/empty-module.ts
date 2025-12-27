/**
 * Empty module placeholder for Node.js modules in browser builds
 *
 * This is used by Turbopack to resolve Node.js-only modules (fs, path, crypto)
 * when building for the browser. sql.js checks for these modules but
 * works fine without them in browser environments.
 */

// Export empty object as default
export default {}

// Export some common fs methods as no-ops for compatibility
export const readFileSync = () => {
  throw new Error("fs.readFileSync is not available in the browser")
}

export const existsSync = () => false

export const promises = {
  readFile: async () => {
    throw new Error("fs.promises.readFile is not available in the browser")
  },
}

