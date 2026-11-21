import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
function resolveWorkspacePath(workspace, requested) {
  const base = path.resolve(workspace);
  const target = path.resolve(base, requested || ".");
  if (target !== base && !target.startsWith(base + path.sep)) throw new Error("Blocked: path is outside the current workspace.");
  return target;
}

/** Snapshot-backed file change journal; intentionally never overwrites user edits on rollback. */
export class ChangeManager {
  constructor(workspace, { snapshotDir = path.join(workspace, ".h2o", "snapshots") } = {}) {
    this.workspace = path.resolve(workspace);
    this.snapshotDir = snapshotDir;
    this.changeSets = new Map();
  }
  begin(label = "Task") {
    const id = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const set = { id, label, status: "open", createdAt: new Date().toISOString(), files: [] };
    this.changeSets.set(id, set);
    return set;
  }
  capture(changeSet, relativePath) {
    const file = resolveWorkspacePath(this.workspace, relativePath);
    const existed = fs.existsSync(file);
    const before = existed && fs.statSync(file).isFile() ? fs.readFileSync(file) : null;
    const entry = { path: relativePath, absolutePath: file, existed, before, beforeHash: before ? hash(before) : null };
    changeSet.files.push(entry);
    return entry;
  }
  recordAfter(changeSet, entry) {
    const after = fs.existsSync(entry.absolutePath) ? fs.readFileSync(entry.absolutePath) : null;
    entry.afterHash = after ? hash(after) : null;
    entry.afterBytes = after?.length ?? 0;
    return entry;
  }
  rollback(changeSet) {
    const results = [];
    for (const entry of [...changeSet.files].reverse()) {
      const current = fs.existsSync(entry.absolutePath) ? fs.readFileSync(entry.absolutePath) : null;
      const currentHash = current ? hash(current) : null;
      if (currentHash !== entry.afterHash) {
        results.push({ path: entry.path, restored: false, reason: "File changed after this ChangeSet; preserved user changes." });
        continue;
      }
      if (entry.existed) {
        fs.mkdirSync(path.dirname(entry.absolutePath), { recursive: true });
        const temp = `${entry.absolutePath}.h2o-rollback-${crypto.randomBytes(3).toString("hex")}`;
        fs.writeFileSync(temp, entry.before);
        fs.renameSync(temp, entry.absolutePath);
      } else if (fs.existsSync(entry.absolutePath)) {
        fs.unlinkSync(entry.absolutePath);
      }
      results.push({ path: entry.path, restored: true });
    }
    changeSet.status = "rolled_back";
    return results;
  }
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
