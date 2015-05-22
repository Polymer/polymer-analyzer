/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
/**
* Finds and annotates the Polymer() and modulate() calls in javascript.
*/
// jshint node: true
'use strict';
var espree = require('espree');
var estraverse = require('estraverse');

var behaviorFinder = require('./behavior-finder');
var elementFinder  = require('./element-finder');
var featureFinder  = require('./feature-finder');

function traverse(visitorRegistries) {
  var visitor;
  function applyVisitors(name, node, parent) {
    var returnVal;
    for (var i = 0; i < visitorRegistries.length; i++) {
      if (name in visitorRegistries[i]) {
        returnVal = visitorRegistries[i][name](node, parent);
        if (returnVal) {
          return returnVal;
        }
      }
    }
  }
  return {
    enter: function(node, parent) {
      visitor = 'enter' + node.type;
      return applyVisitors(visitor, node, parent);
    },
    leave: function(node, parent) {
      visitor = 'leave' + node.type;
      return applyVisitors(visitor, node, parent);
    }
  };
}

var jsParse = function jsParse(jsString) {
  var script = espree.parse(jsString,
    {
      attachComment: true,
      comment: true,
      loc: true,
      ecmaFeatures: {
        // enable parsing of arrow functions
        arrowFunctions: true,

        // enable parsing of let/const
        blockBindings: true,

        // enable parsing of destructured arrays and objects
        destructuring: true,

        // enable parsing of regular expression y flag
        regexYFlag: true,

        // enable parsing of regular expression u flag
        regexUFlag: true,

        // enable parsing of template strings
        templateStrings: true,

        // enable parsing of binary literals
        binaryLiterals: true,

        // enable parsing of ES6 octal literals
        octalLiterals: true,

        // enable parsing unicode code point escape sequences
        unicodeCodePointEscapes: true,

        // enable parsing of default parameters
        defaultParams: true,

        // enable parsing of rest parameters
        restParams: true,

        // enable parsing of for-of statement
        forOf: true,

        // enable parsing computed object literal properties
        objectLiteralComputedProperties: true,

        // enable parsing of shorthand object literal methods
        objectLiteralShorthandMethods: true,

        // enable parsing of shorthand object literal properties
        objectLiteralShorthandProperties: true,

        // Allow duplicate object literal properties (except '__proto__')
        objectLiteralDuplicateProperties: true,

        // enable parsing of generators/yield
        generators: true,

        // enable parsing spread operator
        spread: true,

        // enable parsing classes
        classes: true,

        // enable parsing of modules
        modules: true,

        // enable return in global scope
        globalReturn: true
    }
  });

  var featureInfo = featureFinder();
  var behaviorInfo = behaviorFinder();
  var elementInfo = elementFinder();

  var visitors = [featureInfo, behaviorInfo, elementInfo].map(function(info) {
    return info.visitors;
  });
  estraverse.traverse(script, traverse(visitors));

  return {
    behaviors: behaviorInfo.behaviors,
    elements:  elementInfo.elements,
    features:  featureInfo.features,
  };
};

module.exports = jsParse;
