import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { H2O_HOME, ensureHome } from "./config.js";

/**
 * Durable session store. Requires Node >=22.12 (node:sqlite).
 * Keeps the existing addMessage/addTerminal interface for compatibility.
 */
export class SessionStore {
  constructor({ sessionId, databasePath } = {}) {
    ensureHome();
    this.dbPath = databasePath || path.join(H2O_HOME, "h2o.sqlite");
    this.db = new DatabaseSync(this.dbPath);
    try { fs.chmodSync(this.dbPath, 0o600); } catch {}
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        workspace TEXT,
        status TEXT NOT NULL DEFAULT 'active'
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS terminal_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        command TEXT NOT NULL,
        output TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
      CREATE INDEX IF NOT EXISTS idx_terminal_session ON terminal_runs(session_id, id);
      CREATE TABLE IF NOT EXISTS project_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'note',
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_project_memory_workspace ON project_memory(workspace, updated_at);
      CREATE TABLE IF NOT EXISTS queued_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    const now = new Date().toISOString();
    this.id = sessionId || `${now.replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}`;
    this.db.prepare(
      "INSERT OR IGNORE INTO sessions(id, created_at, updated_at) VALUES(?,?,?)"
    ).run(this.id, now, now);
    this.insertMessage = this.db.prepare(
      "INSERT INTO messages(session_id, role, content, created_at) VALUES(?,?,?,?)"
    );
    this.insertTerminal = this.db.prepare(
      "INSERT INTO terminal_runs(session_id, command, output, created_at) VALUES(?,?,?,?)"
    );
    this.touch = this.db.prepare(
      "UPDATE sessions SET updated_at=?, status=? WHERE id=?"
    );
  }

  addMessage(role, content) {
    this.insertMessage.run(this.id, String(role), String(content), new Date().toISOString());
    this.touch.run(new Date().toISOString(), "active", this.id);
  }

  addTerminal(command, output) {
    this.insertTerminal.run(this.id, String(command), String(output), new Date().toISOString());
    this.touch.run(new Date().toISOString(), "active", this.id);
  }

  enqueueMessage(content) {
    this.db.prepare("INSERT INTO queued_messages(session_id,content,created_at) VALUES(?,?,?)")
      .run(this.id, String(content), new Date().toISOString());
  }

  queuedMessages() {
    return this.db.prepare("SELECT id,content FROM queued_messages WHERE session_id=? ORDER BY id")
      .all(this.id);
  }

  removeQueuedMessage(id) {
    this.db.prepare("DELETE FROM queued_messages WHERE id=? AND session_id=?").run(Number(id), this.id);
  }

  clearQueue() {
    this.db.prepare("DELETE FROM queued_messages WHERE session_id=?").run(this.id);
  }

  addMemory(workspace, content, kind = "note") {
    const now = new Date().toISOString();
    return this.db.prepare("INSERT INTO project_memory(workspace,kind,content,created_at,updated_at) VALUES(?,?,?,?,?)")
      .run(path.resolve(workspace), String(kind), String(content), now, now).lastInsertRowid;
  }

  searchMemory(workspace, query = "", limit = 8) {
    const q = `%${String(query).slice(0,200)}%`;
    return this.db.prepare("SELECT id,kind,content,created_at AS createdAt FROM project_memory WHERE workspace=? AND (?='' OR content LIKE ?) ORDER BY updated_at DESC LIMIT ?")
      .all(path.resolve(workspace), String(query), q, Math.max(1, Math.min(30, Number(limit) || 8)));
  }

  setWorkspace(workspace) {
    this.db.prepare("UPDATE sessions SET workspace=?, updated_at=? WHERE id=?")
      .run(String(workspace), new Date().toISOString(), this.id);
  }

  setStatus(status) {
    this.touch.run(new Date().toISOString(), String(status), this.id);
  }

  messages(limit = 200) {
    return this.db.prepare(
      "SELECT role, content, created_at AS at FROM messages WHERE session_id=? ORDER BY id DESC LIMIT ?"
    ).all(this.id, limit).reverse();
  }

  terminal(limit = 100) {
    return this.db.prepare(
      "SELECT command, output, created_at AS at FROM terminal_runs WHERE session_id=? ORDER BY id DESC LIMIT ?"
    ).all(this.id, limit).reverse();
  }

  static list({ databasePath } = {}) {
    ensureHome();
    const db = new DatabaseSync(databasePath || path.join(H2O_HOME, "h2o.sqlite"), { readOnly: true });
    try {
      return db.prepare(
        "SELECT id, created_at AS createdAt, updated_at AS updatedAt, workspace, status FROM sessions ORDER BY updated_at DESC"
      ).all();
    } finally { db.close(); }
  }

  close() {
    try { this.db.close(); } catch {}
  }
}
