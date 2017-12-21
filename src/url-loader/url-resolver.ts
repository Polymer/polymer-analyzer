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
import {format as urlLibFormat, resolve as urlLibResolver} from 'url';

import {parseUrl} from '../core/utils';
import {PackageRelativeUrl, ScannedImport} from '../index';
import {FileRelativeUrl, ResolvedUrl} from '../model/url';

const sharedRelativeUrlProperties =
    ['protocol', 'slashes', 'auth', 'host', 'port', 'hostname'];

/**
 * Resolves the given URL to the concrete URL that a resource can
 * be loaded from.
 *
 * This can be useful to resolve name to paths, such as resolving 'polymer' to
 * '../polymer/polymer.html', or component paths, like '../polymer/polymer.html'
 * to '/bower_components/polymer/polymer.html'.
 */
export abstract class UrlResolver {
  /**
   * Resoves `url` to a new location.
   *
   * Returns `undefined` if the given url cannot be resolved.
   */
  abstract resolve(url: PackageRelativeUrl): ResolvedUrl|undefined;
  abstract resolve(
      url: FileRelativeUrl, baseUrl: ResolvedUrl,
      scannedImport?: ScannedImport): ResolvedUrl|undefined;

  abstract relative(to: ResolvedUrl): FileRelativeUrl;
  abstract relative(from: ResolvedUrl, to?: ResolvedUrl, kind?: string):
      FileRelativeUrl;

  protected simpleUrlResolve(
      url: FileRelativeUrl|PackageRelativeUrl,
      baseUrl: ResolvedUrl): ResolvedUrl {
    let resolved = urlLibResolver(baseUrl, url);

    // TODO(usergenic): There is no *explicit* test coverage for the missing
    // trailing slash on urlLibResolver'd urls.  Investigate why this
    // double-check is necessary here, since I adapted the existing logic
    // in-place from the prior form to support urls containing search and hash.
    // I'm guessing this is related to Windows...?
    const {pathname} = parseUrl(url);
    if (pathname && pathname.endsWith('/')) {
      const resolvedUrl = parseUrl(resolved);
      if (!resolvedUrl.pathname!.endsWith('/')) {
        resolvedUrl.pathname += '/';
        resolved = urlLibFormat(resolvedUrl);
      }
    }
    return this.brandAsResolved(resolved);
  }

  protected simpleUrlRelative(fromUri: ResolvedUrl, toUri: ResolvedUrl):
      FileRelativeUrl {
    const fromUrl = parseUrl(fromUri)!;
    const toUrl = parseUrl(toUri)!;
    // Return the toUri as-is if there are conflicting components which
    // prohibit calculating a relative form.
    if (sharedRelativeUrlProperties.some(
            (p) => (toUrl as any)[p] !== null &&
                (fromUrl as any)[p] !== (toUrl as any)[p])) {
      return this.brandAsRelative(toUri);
    }
    if (fromUrl.pathname === toUrl.pathname) {
      toUrl.pathname = '';
    } else {
      const fromDir = fromUrl.pathname !== undefined ?
          fromUrl.pathname.replace(/[^/]+$/, '') :
          '';
      const toDir = toUrl.pathname !== undefined ? toUrl.pathname : '';
      // Note, below, the _ character is appended to the `toDir` so that paths
      // with trailing slash will retain the trailing slash in the result.
      toUrl.pathname =
          path.posix.relative(fromDir, toDir + '_').replace(/_$/, '');
    }
    sharedRelativeUrlProperties.forEach((p) => (toUrl as any)[p] = null);
    toUrl.path = undefined;
    return this.brandAsRelative(urlLibFormat(toUrl));
  }

  protected brandAsRelative(url: string): FileRelativeUrl {
    return url as FileRelativeUrl;
  }

  protected brandAsResolved(url: string): ResolvedUrl {
    return url as ResolvedUrl;
  }
}
