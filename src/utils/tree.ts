import type { JobTreeNode } from "@/types/job";

/**
 * Depth-agnostic, immutable helpers for the job tree.
 *
 * The tree is arbitrarily nested: any node with `kind === "group"` may hold
 * `children` (further groups and/or leaf definitions). These helpers recurse to
 * any depth, so the store never has to assume a fixed two-level shape.
 *
 * The mutating helpers preserve referential identity for untouched subtrees:
 * only nodes on the path to the change are rebuilt, and the original array is
 * returned unchanged when nothing matched. This keeps React memoization and
 * effect dependencies stable.
 */

/** Find a node by id anywhere in the tree. */
export function findNodeById(tree: JobTreeNode[], id: string): JobTreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Count every node in the tree (groups + leaves, all depths). */
export function countNodes(tree: JobTreeNode[]): number {
  let count = 0;
  for (const node of tree) {
    count += 1;
    if (node.children) count += countNodes(node.children);
  }
  return count;
}

/** Immutably replace the node matching `id` with `updater(node)`. */
export function updateNodeById(
  tree: JobTreeNode[],
  id: string,
  updater: (node: JobTreeNode) => JobTreeNode,
): JobTreeNode[] {
  let changed = false;
  const next = tree.map((node) => {
    if (node.id === id) {
      changed = true;
      return updater(node);
    }
    if (node.children) {
      const children = updateNodeById(node.children, id, updater);
      if (children !== node.children) {
        changed = true;
        return { ...node, children };
      }
    }
    return node;
  });
  return changed ? next : tree;
}

/** Immutably remove the node matching `id` from anywhere in the tree. */
export function removeNodeById(tree: JobTreeNode[], id: string): JobTreeNode[] {
  let changed = false;
  const next: JobTreeNode[] = [];
  for (const node of tree) {
    if (node.id === id) {
      changed = true;
      continue;
    }
    if (node.children) {
      const children = removeNodeById(node.children, id);
      if (children !== node.children) {
        changed = true;
        next.push({ ...node, children });
        continue;
      }
    }
    next.push(node);
  }
  return changed ? next : tree;
}

/** Immutably append `child` to the children of the node matching `parentId`. */
export function insertChild(tree: JobTreeNode[], parentId: string, child: JobTreeNode): JobTreeNode[] {
  return updateNodeById(tree, parentId, (parent) => ({
    ...parent,
    children: [...(parent.children ?? []), child],
    childCount: parent.childCount == null ? undefined : parent.childCount + 1,
  }));
}

/** Ids of a node and all its descendants (used to clean up tabs/selection on delete). */
export function collectSubtreeIds(node: JobTreeNode): string[] {
  const ids = [node.id];
  node.children?.forEach((child) => ids.push(...collectSubtreeIds(child)));
  return ids;
}
