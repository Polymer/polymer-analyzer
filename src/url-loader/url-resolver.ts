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

import * as fs from 'mz/fs';
import * as pathlib from 'path';
import {posix} from 'path';

import {ScannedImport} from '../index';
import {FileRelativeUrl, ResolvedUrl} from '../model/url';

/**
 * Resolves the given URL to the concrete URL that a resource can
 * be loaded from.
 *
 * This can be useful to resolve name to paths, such as resolving 'polymer' to
 * '../polymer/polymer.html', or component paths, like '../polymer/polymer.html'
 * to '/bower_components/polymer/polymer.html'.
 */
export abstract class UrlResolver {
  static async createForDirectory(dirname: string): Promise<UrlResolver> {
    // Break the import loop by doing a dynamic import.
    const {PackageUrlResolver} = await import('./package-url-resolver');

    const componentDir = await inferComponentDirname(dirname);

    return new PackageUrlResolver({componentDir});
  }

  /**
   * Resoves `url` to a new location.
   *
   * Returns `undefined` if the given url cannot be resolved.
   */
  abstract resolve(
      url: FileRelativeUrl, baseUrl?: ResolvedUrl,
      scannedImport?: ScannedImport): ResolvedUrl|undefined;

  abstract relative(to: ResolvedUrl): FileRelativeUrl;
  abstract relative(from: ResolvedUrl, to?: ResolvedUrl, kind?: string):
      FileRelativeUrl;

  protected simpleUrlRelative(from: ResolvedUrl, to: ResolvedUrl):
      FileRelativeUrl {
    if (!from.endsWith('/')) {
      from = this.brandAsResolved(posix.dirname(from));
    }
    let result = posix.relative(from, to);
    if (to.endsWith('/')) {
      result += '/';
    }
    return this.brandAsRelative(result);
  }

  protected brandAsRelative(url: string): FileRelativeUrl {
    return url as FileRelativeUrl;
  }

  protected brandAsResolved(url: string): ResolvedUrl {
    return url as ResolvedUrl;
  }
}

async function inferComponentDirname(dirname: string): Promise<string> {
  try {
    const contents = await fs.readFile(
        pathlib.join(dirname, '.bowerrc'), {encoding: 'utf8'});
    const bowerrc = JSON.parse(contents);
    if (typeof bowerrc.directory === 'string') {
      return bowerrc.directory;
    }
  } catch { /* don't care */
  }
  const [bowerJsonExists, packageJsonExists] = await Promise.all([
    fs.exists(pathlib.join(dirname, 'bower.json')),
    fs.exists(pathlib.join(dirname, 'package.json')),
  ]);
  if (bowerJsonExists) {
    return 'bower_components';
  } else if (packageJsonExists) {
    return 'node_modules';
  }
  return 'bower_components';
}
