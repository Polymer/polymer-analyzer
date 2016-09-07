/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
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

import {UrlLoader} from './url-loader';

/**
 * Resolves requests via the file system.
 */
export class MultiUrlLoader implements UrlLoader {

  loaders: UrlLoader[];

  constructor(loaders: UrlLoader[]) {
    this.loaders = loaders;
  }

  canLoad(url: string): boolean {
    return this.loaders.some((loader) => {
      return loader.canLoad(url);
    });
  }

  load(url: string): Promise<string> {
    let chosenLoader = this.loaders.find((loader) => {
      return loader.canLoad(url);
    });
    return chosenLoader.load(url);
  }

};
