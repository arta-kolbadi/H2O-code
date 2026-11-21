import fs from "node:fs";
import path from "node:path";
import ts from "typescript/lib/typescript.js";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "..");
const sourcePath = path.join(project, "src", "dashboard-app.jsx");
const outputPath = path.join(project, "src", "dashboard-app.js");
let source = fs.readFileSync(sourcePath, "utf8");
source = source.replace(
  /^import React, \{([^}]+)\} from "react";\s*/m,
  "const {$1} = React;\n"
);
source = source.replace(
  /^import \{ createRoot \} from "react-dom\/client";\s*/m,
  "const { createRoot } = ReactDOM;\n"
);
if (source.includes('from "react"') || source.includes('from "react-dom/client"')) {
  throw new Error("Dashboard React imports could not be converted to local UMD globals.");
}
const result = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.None,
    target: ts.ScriptTarget.ES2020,
    removeComments: true
  },
  reportDiagnostics: true
});
const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
if (errors.length) {
  throw new Error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
}
fs.writeFileSync(outputPath, result.outputText, "utf8");
console.log(`Built React dashboard: ${path.relative(project, outputPath)}`);
