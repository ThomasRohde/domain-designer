Below is a deliberately “engineering-level” recipe you can implement in any language (Java + JavaFX/SVG, TypeScript + D3, Python + Plotly, etc.).
It is **not** a single treemap or single grid algorithm; it is a *two–level hierarchical packer* that alternates orientation (row → column → row).
That alternation is what gives the manual map its long horizontal “stripes”, neat inner columns and the clearly aligned gutters you see in the screenshot.

---

## 1. Data model

```text
Capability {
    id                  // unique key
    label               // display caption
    children[]          // array 0-n (empty => leaf)
    weight = 1          // can be overridden for sizing
    minW,minH           // text-driven minimum footprint, inc. padding
    orient              // ROW | COL (derived, see §3)
    x, y, w, h          // final placement, filled by the packer
}
Canvas { W, H }         // drawing board supplied by the caller
```

*All maths is done in logical units (px, pt, mm, …); convert to your render target later.*

---

## 2. Pre-processing

1. **Build the tree** from your capability list (Paths like
   `Products & Services / Payments / Payment Execution` → nested nodes).
2. **Measure text** once per label to obtain `minW` and `minH` (string length × average glyph width + insets, single or multi-line).
3. **(Optional)** Re-weight nodes if you want some blocks bigger (e.g. strategic vs. commodity).

---

## 3. Orientation pattern

A very small rule set reproduces the manual layout:

| Tree depth | Orientation | Visual effect                  | Screenshot row(s)     |
| ---------- | ----------- | ------------------------------ | --------------------- |
| 0 (root)   | COL         | long horizontal stripes        | whole diagram         |
| 1          | ROW         | several blocks side-by-side    | “Products & Services” |
| 2          | COL         | leaf boxes stacked in a column | leaf capabilities     |

Feel free to flip the pattern (ROW–COL–ROW) or make it data-driven (`orient` flag).
The algorithm below only needs to know each node’s `orient` up-front.

---

## 4. Packing algorithm (bottom-up)

```pseudocode
function pack(node, maxW, maxH):
    if node is leaf:
        node.w = max(node.minW, LEAF_W)
        node.h = max(node.minH, LEAF_H)
        return node.w, node.h

    // PACK CHILDREN FIRST
    sizes = [ pack(c, ∞, ∞) for c in node.children ]

    if node.orient == ROW:      // horizontal flow
        currentX = 0; rowH = 0; maxRowW = 0
        for child in node.children:
            if currentX + child.w > maxW:        // wrap
                maxRowW = max(maxRowW, currentX)
                node.h += rowH + V_GUTTER
                currentX = 0; rowH = 0
            child.x = currentX
            child.y = node.h
            currentX += child.w + H_GUTTER
            rowH = max(rowH, child.h)
        maxRowW = max(maxRowW, currentX)
        node.h += rowH
        node.w = maxRowW

    else:                     // COL – vertical stack
        currentY = 0; colW = 0
        for child in node.children:
            child.x = 0
            child.y = currentY
            currentY += child.h + V_GUTTER
            colW = max(colW, child.w)
        node.w = colW
        node.h = currentY - V_GUTTER          // trim last gutter

    // add container padding
    node.w += 2 * PADDING
    node.h += 2 * PADDING

    return node.w, node.h
```

*Key ideas*

* **Greedy “flow‐layout” inside ROW-oriented nodes**:
  children are dropped left-to-right, wrapping to a new row when out of space.
  This keeps all columns perfectly aligned because every wrapped row starts at *x = 0*.
* **Simple vertical stack inside COL nodes**:
  each child keeps its intrinsic width; the container’s width is the widest child.
* **Bottom-up sizing**: start at leaves, climb up the tree, assigning `(w,h)` and `(x,y)`.

---

## 5. Top-level scaling & centring

After `pack(root, ∞, ∞)` you know the natural size `(root.w, root.h)`.
If it exceeds the drawing board:

```pseudocode
scale = min(Canvas.W / root.w, Canvas.H / root.h, 1.0)
applyScaleRecursively(root, scale)
centre(root, Canvas.W, Canvas.H)
```

---

## 6. Rendering guidelines

1. **Grid snapping**: round all coordinates to 4 px to avoid sub-pixel blur.
2. **Colour bands**: fill `depth==1` containers with a pastel (`HSLA` 30% fill).
3. **Border hierarchy**: 2 px dark grey for depth 0-1, 1 px light grey for leaves.
4. **Word-wrap** labels after 18–20 chars; ellipsis only as a last resort.
5. **SVG groups** (`<g>` with `id=node.id`) make the drawing easily stylable in CSS and allow *hover–to-highlight* tricks.

---

## 7. Visual polish heuristics (optional)

| Aesthetic need               | Quick heuristic                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Avoid very thin rows         | Force a wrap if *rowH/rowW* < 0.25 while packing                                                         |
| Keep related blocks together | Sort `children` by semantic *order* before packing (e.g. “Accounts” before “Cards”)                      |
| Symmetry between groups      | Normalise container widths per *row group* (`ROW` level) by stretching smaller ones                      |
| Stable diff-friendly layout  | Keep a deterministic sort key (`label.lower()`) so a small taxonomy change does not reshuffle everything |

---

## 8. Complexity

*Leaf measurement* is *O(N)*.
*Packing* visits each node once ⇒ *O(N)* time and *O(N)* memory.
Even a 5 000-capability model renders in milliseconds in the browser.

---

### Why this works for business-capability maps

* It enforces **visual hierarchy**: each depth level has its own orientation and colour band.
* **Text boxes drive size**, so nothing overlaps or truncates.
* Gutters and padding yield the “airy” feel architects like, without complex optimisation.
* The greedy wrapping keeps columns *flush*, which is what makes the manual diagram look hand-tidied.

Use it as-is or replace the inner `ROW` and `COL` packers with a more sophisticated bin-packer (e.g. *shelf + skyline*) if you have wildly varying box dimensions. Either way, this alternating-orientation skeleton is all you need to turn a raw capability catalogue into a neat, fully automatic, presentation-ready diagram.
