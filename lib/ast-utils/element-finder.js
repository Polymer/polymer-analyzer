/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// jshint node: true
'use strict';
var estraverse = require('estraverse');

var esutil    = require('./esutil');
var findAlias = require('./find-alias');
var analyzeProperties = require('./analyze-properties');
var astValue = require('./ast-value');
var declarationPropertyHandlers = require('./declaration-property-handlers');

var elementFinder = function elementFinder() {
  /**
   * The list of elements exported by each traversed script.
   */
  var elements = [];

  /**
   * The element being built during a traversal;
   */
  var element = null;
  var propertyHandlers = null;

  var visitors = {
    /**
     * An ES6 class is parsed differently
     */
    isClassDetected: false,
    /*
     *  Set up the element when we enter the class
     */
    enterClassBody: function enterClassBody(node, parent) {
      this.isClassDetected = true;
      element = {
        type: 'element',
        desc: esutil.getAttachedComment(parent),
        events: esutil.getEventComments(parent).map( function(event) {
          return {desc: event};
        }),
        properties: [],
        behaviors: [],
        observers: []
      };
      propertyHandlers = declarationPropertyHandlers(element);
    },
    leaveClassBody: function enterClassBody(node, parent) {
      if (element) {
        elements.push(element);
        element = null;
        propertyHandlers = null;
      }
    },
    enterAssignmentExpression: function enterAssignmentExpression(node, parent) {
      // Only care about this.keyword
      if (node.left.object.type != 'ThisExpression') {
        return;
      }

      var name = node.left.property.name;
      if (name in propertyHandlers) {
        propertyHandlers[name](node.right);
      }
    },
    enterMethodDefinition: function enterMethodDefinition(node, parent) {
      element.properties.push(esutil.toPropertyDescriptor(node));
    },
    enterCallExpression: function enterCallExpression(node, parent) {
      // When dealing with a class, enterCallExpression is called
      // after the parsing actually starts
      if (this.isClassDetected) {
        return estraverse.VisitorOption.Skip;
      }

      var callee = node.callee;
      if (callee.type == 'Identifier') {

        if (callee.name == 'Polymer') {
          element = {
            type: 'element',
            desc: esutil.getAttachedComment(parent),
            events: esutil.getEventComments(parent).map( function(event) {
              return {desc: event};
            })
          };
          propertyHandlers = declarationPropertyHandlers(element);
        }
      }
    },
    leaveCallExpression: function leaveCallExpression(node, parent) {
      var callee = node.callee;
      if (callee.type == 'Identifier') {
        if (callee.name == 'Polymer') {
          if (element) {
            elements.push(element);
            element = null;
            propertyHandlers = null;
          }
        }
      }
    },
    enterObjectExpression: function enterObjectExpression(node, parent) {
      // When dealing with a class, there is no single object that we can parse
      // to retrieve all properties
      if (this.isClassDetected) {
        return estraverse.VisitorOption.Skip;
      }

      if (element && !element.properties) {
        element.properties = [];
        element.behaviors = [];
        element.observers = [];
        var getters = {};
        var setters = {};
        var definedProperties = {};
        for (var i = 0; i < node.properties.length; i++) {
          var prop = node.properties[i];
          var name = esutil.objectKeyToString(prop.key);
          if (!name) {
            throw {
              message: 'Cant determine name for property key.',
              location: node.loc.start
            };
          }

          if (name in propertyHandlers) {
            propertyHandlers[name](prop.value);
            continue;
          }
          var descriptor = esutil.toPropertyDescriptor(prop);
          if (descriptor.getter) {
            getters[descriptor.name] = descriptor;
          } else if (descriptor.setter) {
            setters[descriptor.name] = descriptor;
          } else {
            element.properties.push(esutil.toPropertyDescriptor(prop));
          }
        }
        Object.keys(getters).forEach(function(getter) {
          var get = getters[getter];
          definedProperties[get.name] = get;
        });
        Object.keys(setters).forEach(function(setter) {
          var set = setters[setter];
          if (!(set.name in definedProperties)) {
            definedProperties[set.name] = set;
          } else {
            definedProperties[set.name].setter = true;
          }
        });
        Object.keys(definedProperties).forEach(function(p){
          var prop = definedProperties[p];
          element.properties.push(p);
        });
        return estraverse.VisitorOption.Skip;
      }
    }
  };
  return {visitors: visitors, elements: elements};
};

module.exports = elementFinder;
