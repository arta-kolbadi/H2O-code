import path from "node:path";
import { H2O_HOME, ensureHome } from "../config.js";
import { DatabaseSync } from "node:sqlite";

/** Workspace-scoped durable notes. Secrets should never be stored here. */
export class ProjectMemory {
  constructor({ databasePath = path.join(H2O_HOME, "h2o.sqlite"), workspace } = {}) {
    ensureHome();
    this.workspace = path.resolve(workspace || process.cwd());
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'note',
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_project_memory_workspace ON project_memory(workspace, updated_at);
    `);
  }
  add(content, { kind = "note" } = {}) {
    const value = String(content || "").trim();
    if (!value) throw new Error("Memory content is empty.");
    if (/(api[_-]?key|password|secret|token)\s*[:=]/i.test(value)) {
      throw new Error("Possible credential detected. Secrets must not be stored in Project Memory.");
    }
    const now = new Date().toISOString();
    const result = this.db.prepare(
      "INSERT INTO project_memory(workspace,kind,content,created_at,updated_at) VALUES(?,?,?,?,?)"
    ).run(this.workspace, kind, value, now, now);
    return Number(result.lastInsertRowid);
  }
  search(query = "", limit = 8) {
    const term = String(query).trim();
    const like = `%${term.slice(0, 200)}%`;
    return this.db.prepare(
      "SELECT id,kind,content,created_at AS createdAt FROM project_memory WHERE workspace=? AND (?='' OR content LIKE ?) ORDER BY updated_at DESC LIMIT ?"
    ).all(this.workspace, term, like, Math.max(1, Math.min(30, Number(limit) || 8)));
  }
  remove(id) {
    return Number(this.db.prepare("DELETE FROM project_memory WHERE id=? AND workspace=?").run(Number(id), this.workspace).changes);
  }
  close() { try { this.db.close(); } catch {} }
}
