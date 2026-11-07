const { app, BrowserWindow, globalShortcut } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

// Allow the music to start without a tap.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const OUT_DIR = path.join(__dirname, "..", "out");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// Local server so video seeking (range requests) and absolute asset paths work offline.
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.normalize(path.join(OUT_DIR, urlPath));
    if (!file.startsWith(OUT_DIR)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return res.writeHead(404).end();

    const size = fs.statSync(file).size;
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? parseInt(range[1], 10) : 0;
      const end = range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
      });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
      fs.createReadStream(file).pipe(res);
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

async function createWindow() {
  const port = await startServer();
  const win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: { backgroundThrottling: false },
  });
  win.setMenuBarVisibility(false);
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.key === "F5") e.preventDefault();
  });
  console.log("kiosk server on port", port);
  await win.loadURL(`http://127.0.0.1:${port}/`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  process.on("uncaughtException", (e) => console.error("uncaught", e));
  app.whenReady().then(() => {
    createWindow();
    // Staff exit: Ctrl+Shift+Q
    globalShortcut.register("CommandOrControl+Shift+Q", () => app.quit());
  });
  app.on("window-all-closed", () => app.quit());
}
