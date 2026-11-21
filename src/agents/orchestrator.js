/**
 * Bounded hybrid multi-agent coordinator.
 * Role implementations are injected so providers remain transport-agnostic.
 */
export class AgentOrchestrator {
  constructor({ agents, maxRepairRounds = 2, onEvent = () => {} } = {}) {
    this.agents = agents || {};
    this.maxRepairRounds = Math.max(0, Math.min(4, maxRepairRounds));
    this.onEvent = onEvent;
  }
  async run(task, { signal, roles = ["planner", "coder", "reviewer", "tester"] } = {}) {
    const results = [];
    const call = async (role, input) => {
      if (signal?.aborted) throw new Error("Task cancelled.");
      const agent = this.agents[role];
      if (!agent || typeof agent.run !== "function") throw new Error(`Agent role is not configured: ${role}`);
      this.onEvent({ type: "agent.started", role });
      const output = await agent.run(input, { signal });
      this.onEvent({ type: "agent.completed", role });
      results.push({ role, output });
      return output;
    };
    let plan = task;
    if (roles.includes("planner")) plan = await call("planner", task);
    let implementation = plan;
    if (roles.includes("coder")) implementation = await call("coder", { task, plan });
    if (roles.includes("reviewer")) {
      let review = await call("reviewer", { task, plan, implementation });
      for (let round = 0; review?.approved === false && round < this.maxRepairRounds; round++) {
        implementation = await call("coder", { task, plan, implementation, review, repairRound: round + 1 });
        review = await call("reviewer", { task, plan, implementation, repairRound: round + 1 });
      }
      if (review?.approved === false) {
        return { ok: false, reason: "Review did not pass within the repair limit.", plan, implementation, review, results };
      }
    }
    let tests = null;
    if (roles.includes("tester")) tests = await call("tester", { task, plan, implementation });
    const ok = tests?.passed !== false;
    return { ok, plan, implementation, tests, results };
  }
}
