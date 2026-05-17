# Goal

Write a JavaScript function that takes an HTMLElement within a page and then returns an XPath selector that will uniquely select that element on the page.

The generated selector should be:

Short and readable (ideally, what a human would write)
Robust to page changes (if the page is later changed, the selector will ideally still work; this likely requires the selector to be short and to reference as little of the page as possible)

# Approach

There are 2 heuristics that guided the design: (1) very few attributes are robust, and (2) referencing ancestor elements should be minimized to avoid UI changes (for example, a wrapper div is added).

Not all attributes are robust to page refreshes, UI changes, etc. Therefore, we only consider a few attributes as stable anchors: id, aria-label, and data-testid. I found other attributes, like class or role, to be unstable. This list can expand and contract in production-grade testing.*

To be robust, we want to reference as little of the page as possible. This means only referencing the element as a descendant when necessary (for example, going from //h2 to //div/h2.)

The algorithm starts from the selected element and walks upward through it's ancestors until a unique selector is found. At each step, it attempts to add a stable anchor, a parent element, and a positional index. A stable anchor is only added when present, and a positional index is only added if the element doesn't have a stable anchor AND the current condition is if the child has at least 1 sibling of the same type. At every step, the selector is validated with document.evaluate(...). Once the selector uniquely identifies the element, it is returned immediately. No more steps are taken, as to reference as little of the page as possible.

A common use case is if the selected element, or a close ancestor, has an id. This will result in selectors of the form:
- //h2[@id="..."]
- //div[@id="page-header"]/div/div/span/span (real world example on a YT channel name)

# How to run

I've provided an AI-generated index.html page to use for testing. Clicking on an element prints the generated selector path to the console.

# Limitations

*More specifically, on LinkedIn, the class attribute seemed generated, and thus unstable, while on YouTube, it was semantic. Attributes can easily be added and removed based on more testing and research.

The worst case of this algorithm results in an absolute XPath, which does work, but of course, is extremely fragile. Referencing a less stable attribute may be preferred over this.