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

import {assert} from 'chai';

import {PackageUrlResolver} from '../../url-loader/package-url-resolver';
import {fileRelativeUrl, resolvedUrl} from '../test-utils';

const root = resolvedUrl`file:///1/2/`;


suite('PackageUrlResolver.resolve', function() {
  let r: PackageUrlResolver;
  setup(() => {
    r = new PackageUrlResolver({packageDir: `/1/2`});
  });
  test(`resolves file:// urls to themselves`, () => {
    const r = new PackageUrlResolver();
    assert.equal(
        r.resolve(
            fileRelativeUrl`file:///foo/bar/baz`,
            resolvedUrl`https://example.com/bar`),
        resolvedUrl`file:///foo/bar/baz`);
  });

  // test for url with host but not protocol
  test('resolves an in-package URL', () => {
    assert.equal(
        r.resolve(fileRelativeUrl`foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`/foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`./foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
  });

  test(`resolves sibling URLs to the component dir`, () => {
    assert.equal(
        r.resolve(fileRelativeUrl`../foo/foo.html`, root),
        resolvedUrl`file:///1/2/bower_components/foo/foo.html`);

    const configured = new PackageUrlResolver(
        {componentDir: 'components', packageDir: '/1/2/'});
    assert.equal(
        configured.resolve(fileRelativeUrl`file:///1/bar/bar.html`, root),
        resolvedUrl`file:///1/2/components/bar/bar.html`);
  });

  test('resolves cousin URLs as normal', () => {
    assert.equal(
        r.resolve(fileRelativeUrl`../../foo/foo.html`, root),
        resolvedUrl`file:///foo/foo.html`);
  });

  test('passes URLs with unknown hostnames through untouched', () => {
    const r = new PackageUrlResolver();
    assert.equal(
        r.resolve(fileRelativeUrl`http://abc.xyz/foo.html`, root),
        resolvedUrl`http://abc.xyz/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`//abc.xyz/foo.html`, root),
        resolvedUrl`file://abc.xyz/foo.html`);
  });

  test(`resolves a URL with the right hostname`, () => {
    const r = new PackageUrlResolver(
        {componentDir: `components`, hostname: `abc.xyz`, packageDir: `/1/2`});
    assert.equal(
        r.resolve(fileRelativeUrl`http://abc.xyz/foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`http://abc.xyz/./foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`http://abc.xyz/../foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`http://abc.xyz/foo/../foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);

    assert.equal(
        r.resolve(fileRelativeUrl`foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`./foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`foo/../foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);

    assert.equal(
        r.resolve(fileRelativeUrl`/foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`/./foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`/../foo/foo.html`, root),
        resolvedUrl`file:///1/2/foo/foo.html`);
    assert.equal(
        r.resolve(fileRelativeUrl`/foo/../foo.html`, root),
        resolvedUrl`file:///1/2/foo.html`);
  });

  test(`resolves a URL with spaces`, () => {
    assert.equal(
        r.resolve(fileRelativeUrl`spaced name.html`, root),
        resolvedUrl`file:///1/2/spaced%20name.html`);
  });

  test('resolves an undecodable URL to undefined', () => {
    assert.equal(r.resolve(fileRelativeUrl`%><><%=`, root), undefined);
  });
});
