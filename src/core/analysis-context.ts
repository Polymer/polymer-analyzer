/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import * as path from 'path';

import {LazyEdgeMap, NoKnownParserError, Options as AnalyzerOptions, ScannerTable} from '../analyzer';
import {CssParser} from '../css/css-parser';
import {HtmlCustomElementReferenceScanner} from '../html/html-element-reference-scanner';
import {HtmlImportScanner} from '../html/html-import-scanner';
import {HtmlParser} from '../html/html-parser';
import {HtmlScriptScanner} from '../html/html-script-scanner';
import {HtmlStyleScanner} from '../html/html-style-scanner';
import {JavaScriptImportScanner} from '../javascript/javascript-import-scanner';
import {JavaScriptParser} from '../javascript/javascript-parser';
import {JsonParser} from '../json/json-parser';
import {Document, InlineDocInfo, LocationOffset, ScannedDocument, ScannedElement, ScannedFeature, ScannedImport, ScannedInlineDocument} from '../model/model';
import {ParsedDocument} from '../parser/document';
import {Parser} from '../parser/parser';
import {Measurement, TelemetryTracker} from '../perf/telemetry';
import {BehaviorScanner} from '../polymer/behavior-scanner';
import {CssImportScanner} from '../polymer/css-import-scanner';
import {DomModuleScanner} from '../polymer/dom-module-scanner';
import {PolymerElementScanner} from '../polymer/polymer-element-scanner';
import {PseudoElementScanner} from '../polymer/pseudo-element-scanner';
import {scan} from '../scanning/scan';
import {Scanner} from '../scanning/scanner';
import {TypeScriptAnalyzer} from '../typescript/typescript-analyzer';
import {TypeScriptImportScanner} from '../typescript/typescript-import-scanner';
import {TypeScriptPreparser} from '../typescript/typescript-preparser';
import {UrlLoader} from '../url-loader/url-loader';
import {UrlResolver} from '../url-loader/url-resolver';
import {MultiMap} from '../util/multimap';
import {ElementScanner as VanillaElementScanner} from '../vanilla-custom-elements/element-scanner';
import {Severity, Warning, WarningCarryingException} from '../warning/warning';

import {AnalysisCache} from './analysis-cache';
import {LanguageAnalyzer} from './language-analyzer';


// export interface Options extends AnalyzerOptions { //
//   roots: Set<string>;
// }

export type AnalysisResult = Document | Warning;

/**
 * An analysis of a set of files at a specific point-in-time with respect to
 * updates to those files. New files can be added to an existing context, but
 * updates to files will cause a fork of the context with new analysis results.
 *
 * All file contents and analysis results are consistent within a single
 * anaysis context. A context is forked via either the fileChanged or
 * clearCaches methods.
 *
 * For almost all purposes this is an entirely internal implementation detail.
 * An Analyzer instance has a reference to its current context, so it will
 * appear to be statefull with respect to file updates.
 */
export class AnalysisContext {
  _parsers = new Map<string, Parser<ParsedDocument<any, any>>>([
    ['html', new HtmlParser()],
    ['js', new JavaScriptParser()],
    ['ts', new TypeScriptPreparser()],
    ['css', new CssParser()],
    ['json', new JsonParser()],
  ]);

  private _languageAnalyzers = new Map<string, LanguageAnalyzer<any>>([
    ['ts', new TypeScriptAnalyzer(this)],
  ]);

  /** The set of root files that have been analyzed via analyze() */
  // private _roots: Set<string>;

  /** A map from import url to urls that document lazily depends on. */
  private _lazyEdges: LazyEdgeMap|undefined;

  /** Resolves when analysis is complete */
  private _analysisComplete: Promise<void>;

  private _prescanners: ScannerTable;
  private _scanners: ScannerTable;

  _loader: UrlLoader;
  private _resolver: UrlResolver|undefined;

  _cache = new AnalysisCache();

  private _telemetryTracker = new TelemetryTracker();
  private _generation = 0;

  // Prescanners let us find other documents just after parsing, including
  // imports and inline documemts.
  private static _getDefaultPreScanners(lazyEdges: LazyEdgeMap|undefined) {
    return new Map<string, Scanner<any, any, any>[]>([
      [
        'html',
        [
          new HtmlImportScanner(lazyEdges),  // <link rel="import">
          new HtmlScriptScanner(),           // <script>
          new HtmlStyleScanner(),  // <style> and <link rel="stylesheet">
          new CssImportScanner(),  //<dom-module><link rel="import" type="css">
        ]
      ],
      [
        'js',
        [
          new JavaScriptImportScanner(),  // import from 'x';
        ]
      ],
      [
        'ts',
        [
          new TypeScriptImportScanner(),  // import from 'x';
        ]
      ]
    ]);
  }

  // Scanners find features after a whole project has been loaded, and
  // possibly after language analysis.
  private static _getDefaultScanners() {
    return new Map<string, Scanner<any, any, any>[]>([
      [
        'html',
        [
          new DomModuleScanner(),
          new HtmlCustomElementReferenceScanner(),
          new PseudoElementScanner()
        ]
      ],
      [
        'js',
        [
          new PolymerElementScanner(),
          new BehaviorScanner(),
          new VanillaElementScanner()
        ]
      ],
    ]);
  }

  constructor(options: AnalyzerOptions) {
    if (options.urlResolver == null) {
      throw new Error('no urlResolver');
    }
    this._loader = options.urlLoader;
    this._resolver = options.urlResolver;
    this._parsers = options.parsers || this._parsers;
    this._lazyEdges = options.lazyEdges;
    this._prescanners = options.prescanners ||
        AnalysisContext._getDefaultPreScanners(this._lazyEdges);
    this._scanners = options.scanners || AnalysisContext._getDefaultScanners();
  }

  /**
   * Returns a copy of this cache context with proper cache invalidation.
   */
  filesChanged(urls: string[]) {
    const newCache =
        this._cache.invalidate(urls.map((url) => this.resolveUrl(url)));
    return this._fork(newCache);
  }

  /**
   * Analyzes a set of root files, and returns a Promise of a possibly new
   * AnalysisContext. A new AnalysisContext is returned if a new global
   * analysis needs to be performed which happens when ever any new files are
   * added to a context, or any files are updated, otherwise the existing
   * AnalysisContext is returned.
   *
   * This method is asynchronous because if analysis is in progress we might
   * not yet know all the files, and so don't know whether or not a new context
   * is needed. In this case analyze() waits on the in progress work, and then
   * decides whether to fork the context.
   *
   * After getting a context from this method, call getDocument(url) to get
   * an analyzed document for a specific URL.
   */
  async analyze(urls: string[]): Promise<AnalysisContext> {
    console.log('analyze', urls);
    const resolvedUrls = urls.map((url) => this.resolveUrl(url));

    // 1. Await current analysis if there is one, so we can check to see if has
    // the requested URLs. _analysisComplete
    await this._analysisComplete;

    // 2. Check to see if we have the documents
    const hasAllDocuments = resolvedUrls.every(
        (url) => this._cache.analyzedDocuments.get(url) != null);
    if (hasAllDocuments) {
      // all requested URLs are present, return the existing context
      return this;
    }

    // 3. Some URLs are new, so fork, but don't invalidate anything
    const newCache = this._cache.invalidate([]);
    const newContext = this._fork(newCache);
    return newContext._analyze(resolvedUrls);
  }

  /**
   * Internal analysis method called when we know we need to fork.
   */
  private async _analyze(resolvedUrls: string[]): Promise<AnalysisContext> {
    const analysisComplete = (async() => {
      const doneTiming = this._telemetryTracker.start(
          'analyze: make document', `${resolvedUrls}`);

      // 3. Load and pre-scan all roots
      // TODO(justinfagnani): return or record warnings somewhere, so we can
      // retrieve
      // them in getDocument()
      const prescannedDocuments =
          await Promise.all(resolvedUrls.map((url) => this.prescan(url)));

      // 4. Run global analysis
      const documentsByType =
          MultiMap.from(prescannedDocuments, (d) => d.parsedDocument.type);
      for (const documentType of documentsByType.keys()) {
        const languageAnalyzer = this._languageAnalyzers.get(documentType);
        if (languageAnalyzer) {
          const documents = documentsByType.get(documentType)!;
          // Right now because TypeScript is our only global analyzer, we
          // know that global analysis produces one result. Global analysis
          // could very well produce per-document results in the future.
          const analysisResult = languageAnalyzer.analyze(documents);
          this._cache.globalAnalysisResults.set(documentType, analysisResult);
        }
      }

      const documents = await this.scan(resolvedUrls);
      for (const document of documents) {
        if (document instanceof Document) {
          document.resolve();
        }
      }

      doneTiming();
      return documents;
    })();

    this._analysisComplete = analysisComplete.then((_) => {});
    await analysisComplete;
    return this;
  }

  async scan(urls: string[]): Promise<AnalysisResult[]> {
    console.log('scan', urls);
    // const visited = new Set<ScannedDocument>();
    // return Promise.all(scannedDocuments.map((d) => this._scan(d, visited)));
    await this._cache.dependencyGraph.forEach(urls, async(url: string) => {
      console.log('forEach', url);
      await this._scanLocal(url);
    });
    return urls.map((url) => this.getDocument(url));
  }

  private async _scanLocal(url: string): Promise<AnalysisResult> {
    console.log('_scanLocal', url);
    const d = await this._cache.analyzedDocumentPromises.getOrCompute(
        url, async() => {
          console.log('analyzedDocumentPromises.getOrCompute', url);
          const prescannedDocument = this._getPrescannedDocument(url);
          if (prescannedDocument) {
            const d = await this._scanDocument(prescannedDocument);
            console.log('analyzedDocumentPromises.getOrCompute done', url);
            return d;
          }
        });
    this._cache.analyzedDocuments.set(url, d);
    console.log('_scanLocal done', d != null);
    return d;
  }

  async _scanDocument(scannedDocument: ScannedDocument):
      Promise<AnalysisResult> {
    console.log(
        '_scanDocument',
        scannedDocument.url,
        scannedDocument.isInline,
        scannedDocument.parsedDocument.type);

    // scan inline documents
    const scannedInlineDocuments =
        scannedDocument.features
            .filter(
                (f) => f instanceof ScannedInlineDocument &&
                    f.scannedDocument != null)
            .map((d: ScannedInlineDocument) => d.scannedDocument!);

    console.log(
        '_scanDocument inlineDocuments',
        scannedInlineDocuments.map((d) => `${d.url}:${d.parsedDocument.type}`));

    // TODO: what to do with these scanned inline documents? They need
    // to override the prescanned documents...
    const inlineDocumentsOrWarnings =
        await Promise.all(scannedInlineDocuments.map(async(d) => {
          // const imports = d.features.filter((f) => f instanceof
          // ScannedImport);
          // const importUrls = imports.map((i: ScannedImport) => i.url);
          return this._scanDocument(d);
        }));
    const inlineDocuments: Document[] = [];
    const inlineDocumentWarnings: Warning[] = [];
    for (const docOrWarning of inlineDocumentsOrWarnings) {
      if (docOrWarning instanceof Document) {
        inlineDocuments.push(docOrWarning);
      } else {
        inlineDocumentWarnings.push(docOrWarning);
      }
    }

    // TODO: ScannedDocument should copy features, not wrap another
    // ScannedDocument
    // InlineScannedDocuments need to replace the prescanned documents as
    // features
    // then add these into the ScannedDocument created below.
    // Always create a new ScannedDocument
    // Possibly create separate classes for Prescanned and Scanned documents
    // Polymer just use Document, since scanned documents now have the same
    // lifetime as Documents. Possibly merge resolve() and scan()

    const type = scannedDocument.parsedDocument.type;
    const scanners = this._scanners.get(type);
    console.log('scanners for', type, scanners);
    const analysisResult = this._cache.globalAnalysisResults.get(type);
    let features: ScannedFeature[] = [];
    if (scanners != null) {
      features = await scan(
          scannedDocument.parsedDocument,
          scanners,
          scannedDocument,
          analysisResult);
    }
    features = features.concat(inlineDocuments);
    const document =
        new Document(scannedDocument, this, analysisResult, features);
    return document;
  }

  /**
   * Gets an analyzed Document from the document cache. This is only useful for
   * Analyzer plugins. You almost certainly want to use `analyze()` instead.
   *
   * If a document has been analyzed, it returns the analyzed Document. If not
   * the scanned document cache is used and a new analyzed Document is returned.
   * If a file is in neither cache, it returns `undefined`.
   */
  getDocument(url: string): AnalysisResult {
    console.log('getDocument', url);
    const resolvedUrl = this.resolveUrl(url);
    const cachedDocument = this._cache.analyzedDocuments.get(resolvedUrl);
    if (cachedDocument) {
      return cachedDocument;
    }
    console.warn(`No analyzed document found for url ${url}`);
    return <Warning>{
      sourceRange: {
        file: this.resolveUrl(url),
        start: {line: 0, column: 0},
        end: {line: 0, column: 0}
      },
      code: 'unable-to-analyze',
      message: `Unable to analyze url: ${url}`,
      severity: Severity.ERROR
    };
  }

  /**
   * This is only useful for Analyzer plugins.
   *
   * If a url has been prescanned, returns the ScannedDocument.
   */
  _getPrescannedDocument(url: string): ScannedDocument|undefined {
    const resolvedUrl = this.resolveUrl(url);
    return this._cache.prescannedDocuments.get(resolvedUrl);
  }

  async getTelemetryMeasurements(): Promise<Measurement[]> {
    return this._telemetryTracker.getMeasurements();
  }

  /**
   * Clear all cached information from this analyzer instance.
   *
   * Note: if at all possible, instead tell the analyzer about the specific
   * files that changed rather than clearing caches like this. Caching provides
   * large performance gains.
   */
  clearCaches(): AnalysisContext {
    return this._fork(new AnalysisCache());
  }

  /**
   * Return a copy, but with the given cache.
   */
  private _fork(cache: AnalysisCache): AnalysisContext {
    const copy = new AnalysisContext({
      lazyEdges: this._lazyEdges,
      parsers: this._parsers,
      scanners: this._scanners,
      urlLoader: this._loader,
      urlResolver: this._resolver,
    });
    copy._telemetryTracker = this._telemetryTracker;
    copy._cache = cache;
    copy._generation = this._generation + 1;
    return copy;
  }

  /**
   * Scans a file locally, that is for features that do not depend
   * on this files imports. Local features can be cached even when
   * imports are invalidated. This method does not trigger transitive
   * scanning, _scan() does that.
   *
   * TODO(justinfagnani): consider renaming this to something like
   * _preScan, since about the only useful things it can find are
   * imports, exports and other syntactic structures.
   */
  private async _prescanLocal(resolvedUrl: string): Promise<ScannedDocument> {
    return this._cache.scannedDocumentPromises.getOrCompute(
        resolvedUrl, async() => {
          try {
            const parsedDoc = await this._parse(resolvedUrl);
            const scannedDocument = await this._prescanDocument(parsedDoc);

            // Find all non-lazy imports
            // TODO(justinfagnani): I think we should scan lazily imported
            // documents since we know about them, we should load them. Their
            // features should possibly be separated out at export time via
            // better definition of scopes
            const imports = scannedDocument.getNestedFeatures().filter(
                (e) => e instanceof ScannedImport &&
                    e.type !== 'lazy-html-import') as ScannedImport[];

            // Update dependency graph
            const importUrls = imports.map((i) => this.resolveUrl(i.url));
            this._cache.dependencyGraph.addDocument(resolvedUrl, importUrls);

            return scannedDocument;
          } catch (e) {
            this._cache.dependencyGraph.rejectDocument(resolvedUrl, e);
            throw e;
          }
        });
  }

  /**
   * Scan a toplevel document and all of its transitive dependencies.
   */
  async prescan(resolvedUrl: string): Promise<ScannedDocument> {
    return this._cache.dependenciesScannedPromises.getOrCompute(
        resolvedUrl, async() => {
          const scannedDocument = await this._prescanLocal(resolvedUrl);
          // Find all non-lazy imports
          // TODO(justinfagnani): I think we should scan lazily imported
          // documents since we know about them, we should load them. Their
          // features should possibly be separated out at export time via better
          // definition of scopes
          const imports = scannedDocument.getNestedFeatures().filter(
              (e) => e instanceof ScannedImport &&
                  e.type !== 'lazy-html-import') as ScannedImport[];

          // Scan imports
          for (const scannedImport of imports) {
            const importUrl = this.resolveUrl(scannedImport.url);
            // Request a scan of `importUrl` but do not wait for the results to
            // avoid deadlock in the case of cycles. Later we use the
            // DependencyGraph
            // to wait for all transitive dependencies to load.
            this.prescan(importUrl).catch((error) => {
              if (error instanceof NoKnownParserError) {
                // We probably don't want to fail when importing something
                // that we don't know about here.
              }
              error = error || '';
              // TODO(rictic): move this to the resolve phase, it will be
              // improperly cached as it is.
              scannedDocument.warnings.push({
                code: 'could-not-load',
                message: `Unable to load import: ${error.message || error}`,
                sourceRange: (
                    scannedImport.urlSourceRange || scannedImport.sourceRange)!,
                severity: Severity.ERROR
              });
            });
          }
          await this._cache.dependencyGraph.whenReady(resolvedUrl);
          return scannedDocument;
        });
  }

  /**
   * Scans a ParsedDocument.
   */
  private async _prescanDocument(
      document: ParsedDocument<any, any>,
      maybeAttachedComment?: string): Promise<ScannedDocument> {
    const warnings: Warning[] = [];
    const scannedFeatures = await this._getPrescannedFeatures(document);
    // If there's an HTML comment that applies to this document then we assume
    // that it applies to the first feature.
    const firstScannedFeature = scannedFeatures[0];
    if (firstScannedFeature && firstScannedFeature instanceof ScannedElement) {
      firstScannedFeature.applyHtmlComment(maybeAttachedComment);
    }

    const scannedDocument =
        new ScannedDocument(document, scannedFeatures, warnings);

    if (!scannedDocument.isInline) {
      if (this._cache.prescannedDocuments.has(scannedDocument.url)) {
        throw new Error(
            'Scanned document already in cache. This should never happen.');
      }
      this._cache.prescannedDocuments.set(scannedDocument.url, scannedDocument);
    }
    await this._prescanInlineDocuments(scannedDocument);
    return scannedDocument;
  }

  // visible for testing
  async _getPrescannedFeatures(document: ParsedDocument<any, any>):
      Promise<ScannedFeature[]> {
    const scanners = this._prescanners.get(document.type);
    let features: ScannedFeature[] = [];
    if (scanners) {
      features = await scan(document, scanners);
    }
    return features;
  }

  private async _prescanInlineDocuments(containingDocument: ScannedDocument) {
    for (const feature of containingDocument.features) {
      if (!(feature instanceof ScannedInlineDocument)) {
        continue;
      }
      const locationOffset: LocationOffset = {
        line: feature.locationOffset.line,
        col: feature.locationOffset.col,
        filename: containingDocument.url
      };
      try {
        const parsedDoc = this._parseContents(
            feature.type,
            feature.contents,
            containingDocument.url,
            {locationOffset, astNode: feature.astNode});
        const scannedDoc =
            await this._prescanDocument(parsedDoc, feature.attachedComment);

        feature.scannedDocument = scannedDoc;
      } catch (err) {
        if (err instanceof WarningCarryingException) {
          containingDocument.warnings.push(err.warning);
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Loads the content at the provided resolved URL.
   *
   * Currently does no caching. If the provided contents are given then they
   * are used instead of hitting the UrlLoader (e.g. when you have in-memory
   * contents that should override disk).
   */
  async load(resolvedUrl: string) {
    if (!this._loader.canLoad(resolvedUrl)) {
      throw new Error(`Can't load URL: ${resolvedUrl}`);
    }
    return this._loader.load(resolvedUrl);
  }

  /**
   * Caching + loading wrapper around _parseContents.
   */
  private async _parse(resolvedUrl: string): Promise<ParsedDocument<any, any>> {
    return this._cache.parsedDocumentPromises.getOrCompute(
        resolvedUrl, async() => {
          const content = await this.load(resolvedUrl);
          const extension = path.extname(resolvedUrl).substring(1);

          const doneTiming =
              this._telemetryTracker.start('parse', 'resolvedUrl');
          const parsedDoc =
              this._parseContents(extension, content, resolvedUrl);
          doneTiming();
          return parsedDoc;
        });
  }

  /**
   * Parse the given string into the Abstract Syntax Tree (AST) corresponding
   * to its type.
   */
  private _parseContents(
      type: string, contents: string, url: string,
      inlineInfo?: InlineDocInfo<any>): ParsedDocument<any, any> {
    const parser = this._parsers.get(type);
    if (parser == null) {
      throw new NoKnownParserError(`No parser for for file type ${type}`);
    }
    try {
      return parser.parse(contents, url, inlineInfo);
    } catch (error) {
      if (error instanceof WarningCarryingException) {
        throw error;
      }
      throw new Error(`Error parsing ${url}:\n ${error.stack}`);
    }
  }

  /**
   * Resolves a URL with this Analyzer's `UrlResolver` if it has one, otherwise
   * returns the given URL.
   */
  resolveUrl(url: string): string {
    return this._resolver && this._resolver.canResolve(url) ?
        this._resolver.resolve(url) :
        url;
  }
}
