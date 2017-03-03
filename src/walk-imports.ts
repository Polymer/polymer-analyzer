#! /usr/bin/env node

import {Analyzer} from './analyzer';
import {Document} from './model/model';
import {FSUrlLoader} from './url-loader/fs-url-loader';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error(
        'Pass two arguments, `from` and `to`, to list all distinct paths ' +
        'along the import graph between the two.\n');
    return;
  }
  const from = args[0]!;
  const to = args[1]!;
  const analyzer = new Analyzer({urlLoader: new FSUrlLoader(process.cwd())});
  const pckage = await analyzer.analyzePackage();
  const fromDocs =
      Array.from(pckage.getById('document', from)).filter((d) => !d.isInline);
  if (fromDocs.length !== 1) {
    console.error(
        `Found ${fromDocs.length} documents at url ${from}` +
        ` relative to ${process.cwd()}`);
    return;
  }
  const fromDoc = fromDocs[0]!;
  for (const path of getPaths(fromDoc, to, new Set(), [], [from])) {
    console.log(path.join(' -> '));
  }
}

function getPaths(
    fromDoc: Document,
    to: string,
    visited: Set<string>,
    results: string[][],
    currentPath: string[]) {
  if (fromDoc.url === to) {
    results.push(currentPath);
    return results;
  }
  if (visited.has(fromDoc.url)) {
    return results;
  }
  visited.add(fromDoc.url);

  const inlineDocs = Array.from(fromDoc.getByKind('document'))
                         .filter((d) => d.isInline && d !== fromDoc);
  const documents = [fromDoc].concat(inlineDocs);
  const imports = new Set();
  for (const doc of documents) {
    for (const imprt of doc.getByKind('import')) {
      imports.add(imprt);
    }
  }
  for (const imprt of imports) {
    if (imprt.document) {
      getPaths(imprt.document, to, visited, results, currentPath.concat([
        imprt.document.url
      ]));
    }
  }

  return results;
}

main()
    .catch((err) => {
      console.error(err ? (err.stack || err.message || err) : err);
    });
