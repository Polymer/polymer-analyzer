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
          <x-foo></x-foo>
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

      const feature0 = <ScannedElementReference>features[0];
      assert.equal(feature0.tagName, 'x-foo');

      const feature1 = <ScannedElementReference>features[1];
      assert.equal(feature1.tagName, 'x-bar');
    });

  });

});
