declare function require(name: string): any;

import type { PluginExport } from "./types";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

export class PluginModuleLoader {
  load(modulePath: string, exportNames: string[]): PluginExport[] {
    const resolvedModulePath = path.resolve(modulePath);
    const loadedModule = this.loadModuleExports(resolvedModulePath);
    const selectedExportNames = exportNames.length > 0 ? exportNames : Object.keys(loadedModule);

    return selectedExportNames.map((exportName) => {
      const exportedValue = loadedModule[exportName];
      if (typeof exportedValue !== "function") {
        throw new Error(`Plugin export "${exportName}" in ${resolvedModulePath} is not a function`);
      }

      return exportedValue as PluginExport;
    });
  }

  private loadModuleExports(modulePath: string): Record<string, unknown> {
    const extension = path.extname(modulePath).toLowerCase();
    if (extension === ".js" || extension === ".cjs") {
      return require(modulePath);
    }

    if (extension !== ".ts") {
      throw new Error(`Unsupported plugin module extension: ${extension}`);
    }

    const source = fs.readFileSync(modulePath, "utf8");
    const transpiledSource = this.transpileTypeScriptPlugin(source);
    const module = { exports: {} as Record<string, unknown> };
    const moduleDirectory = path.dirname(modulePath);

    const localRequire = (request: string): unknown => {
      if (!request.startsWith(".") && !request.startsWith("/")) {
        throw new Error(`Plugin imports must be local paths: ${request}`);
      }

      const childModulePath = path.resolve(moduleDirectory, request);
      return this.loadModuleExports(childModulePath);
    };

    const script = new vm.Script(transpiledSource, { filename: modulePath });
    script.runInNewContext({
      module,
      exports: module.exports,
      require: localRequire,
      __filename: modulePath,
      __dirname: moduleDirectory,
    });

    return module.exports;
  }

  private transpileTypeScriptPlugin(source: string): string {
    let code = source;

    code = code.replace(
      /export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\)\s*(?::\s*([A-Za-z_][A-Za-z0-9_<>\[\]\s|]*))?\s*\{/g,
      (_match: string, name: string, params: string) => {
        return `exports.${name} = function ${name}(${this.stripTypeAnnotations(params)}) {`;
      },
    );

    code = code.replace(
      /export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(([\s\S]*?)\)\s*(?::\s*([A-Za-z_][A-Za-z0-9_<>\[\]\s|]*))?\s*=>/g,
      (_match: string, name: string, params: string) => {
        return `exports.${name} = (${this.stripTypeAnnotations(params)}) =>`;
      },
    );

    if (/\bexport\s+default\b/.test(code)) {
      throw new Error("Default exports are not supported in plugin modules");
    }

    return code;
  }

  private stripTypeAnnotations(params: string): string {
    return params.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*\??\s*:\s*([A-Za-z_][A-Za-z0-9_<>\[\]\s|]*)/g, "$1");
  }
}
