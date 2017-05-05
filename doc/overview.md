polymer-analyzer is a static code analyzer for the web. It reads code and understands features like imports, classes, mixins, and custom element declarations.

Use cases:
 * documentation generation
 * linting
 * text editor and IDE plugins
 * transforming code for bundling and sharding
 * transforming code to update to new APIs

## Goals

 * Extensible: feature recognition is broken out into independent scanners. Teaching the analyzer to recognize new features is as easy as adding a new scanner.

 * Fast: the analyzer walks each document as few times as possible. We use dependency-aware caching to do the minimum amount of work to re-analyze when a file changes.

 * Standards-based: the analyzer ships with a set of scanners that are able to parse and analyzer standards-based web sites.

 * Loading agnostic: the user specifies both how to load files, and how URLs map into paths for the loader. This enables use cases like loading files over a network and where the filesystem does not map 1:1 onto the url space.

## Design

### Phases

From a high level, the analyzer's work is broken up into phases.

  Loading -> Parsing -> Scanning -> Resolving

Loading is the process of turning a URL into the file's contents as a string.

Parsing is turning that string into an abstract syntax tree that represents the raw syntax of the code.

Scanning turns that AST into higher-level, more semantically meaningful features, but without referencing any information that wasn't found in that specific file.

> Note: While scanning, we may encounter inline documents and imports, which will cause them to be loaded, parsed, and scanned as well. A document isn't finished scanned until all of its dependencies are also scanned.

Resolving uses information across all reachable files to understand potentially cross-file information.

### Example

Let's walk through those steps using this file as an example:

`resettable-progress-bar.html`
```html
  <link rel="import" href="./base.html">

  <script>
    class ResettableProgressBar extends Base {
      reset() {
        this.value = 0;
      }
    }
  </script>
```

Loading is just the process of turning `'resettable-progress-bar.html'` into the source code above as a string.

Parsing will convert that into an HTML document with two elements and some whitespace text nodes.

The scanning process will convert that into a ScannedImport and a ScannedInlineDocument. The analyzer will kick off loading, parsing, and scanning of `base.html` as well as parsing and scanning the inline javascript document.

The inline JS is parsed into an AST containing a class declaration statement. The scanners will extract a ScannedClass. This ScannedClass will have a reference to the super class `Base`, but the reference will just note the name `Base`, it won't have any more info than that because scanning is file-local. The ScannedClass will also note that `ResettableProgressBar` has a method called `reset` that takes no parameters.

At resolution time the ScannedClass is able to follow the reference, assuming that `base.html` defines a class named `Base`. `ScannedClass.resolve()` models javascript inheritance, starting with the methods and properties of `Base` and then overriding and augmenting them with those on `ResettableProgressBar`.

### Caching

The key to the analyzer's performance, and the only way that it can work fast enough to be useful in an interactive editor is through extensive automatic caching.

Taking the example above, what needs to be recalculated when `base.html` has changed? Well, because `resettable-progress-bar.html` depends on it, we'll need to do some work beyond just `base.html`. Maybe, e.g. the `Base` class got a new method. But crucially, we don't need to load, parse, or scan `resettable-progress-bar.html` because all of those steps are entirely file-local. We just need to re-resolve it. So `base.html` will need to be reloaded, parsed, scanned, and resolved, but `resettable-progress-bar.html` just needs to be re-resolved.

What needs to be recalculated when `resettable-progress-bar.html` has changed? Even less! We don't need to do anything about `base.html`<sup>†</sup> . We only need to process `resettable-progress-bar.html`.

This is a big deal for larger projects because after the initial analysis, we only need to load, parse, and scan just those files that changed, and we only need to re-resolve files that depend on the changed files.

> † assuming `base.html` doesn't have a cyclic dependency on `resettable-progress-bar.html`, which is legal for some kinds of imports, like ES6 and HTML.
