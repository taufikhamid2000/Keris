// Tiny static server for the Melaka map viewer.
// Usage: node tools/map-viewer/serve.mjs [dataDir] [port]
//   dataDir defaults to build/viewer_data (GLBs, placements.json, terrain_h.f32, terrain_w.f32, terrain_albedo.png)
//   then open http://localhost:8090
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const dataDir = path.resolve(process.argv[2] || path.join(root, "build/viewer_data"));
const port = Number(process.argv[3] || 8090);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".glb": "model/gltf-binary", ".png": "image/png", ".f32": "application/octet-stream", ".wasm": "application/wasm",
};
const ROUTES = [
  ["/three/", path.join(root, "node_modules/three")],
  ["/data/", dataDir],
  ["/", here],
];

http
  .createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (url === "/") url = "/index.html";
    for (const [prefix, dir] of ROUTES) {
      if (!url.startsWith(prefix)) continue;
      const file = path.resolve(dir, "." + url.slice(prefix.length - 1));
      if (!file.startsWith(dir)) break; // no escaping the folder
      fs.readFile(file, (err, buf) => {
        if (err) {
          res.writeHead(404).end("not found: " + url);
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
        res.end(buf);
      });
      return;
    }
    res.writeHead(404).end("not found");
  })
  .listen(port, () => console.log(`Melaka map viewer: http://localhost:${port}  (data: ${dataDir})`));
