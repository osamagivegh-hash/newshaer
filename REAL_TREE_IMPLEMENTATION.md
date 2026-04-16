# Real Tree Implementation

## 1. Layout Algorithm Implementation

The Real Tree engine lives in `client/src/real-tree/realTreeEngine.js`.

Core pipeline:

1. Clone the currently visible branch while respecting collapsed nodes.
2. Collect bottom-up metrics per subtree:
   - `descendantCount`
   - `leafWeight`
   - `maxDepth`
   - `spaceWeight`
3. Compute a reserved horizontal span for every subtree with `computeSpanUnits(...)`.
4. Assign each subtree a non-overlapping range with `assignUnitRanges(...)`.
5. Convert subtree ranges into actual canopy coordinates in `buildLayoutRecursive(...)`.
6. Run local refinement passes:
   - `separateSiblingClusters(...)`
   - `enforceSiblingAngleSeparation(...)`
   - `wrapLateGenerationClusters(...)`
   - `enforceTerminalNodeSpacing(...)`
   - `applyLeafDensityControl(...)`
   - `relaxLocalSubtreeRegions(...)`
7. Shift everything into the final viewport and produce:
   - `nodes`
   - `links`
   - `nodeIndex`
   - `trunk`
   - `canopy`

Why this is readable:

- Parent placement is bottom-up and centered from descendants.
- Every subtree reserves space before rendering.
- Dense crown regions receive local relaxation after the base layout.
- Terminal regions are expanded separately to protect leaf readability.

## 2. Rendering Logic

Rendering lives in `client/src/real-tree/RealTreeRenderer.jsx`.

Visual structure:

- Root trunk is rendered as a thick SVG path anchored at the bottom center.
- The canopy is rendered as a closed SVG path, not as a radial graph.
- Branches are cubic Bezier paths.
- Upper generations use circular nodes.
- Later generations use leaf-shaped nodes.

Interaction lives in `client/src/real-tree/RealTreeInteractionLayer.jsx`.

Supported interactions:

- smooth zoom
- pan
- focus on selected node
- hover state
- click to select node

Behavioral rendering details:

- first generations use larger radii and bolder labels
- later generations use smaller leaves
- dense leaf regions automatically shrink visual leaf size through `leafDensityScale`
- transitions are applied to node transforms and branch paths for softer expand/collapse updates

## 3. Example With Sample Data

Example data lives in `client/src/real-tree/sampleFamilyTree.js`.

Shape:

```js
{
  id,
  name,
  parentId,
  children: []
}
```

Example usage:

```js
import sampleFamilyTree from './client/src/real-tree/sampleFamilyTree'
import { layoutRealTreeBranch } from './client/src/real-tree/realTreeEngine'

const layout = layoutRealTreeBranch(sampleFamilyTree, new Set())
console.log(layout.nodes.length, layout.links.length)
```

## 4. Performance Considerations

For 3000+ nodes, the system avoids DOM-heavy rendering and keeps the tree in SVG.

Important performance choices:

- layout is computed before rendering
- subtree metrics are cached on nodes during a single layout pass
- layout is bottom-up, so width reservation happens once per subtree
- local refinement is limited to nearby subtree regions instead of global force simulation
- rendering is done in SVG groups and paths rather than thousands of nested DOM cards
- zoom/pan uses a single transformed viewport group via D3

Known scaling boundaries:

- the current engine favors deterministic constrained layout over expensive iterative physics
- local relaxation is intentionally shallow to preserve global shape
- if the dataset becomes much denser than the current family tree, the next optimization step should be path-corridor reservation or canvas fallback for branch rendering
