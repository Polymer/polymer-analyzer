import {assert} from 'chai';
import {HtmlVisitor} from '../../html/html-document';
import {HtmlParser} from '../../html/html-parser';
import {HtmlElementReferenceScanner} from '../../html/html-element-reference-scanner';
import {ScannedElementReference} from '../../model/element-reference';
import {WarningPrinter} from '../../warning/warning-printer';
import {Analyzer} from '../../analyzer';
import {SourceRange} from '../../model/model';

suite('HtmlElementReferenceScanner', () => {

  suite('scan()', () => {
    let scanner: HtmlElementReferenceScanner;
    let contents = '';
    const loader = {
      canLoad: () => true,
      load: () => Promise.resolve(contents)
    };
    const warningPrinter = new WarningPrinter(
      null as any, {analyzer: new Analyzer({urlLoader: loader})});

    async function getUnderlinedText(sourceRange: SourceRange|undefined) {
      if (!sourceRange) {
        return 'No source range produced';
      }
      return '\n' + await warningPrinter.getUnderlinedText(sourceRange);
    }

    setup(() => {
      scanner = new HtmlElementReferenceScanner();
    });

    test('finds custom element references', async() => {
      contents = `<html><body>
          <div>Foo</div>
          <x-foo a=5 b="test" c></x-foo>
          <div>
            <x-bar></x-bar>
          </div>
          <h1>Bar</h1>
        </body></html>`;

      const document = new HtmlParser().parse(contents, 'test-document.html');
      let visit = async(visitor: HtmlVisitor) => document.visit([visitor]);

      const features = await scanner.scan(document, visit);

      assert.equal(features.length, 2);

      assert.instanceOf(features[0], ScannedElementReference);
      assert.instanceOf(features[1], ScannedElementReference);

      assert.deepEqual(features.map(f => f.tagName), ['x-foo', 'x-bar']);

      assert.deepEqual(features[0].attributes.map(a => [a.name, a.value]), [
        ['a', '5'],
        ['b', 'test'],
        ['c', '']
      ]);

      const sourceRanges = await Promise.all(features.map(async f => await getUnderlinedText(f.sourceRange)));

      assert.deepEqual(sourceRanges, [
        `
          <x-foo a=5 b="test" c></x-foo>
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
        `
            <x-bar></x-bar>
            ~~~~~~~~~~~~~~~`
      ]);

      const attrRanges = await Promise.all(features.map(
        async f => await Promise.all(f.attributes.map(
          async a => await getUnderlinedText(a.sourceRange)))));

      assert.deepEqual(attrRanges, [
        [
          `
          <x-foo a=5 b="test" c></x-foo>
                 ~~~`,
          `
          <x-foo a=5 b="test" c></x-foo>
                     ~~~~~~~~`,
          `
          <x-foo a=5 b="test" c></x-foo>
                              ~`
        ],
        []
      ]);

      const attrNameRanges = await Promise.all(features.map(
        async f => await Promise.all(f.attributes.map(
          async a => await getUnderlinedText(a.nameSourceRange)))));

      assert.deepEqual(attrNameRanges, [
        [
          `
          <x-foo a=5 b="test" c></x-foo>
                 ~`,
          `
          <x-foo a=5 b="test" c></x-foo>
                     ~`,
          `
          <x-foo a=5 b="test" c></x-foo>
                              ~`
        ],
        []
      ]);

      const attrValueRanges = await Promise.all(features.map(
        async f => await Promise.all(f.attributes.map(
          async a => await getUnderlinedText(a.valueSourceRange)))));

      assert.deepEqual(attrValueRanges, [
        [
          `
          <x-foo a=5 b="test" c></x-foo>
                   ~`,
          `
          <x-foo a=5 b="test" c></x-foo>
                       ~~~~~~`,
          `
          <x-foo a=5 b="test" c></x-foo>
                              ~`
        ],
        []
      ]);
    });

  });

});
