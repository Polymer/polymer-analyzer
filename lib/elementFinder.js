(function(context){
"use strict";
var estraverse = require('estraverse');
var findAlias = require('./findAlias');

var elementFinder = function elementFinder(){
  /**
   * The list of elements exported by each traversed script.
   */
  var elements = [];

  /**
   * The element being built during a traversal;
   */
  var element;

  /**
   * a set of special case properties. these should only be called
   * when we know we're inside an element definition.
   * @type {Object}
   */
  var propertyHandlers = {
    is: function(node) {

    }
  }


  var visitors = {
    enterCallExpression: function enterCallExpression(node, parent) {
      var callee = node.callee;
      if (callee.type == "Identifier") {
        if (callee.name == "Polymer") {
          element = {};
        }
      }
    },
    leaveCallExpression: function leaveCallExpression(node, parent) {
      var callee = node.callee;
      if (callee.type == "Identifier") {
        if (callee.name == "Polymer") {
          if (element) {
            elements.push(element);
            element = undefined;
          }
        }
      }
    },
    enterObjectExpression: function enterObjectExpression(node, parent) {
      if (element && !element.properties) {
        debugger;
        element.properties = [];
        for (var i = 0; i < node.properties.length; i++) {
          var name;
          if (prop.key.type == "Identifier") {
            name = prop.key.name;
          } else if (prop.key.type == "Literal") {
            name = prop.key.value;
          } else {
            throw {
              message: "Cant determine name for property key.",
              location: node.loc.start
            };
          }

          if (prop.value.type == "FunctionExpression") {
            property.type = "function";
          }
          if (prop.leadingComments && prop.leadingComments.length > 0) {
            property.desc = prop.leadingComments[prop.leadingComments.length - 1];
          }
          element.properties.push(property);
        }
        return estraverse.VisitorOption.Skip;
      }
    }
  };
  return {visitors: visitors, elements: elements};
};

context.exports = elementFinder;
}(module));