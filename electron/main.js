const { app, BrowserWindow } = require("electron")
const path = require("path")
const { spawn } = require("child_process")
const http = require("http")

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

let mainWindow = null
let nextProcess = null
const PORT = 3000
const URL = `http://localhost:${PORT}`

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, "../public/icons/icon-512x512.png"),
    show: false, // Don't show until ready
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  })

  // Load the Next.js app
  mainWindow.loadURL(URL)

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show()

    // Focus the window
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url)
    return { action: "deny" }
  })
}

function waitForServer(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const checkServer = () => {
      attempts++

      const req = http.get(URL, (res) => {
        resolve()
      })

      req.on("error", () => {
        if (attempts >= maxAttempts) {
          reject(new Error("Server did not start in time"))
          return
        }
        setTimeout(checkServer, 1000)
      })

      req.setTimeout(1000, () => {
        req.destroy()
        if (attempts >= maxAttempts) {
          reject(new Error("Server did not start in time"))
          return
        }
        setTimeout(checkServer, 1000)
      })
    }

    checkServer()
  })
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const appPath = app.isPackaged
      ? path.join(process.resourcesPath, "app")
      : path.join(__dirname, "..")

    // Find Node.js executable
    // In packaged app, use the bundled node
    // In development, use system node
    let nodeExecutable
    if (app.isPackaged) {
      // Use electron's node
      nodeExecutable = process.execPath
    } else {
      // Use system node
      nodeExecutable = "node"
    }

    // Find next executable
    const nextScript = path.join(appPath, "node_modules", ".bin", "next")

    const env = {
      ...process.env,
      PORT: PORT.toString(),
      NODE_ENV: "production",
    }

    // In packaged mode, we need to set ELECTRON_RUN_AS_NODE
    if (app.isPackaged) {
      env.ELECTRON_RUN_AS_NODE = "1"
    }

    console.log("[Electron] Starting Next.js server...")
    console.log("[Electron] App path:", appPath)
    console.log("[Electron] Node executable:", nodeExecutable)
    console.log("[Electron] Next script:", nextScript)

    nextProcess = spawn(nodeExecutable, [nextScript, "start"], {
      cwd: appPath,
      env: env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    })

    let serverReady = false

    nextProcess.stdout.on("data", (data) => {
      const output = data.toString()
      console.log("[Next.js]", output)

      // Check if server is ready
      if (!serverReady && (output.includes("Ready") || output.includes(`Local:`) || output.includes("started server"))) {
        serverReady = true
        // Wait a bit more for server to be fully ready
        setTimeout(() => resolve(), 2000)
      }
    })

    nextProcess.stderr.on("data", (data) => {
      const output = data.toString()
      console.error("[Next.js Error]", output)
    })

    nextProcess.on("error", (error) => {
      console.error("[Next.js Process Error]", error)
      if (!serverReady) {
        reject(error)
      }
    })

    nextProcess.on("exit", (code, signal) => {
      console.log(`[Next.js] Process exited with code ${code}, signal ${signal}`)
      if (!serverReady && code !== 0 && code !== null) {
        reject(new Error(`Next.js server exited with code ${code}`))
      }
    })

    // Fallback: Wait for server to respond
    setTimeout(async () => {
      if (!serverReady) {
        try {
          await waitForServer(5)
          serverReady = true
          resolve()
        } catch (error) {
          if (!serverReady) {
            console.log("[Electron] Server may already be running, resolving anyway")
            serverReady = true
            resolve()
          }
        }
      }
    }, 5000)
  })
}

app.whenReady().then(async () => {
  try {
    // Start Next.js server
    await startNextServer()

    // Wait for server to be ready
    console.log("[Electron] Waiting for server to be ready...")
    await waitForServer()

    console.log("[Electron] Next.js server started, creating window...")
    createWindow()
  } catch (error) {
    console.error("[Electron] Failed to start:", error)

    // Show error dialog
    const { dialog } = require("electron")
    dialog.showErrorBox(
      "Failed to start CalClock",
      `Could not start Next.js server: ${error.message}\n\nPlease make sure you have built the app with 'pnpm build' first.`
    )

    app.quit()
  }
})

app.on("window-all-closed", () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== "darwin") {
    // Kill Next.js server process
    if (nextProcess) {
      nextProcess.kill("SIGTERM")
      nextProcess = null
    }
    app.quit()
  }
})

app.on("activate", () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on("before-quit", () => {
  // Kill Next.js server process on app quit
  if (nextProcess) {
    nextProcess.kill("SIGTERM")
    nextProcess = null
  }
})

// Handle app termination
process.on("SIGINT", () => {
  if (nextProcess) {
    nextProcess.kill("SIGTERM")
  }
  app.quit()
})

process.on("SIGTERM", () => {
  if (nextProcess) {
    nextProcess.kill("SIGTERM")
  }
  app.quit()
})
