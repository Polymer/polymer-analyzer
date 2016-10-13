import {assert} from 'chai';

import {Visitor} from '../../javascript/estree-visitor';
import {JavaScriptParser} from '../../javascript/javascript-parser';
import {ScannedPolymerElement} from '../../polymer/polymer-element';
import {PolymerElementScanner} from '../../polymer/polymer-element-scanner';

suite('PolymerElementScanner', () => {

  suite('scan()', () => {
    let scanner: PolymerElementScanner;

    setup(() => {
      scanner = new PolymerElementScanner();
    });

    test('finds polymer elements', async() => {
      const contents = `Polymer({
        is: 'x-foo',
        properties: {
          a: {
            type: Boolean,
            value: 5
          },
          b: {
            type: String,
            value: function() {
              return 'test';
            }
          },
          c: {
            type: Number,
            readOnly: true
          },
          d: {
            type: Number,
            computed: '_computeD()'
          },
          e: {
            type: String,
            notify: true
          },
          f: {
            type: Object,
            observer: '_observeF'
          },
          g: {
            type: {},
            computed: '_computeG()',
            readOnly: false
          },
          all: {
            type: Object,
            notify: true,
            readOnly: false,
            reflectToAttribute: false,
            observer: '_observeAll'
          }
        },
        observers: [
          '_anObserver()',
          '_anotherObserver()'
        ]
      });
      Polymer({ is: 'x-bar' });`;

      const document = new JavaScriptParser({
                         sourceType: 'script'
                       }).parse(contents, 'test-document.html');
      let visit = async(visitor: Visitor) => document.visit([visitor]);

      const features = await scanner.scan(document, visit);

      assert.equal(features.length, 2);
      assert.instanceOf(features[0], ScannedPolymerElement);
      assert.instanceOf(features[1], ScannedPolymerElement);
      assert.deepEqual(features.map(f => f.tagName), ['x-foo', 'x-bar']);
      assert.deepEqual(
          features[0].observers.map(o => o.expression),
          ['_anObserver()', '_anotherObserver()']);
      assert.deepEqual(
          features[0].events.map(e => e.name), ['e-changed', 'all-changed']);

      assert.equal(features[0].properties.length, 8);

      assert.deepEqual(
          features[0]
              .properties.filter(p => p.warnings.length > 0)
              .map(p => [p.name, p.warnings.map(w => w.message)]),
          [[
            'g',
            [
              'Invalid type in property object.',
              'Unable to determine type for property.'
            ]
          ]]);

      assert.deepEqual(features[0].properties.map(p => [p.name, p.type]), [
        ['a', 'boolean'], ['b', 'string'], ['c', 'number'], ['d', 'number'],
        ['e', 'string'], ['f', 'Object'], ['g', undefined], ['all', 'Object']
      ]);

      assert.deepEqual(
          features[0].properties.filter(p => p.readOnly).map(p => p.name),
          ['c', 'd', 'g']);

      assert.deepEqual(
          features[0]
              .properties.filter(p => p.default)
              .map(p => [p.name, p.default]),
          [['a', '5'], ['b', '"test"']]);

      assert.deepEqual(
          features[0].properties.filter(p => p.notify).map(p => p.name),
          ['e', 'all']);
    });
  });

});
