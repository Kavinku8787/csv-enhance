import { SheetSemanticAnalyzer } from "../analysis/analyzer";
import type { AnalyzedSheetDocument } from "../analysis/types";
import { DefaultSheetFileReader, type SheetFileReader } from "../file-interface/reader";
import type { ResolvedSheetDocument, SheetFile } from "../file-interface/types";
import { DocumentExecutor } from "./document-executor";
import { PlotCompiler, type VegaLiteBarSpec } from "./plot-compiler";
import type { EvaluatedSheetDocument } from "./types";

export interface CompiledSheetResult {
  file?: SheetFile;
  analyzedDocument: AnalyzedSheetDocument;
  evaluatedDocument: EvaluatedSheetDocument;
  plotSpecs: VegaLiteBarSpec[];
}

export class SheetCompiler {
  constructor(
    private readonly reader: SheetFileReader = new DefaultSheetFileReader(),
    private readonly analyzer: SheetSemanticAnalyzer = new SheetSemanticAnalyzer(),
    private readonly executor: DocumentExecutor = new DocumentExecutor(),
    private readonly plotCompiler: PlotCompiler = new PlotCompiler(),
  ) {}

  compilePath(path: string): CompiledSheetResult {
    const file = this.reader.readFromPath(path);
    return this.compileResolvedDocument(file.document, file);
  }

  compileSource(source: string, path?: string): CompiledSheetResult {
    const file = this.reader.readFromString(source, path);
    return this.compileResolvedDocument(file.document, file);
  }

  compileDocument(document: ResolvedSheetDocument): CompiledSheetResult {
    return this.compileResolvedDocument(document);
  }

  compileAnalyzedDocument(document: AnalyzedSheetDocument): CompiledSheetResult {
    const evaluatedDocument = this.executor.execute(document);

    return {
      analyzedDocument: document,
      evaluatedDocument,
      plotSpecs: evaluatedDocument.plots.map((plot) => this.plotCompiler.compileBarPlot(plot)),
    };
  }

  private compileResolvedDocument(document: ResolvedSheetDocument, file?: SheetFile): CompiledSheetResult {
    const analyzedDocument = this.analyzer.analyze(document);
    const compiled = this.compileAnalyzedDocument(analyzedDocument);

    return {
      ...compiled,
      file,
    };
  }
}
