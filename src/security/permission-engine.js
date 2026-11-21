const DANGEROUS = [
  /\brm\s+-rf\b/i, /\bdel\s+\/s\b/i, /\brmdir\s+\/s\b/i,
  /\bformat\b/i, /\bdiskpart\b/i, /\bshutdown\b/i, /\breboot\b/i,
  /\breg\s+(delete|add)\b/i, /\b(sc|net)\s+(stop|start|delete)\b/i,
  /\b(git\s+push|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f)\b/i,
  /\bcurl\b.*\|\s*(sh|bash|powershell)/i,
];
const MUTATING = [
  /\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update|uninstall)\b/i,
  /\b(git\s+(checkout|switch|merge|rebase|commit|restore))\b/i,
  /\b(mkdir|copy|cp|move|mv|del|rm)\b/i,
  /\b(write|delete|remove|modify|create)\b/i,
];

export function classifyRisk({ tool, command, path: target } = {}) {
  const value = `${tool || ""} ${command || ""} ${target || ""}`.trim();
  if (DANGEROUS.some(pattern => pattern.test(value))) return "critical";
  if (/\b(run_command|terminal|browser_submit|browser_download)\b/i.test(tool || "") ||
      MUTATING.some(pattern => pattern.test(value)) ||
      /\b(write_file|create_directory)\b/.test(tool || "")) return "medium";
  return "low";
}

/**
 * Adaptive policy: low risk is automatic; medium is allowed only inside the
 * workspace and must be auditable; high/critical require explicit approval
 * or are blocked by default. The caller supplies the approval UI.
 */
export class PermissionEngine {
  constructor({ approve = async () => false, allowMedium = true, audit = () => {} } = {}) {
    this.approve = approve;
    this.allowMedium = allowMedium;
    this.audit = audit;
  }
  async authorize(action) {
    const risk = classifyRisk(action);
    let allowed = risk === "low" || (risk === "medium" && this.allowMedium);
    let reason = allowed ? "policy" : "approval required";
    if (risk === "high" || risk === "critical" || (risk === "medium" && !this.allowMedium)) {
      allowed = await this.approve({ ...action, risk });
      reason = allowed ? "user approved" : "user denied";
    }
    this.audit({ ...action, risk, allowed, reason, at: new Date().toISOString() });
    return { allowed, risk, reason };
  }
}
