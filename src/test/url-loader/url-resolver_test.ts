/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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

import {assert} from 'chai';
import * as fs from 'mz/fs';
import * as os from 'os';
import * as path from 'path';

import {FileRelativeUrl, ResolvedUrl} from '../../index';
import {UrlResolver} from '../../url-loader/url-resolver';
import {fileRelativeUrl, resolvedUrl} from '../test-utils';

class SimplestUrlResolver extends UrlResolver {
  resolve(url: string) {
    return this.brandAsResolved(url);
  }

  relative(fromOrTo: ResolvedUrl, maybeTo?: ResolvedUrl, _kind?: string):
      FileRelativeUrl {
    let from, to;
    if (maybeTo !== undefined) {
      from = fromOrTo;
      to = maybeTo;
    } else {
      throw new Error(
          'simplest url resolver.relative must be called with two arguments');
    }
    return this.simpleUrlRelative(from, to);
  }
}

suite('UrlResolver', () => {
  suite('relative', () => {
    const resolver = new SimplestUrlResolver();
    function relative(from: string, to: string) {
      const fromResolved = resolver.resolve(from as FileRelativeUrl);
      const toResolved = resolver.resolve(to as FileRelativeUrl);
      return resolver.relative(fromResolved, toResolved);
    }

    test('can get relative urls between urls', () => {
      assert.equal(relative('foo/', 'bar/'), '../bar/');
      assert.equal(relative('foo.html', 'bar.html'), 'bar.html');
      assert.equal(relative('sub/foo.html', 'bar.html'), '../bar.html');
      assert.equal(
          relative('sub1/foo.html', 'sub2/bar.html'), '../sub2/bar.html');
      assert.equal(relative('foo.html', 'sub/bar.html'), 'sub/bar.html');
      assert.equal(relative('./foo.html', './sub/bar.html'), 'sub/bar.html');
      assert.equal(relative('./foo.html', './bar.html'), 'bar.html');
      assert.equal(relative('./foo/', 'sub/bar.html'), '../sub/bar.html');
      assert.equal(relative('./foo/bonk.html', 'sub/bar/'), '../sub/bar/');
    });

    test.skip('will keep absolute urls absolute', () => {
      assert.equal(
          relative('foo/', 'http://example.com'), 'http://example.com/');
      assert.equal(
          relative('foo/', 'https://example.com'), 'https://example.com/');
      assert.equal(
          relative('foo/', 'file://host/path/to/file'),
          'file://host/path/to/file');
    });

    test('sibling urls work properly', () => {
      assert.equal(relative('foo.html', '../bar/bar.html'), '../bar/bar.html');
      assert.equal(
          relative('foo/foo.html', '../bar/bar.html'), '../../bar/bar.html');
      assert.equal(
          relative('../foo/foo.html', '../bar/bar.html'), '../bar/bar.html');
    });
  });

  suite('createForDirectory', () => {
    async function tempdir() {
      return fs.mkdtempSync(path.join(os.tmpdir(), 'cfd'));
    }
    test('resolves sibling urls to bower_components by default', async () => {
      const dir = await tempdir();
      const resolver = await UrlResolver.createForDirectory(dir);
      assert.equal(
          resolver.resolve(fileRelativeUrl`../foo/bar`),
          resolvedUrl`bower_components/foo/bar`);
    });

    let testName =
        'resolves sibling urls to the directory specified in .bowerrc if present';
    test(testName, async () => {
      const dir = await tempdir();
      await fs.writeFile(path.join(dir, '.bowerrc'), `
        {
          "directory": "app/components/",
          "timeout": 120000,
          "registry": {
            "search": [
              "http://localhost:8000",
              "https://registry.bower.io"
            ]
          }
        }
      `);
      const resolver = await UrlResolver.createForDirectory(dir);
      assert.equal(
          resolver.resolve(fileRelativeUrl`../foo/bar`),
          resolvedUrl`app/components/foo/bar`);
    });

    testName =
        `resolves sibling urls to bower_components if there is a bower.json ` +
        `and a package.json`;
    test(testName, async () => {
      const dir = await tempdir();
      await Promise.all([
        fs.writeFile(path.join(dir, 'bower.json'), `{}`),
        fs.writeFile(path.join(dir, 'package.json'), `{}`)
      ]);
      const resolver = await UrlResolver.createForDirectory(dir);
      assert.equal(
          resolver.resolve(fileRelativeUrl`../foo/bar`),
          resolvedUrl`bower_components/foo/bar`);
    });

    testName =
        `resolves sibling urls to node_modules if there is package.json but ` +
        `no bower.json`;
    test(testName, async () => {
      const dir = await tempdir();
      await fs.writeFile(path.join(dir, 'package.json'), `{}`);
      const resolver = await UrlResolver.createForDirectory(dir);
      assert.equal(
          resolver.resolve(fileRelativeUrl`../foo/bar`),
          resolvedUrl`node_modules/foo/bar`);
    });
  });
});
