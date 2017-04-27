# Polymer Analyzer - Comment Directives & Comment Annotations
> Author @FredKSchott
> Status: Draft
> Last Update: 2017-04-26

## Objective
- To analyze standalone comments (directives) for instructions.
- To analyze "attached" comments (annotations) for information/metadata about an existing feature.


## Goals
- To scan & analyze polymer-lint directives so that the linter can properly report & ignore warnings in a document.
- Create an extensible system for analyzing and surfacing standalone comments in a document.
- Create an extensible system for analyzing and surfacing "attached" comments in a document that describe/signal features that may already have scanners.
- Documentation (README, docs/ entry, docs site entry, etc) that communicates this new system.


## Non-Goals
- Implementing any "attached" comment annotation scanning. It was important to outline so that the scope of comment directives could be explained, but implementation will be left as future work.

## Background

Currently, our analyzer scans for explicit documentation to detect features & feature characteristics that would otherwise be missed. For example, the `@customElement` tag is used to signify that the following class definition is a custom element.

However, scanning for each of these annotations is hard-coded into the responsibility of each feature's scanner. That means that there is currently no way to add support for new annotations without replacing the entire scanner for that feature.

There is a second class of documentation that our analyzer currently doesn’t support. Our linter needs to be able to understand documentation that doesn’t describe already existing features. For example, the user may want to send an instruction to some analyzer-powered tool in its build chain:

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

Instead of building one-off support for this into the analyzer, we’d like to also think about how the analyzer should analyze all comment-based information so that future features don’t need to reinvent the wheel when it comes to how comments should be scanned.


## Design Overview

This design groups all analysis-related comments into two supported formats: **Comment Directives** & **Comment Annotations**. **Comment Directives** are standalone features represented by standalone code comments. **Comment Annotations** are additional information/metadata that always describe the existing feature they are "attached" to.

Each supports a different use-case for analysis-related documentation. Together they cover most use cases for passing instructions and metadata to the analyzer in a way that is easy for the user to extend with 3rd party support.


### Comment Directive

```
/* polymer-lint disable */
/* polymer-lint disable: undefined-elements, rule-2 */
/* polymer-lint enable: undefined-elements */
/* lazy-import: '../some-url/some-file.html' */
<!-- polymer-build:register-service-worker-here -->
```

- A comment directive represents a single new **Directive** feature type within a document
- A comment directive may include "arguments", which will be parsed by the scanner
- A comment directive must exist within its own comment so that the analyzer can properly create a feature that matches that comment node's location
- Because of the wide range of possible features these could support, specific comment syntax is lax. However they should follow these guidelines:
  - it is unique enough to never collide with other directive formats
  - it is formal enough to be matched by substring or RegEx matching
  - if it takes arguments they should be parsed in the scanning phase
- Each comment directive will have a scanner responsible for scanning for it.
  - A scanner may be responsible for scanning multiple directives (ex: `polymer-lint enable`, `polymer-lint disable`)
Here is a definition for the **Directive** class:

```
class Directive extends Feature {
  identifier: string;
  args?: string[];
}
```

And here are how those example comment directive's above would be parsed:

```
/* polymer-lint disable */
Directive({identifier: 'polymer-lint disable', args: null})
/* polymer-lint disable: undefined-elements, rule-2 */
Directive({identifier: 'polymer-lint disable', args: ['undefined-elements', 'rule-2']})
/* polymer-lint enable: undefined-elements */
Directive({identifier: 'polymer-lint enable', args: ['undefined-elements']})
/* lazy-import: '../some-url/some-file.html' */
Directive({identifier: 'lazy-import', args: ['../some-url/some-file.html']})
<!-- polymer-build:register-service-worker-here -->
Directive({identifier: 'polymer-build:register-service-worker-here', args: null})
```


### Comment Annotation

```js
/**
 * @polymer
 * @mixinFunction
 */
const TestMixin = function(superclass) {
```
```html
<!-- @demo demo/index.html -->
<dom-module id="some-element">
```

- A comment annotation describes a separate feature in a document. It is not the feature itself.
- A comment annotation is always included in the comment "attached" to a feature.
   - Each scanner will decide which comment is considered "attached" if one exists.
- All features will now have a general `annotations` property containing all scanned annotations in the attached comment.
- This will allow 3rd party tooling to add handling for annotations when scanners already exist
- Format
  - Multiple comment annotations are allowed within a feature's "attached" comment block
  - Each requires a new line
  - Each is of the format `@IDENTIFIER [TEXT...]`, where `IDENTIFIER` is the unique annotation ID
  - Each may have text afterwards, which is considered the annotation "description"
- An annotation will be consumed directly from the `annotations` Set on a feature
- *Future Work:* If a separate phase existed after scanning, pluggable resolvers could be added to resolve features based on scanned annotations.


Here is a definition for the **Annotation** type interface stored in the `Feature.annotations` Set:

```
interface Annotation {
  identifier: string;
  desc?: string;
}
```

## Implementation Example: Polymer Lint

Here is an overview of how the Linter would work using the two comment-types described above.

For the purpose of this example, we’ll denote a Lint Directive as `LintDirective(command: 'enable'|'disable', rules?: string[])` where rules is a list of rules *or rule sets*. If `rules` is` undefined, all lint rules will be enabled/disabled.

### Scanning / Analysis

1. A new pluggable scanner would be added to the analyzer for each language we care to scan for Polymer Lint directives.
1. That scanner knows to look for two different comment directive IDs:
  - "disable" `LintDirective`: “polymer-lint disable:”
  - "enable" `LintDirective`: “polymer-lint enable:”
1. That scanner also knows how to parse the arguments for each directive as a comma-separated list of rules.
1. For each "disable" `LintDirective` found, create a new **`LintDirective('disable', rules)`** with the parsed rules (or undefined if none existed).
1. For each "enable" `LintDirective` found, create a new **`LintDirective('enable', rules)`** with the parsed rules (or undefined if none existed).
1. Return all found `LintDirectives` as scanned features of kind 'directive'.

### Linting

1. The linter gets all `LintDirectives` for a document before linting a given set of rules
1. It could either:
  1. Look at all `LintDirectives` and create source ranges for each enabled/disabled override before linting a document.
  1. Lint for all configured rules + any included in "enable" `LintDirectives` for a document. For each warning, check the `LintDirectives` before it for whether it should be reported or not.

> This design document focuses on the analysis side of directive analysis, so I'll stop myself from commenting on which of these possible linting solutions is best and leave that up to future work.
