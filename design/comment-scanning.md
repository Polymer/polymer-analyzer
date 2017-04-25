# Polymer Analyzer - Comment Directives & Comment Annotations
> Author @FredKSchott
> Status: Draft
> Last Update: 2017-04-25

## Objective
- To create a paradigm for formatting document metadata and instructions for analysis.
- Immediately driving this discussion is the need to support polymer-linter directives which can enable/disable lint rules within entire documents and/or single sections of documents.

## Goals
- Allow the analyzer to surface the information contained within polymer-lint directives so that the linter can properly report & ignore warnings.
- Create a more general definition for a directive that is easy-to-use for code authors and fits into the data model of the analyzer.
- Create a more general definition for metadata (ex: @polymerElement) that is attached to an already-existing feature.
- Documentation (README, docs/ entry, docs site entry, etc) that communicates these new definitions.

## Non-Goals
- Implement any general-purpose metadata/directive scanners. This document will focus solely on the syntax and the way we talk about scannable documentation going forward.


## Background
Currently, our analyzer is able to use documentation to detect implicit features and characteristics of features that would otherwise be missed. For example, the `@customElement` tag is used to signify that the following class definition is a custom element.

However, there is another class of documentation that our analyzer currently doesn’t support. Our linter needs to be able to understand documentation that doesn’t describe a single, already existing feature. For example, the user may want to send an instruction to some analyzer-powered tool in its build chain:

```html
<!-- @registerServiceWorkerHere -->
```

Or, a user may want to describe some behavior across an entire source range, including any number of other existing features (including zero). For example:

```js
/* polymer-lint disable: undefined-elements */
customElements.define('vanilla-element1', AnElementThatActuallyExists);
customElements.define('vanilla-element2', IPromiseThisExists);
customElements.define('vanilla-element3', SeriouslyLinterDontBeMad);
/* polymer-lint enable: undefined-elements */
```

The polymer-lint enable/disable use-case is the immediate need here. But instead of building one-off support for this into the analyzer, we’d like to also think about how the analyzer should analyze all comment-based information so that future features don’t need to reinvent the wheel when it comes to comment-based analysis.


## Design Overview

This design groups all analysis-aware documentation into two supported formats: **Comment Directives** & **Comment Annotations**. Each supports a different general use of documentation, and together they cover most use cases for sending instructions and explicit information to the analyzer.

### Comment Directive

```
/* polymer-lint disable: undefined-elements, rule-2 */
/* polymer-lint enable: undefined-elements */
/* @lazyImport '../some-url/some-file.html */
<!-- @registerServiceWorkerHere -->
```

- A comment directive represents a new **Directive** feature type within a document
- A new scanner should be written and used for each supported comment directive
- A directive can describe one of three things:
  - **Single Line Directive:** A feature that exists on a single line.
  - **Source Range Directive Start:** A feature that exists on a source range within a document, starting at the directive’s source location.
  - **Source Range Directive End:** A feature that exists on a source range within a document, ending at the directive’s source location.
- A comment directive has a unique ID and may take arguments
  - Because of the wide range of possible features & needs, specific syntax is lax
  - Parsing is left up to each scanner
- A comment directive must exist in its own comment block
- A source range directive comment can describe several Directive features based on the arguments given


### Comment Annotation

```js
/**
 * @polymer
 * @mixinFunction
 * @memberof Polymer
 */
const TestMixin = function(superclass) {
```

- A comment annotation describes another, already-existing feature in a document
- A comment annotation has a unique ID and may take arguments
- Multiple comment annotations are allowed within a single code block
  - Each requires a new line
- Because they inform already-existing features, no new scanners are required
  - The scanners for those features are responsible for their scanning
- `@demo` & `@customElement` are two comment annotations that are already supported by the analyzer


## Implementation Example: Polymer Lint

Here is an overview of how the Linter would work using the two comment-types described above.

For the purpose of this example, we’ll denote a Lint Directive as `IgnoreDirective([ruleName])` where ruleName is the name of a specific rule to disable. If no ruleName is provided, all lint rules will be disabled.

### Scanning / Analysis

1. A new pluggable scanner would be added to the analyzer for each language we care to scan for Polymer Lint directives.
1. That scanner knows to look for two different comment directive IDs:
  - Source Range Start Directive: “polymer-lint disable:”
  - Source Range End Directive: “polymer-lint enable:”
1. That scanner also knows how to parse the arguments for each as a comma-separated list of rules.
1. For each “polymer-lint disable” directive found, create a new **IgnoreDirective** feature for each rule name provided. If no rule names are provided, create a single new **IgnoreDirective** to disable all rules. For each **IgnoreDirective** created, set the source-range starting location to the comment node.
1. For each “polymer-lint enable” directive found, find the last previously created **IgnoreDirective** that shares its name and set the source-range ending location to the comment node. If no **IgnoreDirective** is found, return a warning.
1. If an **IgnoreDirective** has no ending location, set it’s ending location to the end of the document.
Return all found **IgnoreDirective** as scanned features.

### Linting

1. The linter gets all **IgnoreDirective** for a document before linting a given set of rules
1. Get all **IgnoreDirective(rule)** source ranges for a given rule.
1. For each warning returned by a rule’s `check()` method, filter out all warnings that are contained entirely within any ignore directive source ranges.
