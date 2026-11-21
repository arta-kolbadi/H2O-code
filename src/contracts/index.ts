/** Typed contracts introduced for the gradual TypeScript migration. */
export type H2OMode = "plan" | "build";
export type ChangeStatus = "draft" | "pending" | "approved" | "rejected" | "applied" | "rolled_back";
export type FileChangeKind = "create" | "modify" | "delete" | "rename" | "directory_create";

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "failed" | "blocked";
}
export interface ExecutionPlan {
  id: string;
  taskId: string;
  summary: string;
  tasks: PlanTask[];
  risks: string[];
  verification: string[];
  validated: boolean;
}
export interface DiffHunk {
  id: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  unified: string;
  approved?: boolean;
}
export interface FileChange {
  path: string;
  type: FileChangeKind;
  beforeHash?: string;
  afterHash?: string;
  hunks: DiffHunk[];
}
export interface ChangeSet {
  id: string;
  taskId: string;
  agentId?: string;
  status: ChangeStatus;
  changes: FileChange[];
  createdAt: number;
  appliedAt?: number;
}
export interface ProviderModel { id: string; name?: string; contextWindow?: number; free?: boolean }
export interface ProviderHealth { ok: boolean; provider: string; modelCount?: number; message?: string }
export interface ToolResult<T> { ok: boolean; data?: T; error?: string }


export type RiskLevel = "low" | "medium" | "high" | "critical";
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AgentRole = "planner" | "architect" | "coder" | "reviewer" | "tester" | "debugger";

export interface H2OEvent<T = unknown> {
  type: string;
  at: string;
  payload?: T;
}

export interface ProjectMemoryItem {
  id: number;
  workspace: string;
  kind: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  sessionId: string;
  status: TaskStatus;
  input: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDecision {
  allowed: boolean;
  risk: RiskLevel;
  reason: string;
}

export interface AgentResult<T = unknown> {
  ok: boolean;
  output?: T;
  error?: string;
  usage?: { inputTokens?: number; outputTokens?: number; cost?: number };
}

export interface DashboardStatus {
  workspace: string;
  mode: H2OMode;
  busy: boolean;
  queueLength: number;
  status: string;
}
