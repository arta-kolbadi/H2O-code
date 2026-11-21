const COMPLEX_HINTS = /\b(architect|architecture|refactor|debug|investigate|security|performance|multi[- ]file|migration|design|review|optimi[sz]e|reasoning|plan|complex)\b|معماری|بازنویسی|اشکال.?زدایی|امنیت|بهینه.?سازی|تحلیل|بررسی.*کد/i;
const STRONG_MODEL_HINTS = /(opus|sonnet|gpt-5|gpt-4\.1|o[13](?:-|$)|reason|thinking|(?:^|[-_/.:])pro(?:[-_/.:]|$)|large|70b|72b|deepseek-r1|gemini-3\.[0-9]+-pro)/i;
const FAST_MODEL_HINTS = /(mini|flash|haiku|fast|small|nano|lite|free)/i;

/** Deterministic, explainable model selection; provider metadata remains authoritative when available. */
export function selectModel(models, { prompt = "", preferFree = true, requested = "auto" } = {}) {
  if (!Array.isArray(models) || models.length === 0) throw new Error("The provider returned no models. Choose a model manually or check provider access.");
  if (requested && requested !== "auto") {
    const exact = models.find(model => model.id === requested);
    if (exact) return { ...exact, reason: "manually selected" };
    return { id: requested, name: requested, free: false, reason: "manual model ID" };
  }
  let pool = [...models];
  if (preferFree && pool.some(model => model.free)) pool = pool.filter(model => model.free);
  const complex = COMPLEX_HINTS.test(prompt) || String(prompt).length > 1400;
  const ranked = pool.map((model, index) => {
    const id = `${model.id} ${model.name || ""}`;
    let score = 0;
    if (complex && STRONG_MODEL_HINTS.test(id)) score += 5;
    if (!complex && FAST_MODEL_HINTS.test(id)) score += 4;
    if (model.context && model.context > 64_000 && complex) score += 2;
    if (model.context && model.context < 8_000 && complex) score -= 3;
    return { model, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen = ranked[0].model;
  return { ...chosen, reason: `${complex ? "complex" : "simple"} task${chosen.free ? ", free model preferred" : ""}` };
}
