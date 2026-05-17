const doc = document.querySelector(".layout");

doc.addEventListener("click", generateUniqueXPath);

/*
 * Generate a unique XPath for a target element by searching for a stable semantic
 * attribute as an anchor (currently id, aria-label, and data-testid) in the selected element
 * or in an ancestor element. Positional indices are used when a parent has 2 or more of the same
 * type of child and doesn't have an id.
 * 
 * This algorithm naturally falls back to an absolute xpath, which, while fragile, ensures
 * immediate functionality.
 */
function generateUniqueXPath(event) {

    const targetElement = event.target; // will stay fixed
    let currentElement = targetElement; // will ascend to ancestor elements as needed

    let suffix = ""; // this represents the old path before an ascension to the parent node
    let selector = "";
    let matchCount = -1;
    while ((currentElement != null)) {

        // if we reached an absolute path, then we specify it with just / at the beginning and not //.
        let slashes = "//";
        if (currentElement.localName === "html") {
            slashes = slashes.substring(1);
        }

        selector = slashes              // "/" if the currentElement is html, meaning we built an absolute path, "//" otherwise
        + currentElement.localName      // represents the tag of the element, ex: <div> becomes div
        + tryAttrs(currentElement)      // represents addition of stable attrs, ex: <div aria-label="hi"> becomes /div[@aria-label="hi"]
        + tryIndexing(currentElement)  // represents addition of indexing when possible, ex <a><b><b></a> becomes //a/b[2]
        + suffix.substring(1);          // strip the 1st slash away from suffix since it's no longer any descendant

        // test uniqueness & validity
        if (!isValidSelector(selector, targetElement)) {
            throw new Error(`Generated invalid XPath: ${selector}`);
        }

        // validity + uniqueness -> return
        if (getMatchCount(selector, targetElement) === 1) {
            console.log(`Generated selector: ${selector}`);
            return selector;
        }

        // at this point, the selector is valid but NOT unique, so we need to go up by 1
        suffix = selector;
        currentElement = currentElement.parentElement;

    }

    // this is unreachable because the above solution should
    // naturally converge on an absolute xpath in a worst case scenario
    throw new Error("Failed to generate a unique, valid XPath.");
}

/*
 * Generates a positional index for the element if it has at least 1 sibling of the same type AND
 * no stable attributes were found.
 * This heuristic ensures (1) positional indices aren't used redundantly and (2) 
 */
function tryIndexing(element) {
    let indexString = "";

    // If an anchor is found, we don't use positional indices
    if (tryAttrs(element) !== "") return indexString;

    // our condition for indexing is, if the parent of element has 2+ children of the same type,
    // then use an index.
    const type = element.localName;
    const parent = element.parentElement;
    if (parent === null) return indexString; // guard against no parent

    const children = parent.children;

    // keep track of: # of elements with the same type (as we only care if we get 2 or more) AND -> sameTypeSiblings
    //                index of the original element (so we can index it) -> i
    let sameTypeSiblings = 0;
    let index = 0;
    for (let i = 0; i < children.length; i++) {
        if (children[i].localName === type) {
            sameTypeSiblings++;
            if (children[i] === element) {
                index = sameTypeSiblings;
            }
        }
    }

    // add indexing if we found at least 1 sibling of the same type
    if (sameTypeSiblings > 1) {
        indexString = `[${index}]`;
    }
    
    return indexString;
}

/*
 * Generates a predicate with a stable anchor (aka a semantic attr)
 * We are very strict with what we count as a valid one (to survive refreshes and UI updates), currently we only take 3:
 * id, 
 * aria-label, 
 * data-testid
 * As these seem stable in production-grade html (LinkedIn, YouTube, etc)
 * We don't use anything else, for example class, as I have found that to be unstable
 * This function can add or remove what counts as a stable attribute easily upon more
 * testing and research
 */
function tryAttrs(element) {

    let attrString = "";

    // anchor 1: id
    if (element.id) {
        attrString += `[@id=\"${element.id}\"]`;
    }

    // anchor 2: aria-label
    if (element.dataset.testid) {
        attrString += `[@aria-label=\"${element.ariaLabel}\"]`;
    }

    // anchor 3: data-testid
    if (element.ariaLabel) {
        attrString += `[@data-testid=\"${element.dataset.testid}\"]`;
    }

    return attrString;
}

/*
 * Returns how many elements this selector matches with
 * If there is 1 match, it means we found an XPath to uniquely identify the element
 */
function getMatchCount(selector, element) {    
    return document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength;
}

/*
 * Validates that this selector still identifies the element (not necessarily uniquely)
 * Used primarily as a sanity check during the selector algorithm
 */
function isValidSelector(selector, element) {
    
    let xpathMatches = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < xpathMatches.snapshotLength; i++) {
        if (xpathMatches.snapshotItem(i) === element) {
            return true;
        }
    }

    return false;
}