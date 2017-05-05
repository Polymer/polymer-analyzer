`polymer-analyzer` is a static code analyzer for the web. It reads code and understands features like imports, classes, mixins, and custom element declarations.

Use cases:
 * documentation generation
 * linting
 * text editor and IDE plugins
 * transforming code for bundling and sharding
 * transforming code to update to new APIs

## Goals

 * Extensible: feature recognition is broken out into independent scanners. Teaching the analyzer to recognize new features is as easy as adding a new scanner.

 * Fast: the analyzer walks each document as few times as possible. We use dependency-aware caching to do the minimum amount of work when a file changes.

 * Standards-based: the analyzer ships with a set of scanners that are able to parse and analyze standards-based web sites.

 * Loading agnostic: the user specifies both how to load files, and how URLs map into paths for the loader. This enables use cases like loading files over a network, as well as cases where the filesystem does not map 1:1 onto the url space as the source code sees it.

## Design

### Phases

From a high level, the analyzer's work is broken up into phases.

    Loading ➡ Parsing ➡ Scanning ➡ Resolving

*Loading* takes a URL and returns a string representing the file's contents.

*Parsing* takes that string and returns an abstract syntax tree that represents the raw syntax of the code.

*Scanning* takes that AST and returns higher-level, more semantically meaningful, file-local features. While scanning, we may encounter inline documents and imports, which will cause them to be loaded, parsed, and scanned as well. A document isn't finished being scanned until all of its dependencies are also scanned.

*Resolving* takes a scanned feature and all resolved features found up until that point and returns a resolved feature. Resolving can use information defined earlier in the file, or in files imported earlier in the file. It's the only point in the analysis process that can use cross-file information.


### Example

Let's walk through those steps using this file as an example:

```html
  <!-- progress-bar.html -->
  <link rel="import" href="../polymer/polymer.html">

  <script>
    class ProgressBar extends Polymer.Element {
      doSomethingCool() {
        /** ... */
      }
    }
  </script>
```

Loading is just the process of turning `'progress-bar.html'` into the source code above as a string.

Parsing will convert that into an HTML document with two elements and some whitespace text nodes.

The scanning process will convert that into a ScannedImport and a ScannedInlineDocument. The analyzer will kick off loading, parsing, and scanning of `polymer.html` as well as parsing and scanning the inline javascript document.

The inline JS is parsed into an AST containing a class declaration statement. The scanners will extract a ScannedClass. This ScannedClass will have a reference to the super class `Polymer.Element`, but the reference will just note the name `Polymer.Element`, it won't have any more info than that because scanning is file-local. The ScannedClass will also note that `ProgressBar` has a method called `doSomethingCool` that takes no parameters.

At resolution time the ScannedClass is able to follow the reference, assuming that `polymer.html` defines a class named `Polymer.Element`. `ScannedClass.resolve()` models javascript inheritance, starting with the methods and properties of `Polymer.Element` and then overriding and augmenting them with those on `ProgressBar` before returning a resolved `Class` feature.

### Caching

The key to the analyzer's performance in interactive scenarios like text editing is extensive automatic caching.

Taking the example above, what needs to be recalculated when `polymer.html` has changed? Well, because `progress-bar.html` depends on it, we'll need to do some work beyond just `polymer.html`. Maybe, the `Polymer.Element` class got a new method which we'll want to add to our representation of the `ProgressBar` class. But crucially, we don't need to load, parse, or scan `progress-bar.html` because all of those steps are entirely file-local. We just need to re-resolve it. So `polymer.html` will need to be reloaded, parsed, scanned, and resolved, but `progress-bar.html` just needs to be re-resolved.

What needs to be recalculated when `progress-bar.html` has changed? Even less! We don't need to do anything about `polymer.html`†. We only need to process `progress-bar.html`.

Doing dependency-aware caching is a big deal for larger projects because after the initial analysis, we only need to load, parse, and scan just those files that changed, and we only need to re-resolve files that depend on the changed files. A large project that takes 5 seconds to analyze initially can be re-analyzed in only 30ms, **150 times faster** than without caching. See `npm run benchmark` for details.

For details on the implementation, see [../src/core/async-work-cache.ts](../src/core/async-work-cache.ts), [../src/core/dependency-graph.ts](../src/core/dependency-graph.ts), and [../src/core/analysis-cache.ts](../src/core/analysis-cache.ts).

> † assuming `polymer.html` doesn't have a cyclic dependency on `progress-bar.html`, which is legal for some kinds of imports, like ES6 and HTML.
