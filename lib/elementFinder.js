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
        element.properties = [];
        for (var i = 0; i < node.properties.length; i++) {
          var property = {};
          var prop = node.properties[i];
          if (prop.key.type == "Identifier") {
            property.name = prop.key.name;
          } else if (prop.key.type == "Literal") {
            property.name = prop.key.value;
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