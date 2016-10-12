import {assert} from 'chai';
import {HtmlVisitor} from '../../html/html-document';
import {HtmlParser} from '../../html/html-parser';
import {HtmlElementReferenceScanner} from '../../html/html-element-reference-scanner';
import {ScannedElementReference} from '../../model/element-reference';

suite('HtmlElementReferenceScanner', () => {

  suite('scan()', () => {
    let scanner: HtmlElementReferenceScanner;

    setup(() => {
      scanner = new HtmlElementReferenceScanner();
    });

    test('finds custom element references', async() => {
      let contents = `<html><body>
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

      assert.deepEqual(features[0].attributes[0], {
        name: 'a',
        nameSourceRange: {
          end: {
            column: 18,
            line: 2
          },
          file: 'test-document.html',
          start: {
            column: 17,
            line: 2
          }
        },
        sourceRange: {
          end: {
            column: 20,
            line: 2
          },
          file: 'test-document.html',
          start: {
            column: 17,
            line: 2
          }
        },
        value: '5',
        valueSourceRange: {
          end: {
            column: 20,
            line: 2
          },
          file: 'test-document.html',
          start: {
            column: 19,
            line: 2
          }
        }
      });
    });

  });

});
