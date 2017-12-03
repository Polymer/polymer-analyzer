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

import {posix as pathlib} from 'path';
import {format as formatUrl, Url} from 'url';
import Uri from 'vscode-uri';

import {parseUrl} from '../core/utils';
import {FileRelativeUrl, ScannedImport} from '../index';
import {ResolvedUrl} from '../model/url';

import {UrlResolver} from './url-resolver';

export interface PackageUrlResolverOptions {
  packageDir?: string;
  componentDir?: string;
  hostname?: string;
}

/**
 * Resolves a URL to a canonical URL within a package.
 */
export class PackageUrlResolver extends UrlResolver {
  private readonly packageDir: string;
  private readonly packageUrl: ResolvedUrl;
  readonly componentDir: string;
  readonly hostname: string|null;

  constructor(options?: PackageUrlResolverOptions) {
    super();
    options = options || {};
    this.packageDir = pathlib.resolve(options.packageDir || process.cwd());
    if (!this.packageDir.endsWith('/')) {
      this.packageDir += '/';
    }
    this.packageUrl = this.brandAsResolved(
        formatUrl({protocol: 'file:', pathname: encodeURI(this.packageDir)}));
    this.componentDir = options.componentDir || 'bower_components/';
    this.hostname = options.hostname || null;
  }

  resolve(
      unresolvedHref: FileRelativeUrl, baseUrl: ResolvedUrl = this.packageUrl,
      _import?: ScannedImport): ResolvedUrl|undefined {
    const resolvedHref = this.simpleUrlResolve(unresolvedHref, baseUrl);
    if (resolvedHref === undefined) {
      return undefined;
    }
    const url = parseUrl(resolvedHref);
    const isLocalFileUrl =
        url.protocol === 'file:' && (!url.host || url.host === 'localhost');
    const isOurHostname = url.hostname === this.hostname;
    if (isLocalFileUrl || isOurHostname) {
      return this.handleFileUrl(url, unresolvedHref);
    }
    return this.brandAsResolved(resolvedHref);
  }

  private handleFileUrl(url: Url, unresolvedHref: string) {
    let pathname: string;
    const unresolvedUrl = parseUrl(unresolvedHref);
    if (unresolvedUrl.pathname && unresolvedUrl.pathname.startsWith('/') &&
        unresolvedUrl.protocol !== 'file:') {
      // Absolute urls point to the package root.
      let unresolvedPathname: string;
      try {
        unresolvedPathname =
            pathlib.normalize(decodeURI(unresolvedUrl.pathname));
      } catch (e) {
        return undefined;
      }
      pathname = pathlib.join(this.packageDir, unresolvedPathname);
    } else {
      try {
        pathname = pathlib.normalize(decodeURI(url.pathname || ''));
      } catch (e) {
        return undefined;  // undecodable url
      }
    }

    // If the path points to a sibling directory, resolve it to the
    // component directory
    const parentOfPackageDir = pathlib.dirname(this.packageDir);
    if (pathname.startsWith(parentOfPackageDir) &&
        !pathname.startsWith(this.packageDir)) {
      console.log(`
          pathname: ${pathname}
          packageDir: ${this.packageDir}
          parentOfPackageDir: ${parentOfPackageDir}
      `);
      pathname = pathlib.join(
          this.packageDir,
          this.componentDir,
          pathname.substring(parentOfPackageDir.length));
    }

    // Re-encode URI, since it is expected we are emitting a relative URL.
    return this.brandAsResolved(Uri.file(pathname).toString());
  }

  relative(fromOrTo: ResolvedUrl, maybeTo?: ResolvedUrl, _kind?: string):
      FileRelativeUrl {
    let from, to;
    if (maybeTo !== undefined) {
      from = fromOrTo;
      to = maybeTo;
    } else {
      from = this.packageUrl;
      to = fromOrTo;
    }
    return this.simpleUrlRelative(from, to);
  }
}
