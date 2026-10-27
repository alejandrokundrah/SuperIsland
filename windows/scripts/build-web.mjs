// Zero-dependency web build: compile TS with tsc (ES modules), then copy static assets.
import { execSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
execSync("npx tsc -p tsconfig.json", { cwd: root, stdio: "inherit" });

// Copy every non-TS file under src/ (html, css, svg, json, wav...) to dist/.
function walk(dir, rel = "") {
  for (const name of readdirSync(join(dir, rel))) {
    const r = join(rel, name);
    const full = join(dir, r);
    if (statSync(full).isDirectory()) walk(dir, r);
    else if (![".ts"].includes(extname(name))) {
      mkdirSync(join(dist, rel), { recursive: true });
      cpSync(full, join(dist, r));
    }
  }
}
walk(join(root, "src"));

// Bundled extensions (shared with the macOS app) ship as resources, not web assets.
console.log("web build complete ->", dist);
