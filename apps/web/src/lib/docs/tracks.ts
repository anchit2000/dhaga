import {
  DEVELOPER_ENTRY_URL,
  DEVELOPER_TRACK_DESCRIPTION,
  DEVELOPER_TRACK_TITLE,
  DOCS_BASE_URL,
  PRODUCT_GUIDE_URL,
} from "@/utils/constants/docs";
import type { Folder, Node, Root } from "fumadocs-core/page-tree";

// Segregate the flat `/docs` page tree into two sidebar contexts WITHOUT moving
// any files (so every doc URL is preserved): the PRODUCT track is the existing
// `guide/` folder, and the DEVELOPER track is a synthetic root folder that wraps
// every other top-level section. Both carry `root: true`, so Fumadocs renders a
// sidebar tab switcher and shows only the active track's subtree.

function isFolder(node: Node): node is Folder {
  return node.type === "folder";
}

// A page is the hub landing (`/docs`) — it belongs to neither track and stays
// at the top level; any other loose page (e.g. `contributing`) is a dev doc.
function isHubIndex(node: Node): boolean {
  return node.type === "page" && node.url === DOCS_BASE_URL;
}

export function buildTrackedTree(tree: Root): Root {
  const topLevel: Node[] = [];
  const developerChildren: Node[] = [];
  let productFolder: Folder | null = null;

  for (const node of tree.children) {
    if (isFolder(node) && node.index?.url === PRODUCT_GUIDE_URL) {
      productFolder = { ...node, root: true };
      continue;
    }
    if (isHubIndex(node)) {
      topLevel.push(node);
      continue;
    }
    developerChildren.push(node);
  }

  // Defensive: if the guide folder isn't present yet, leave the tree untouched
  // rather than emit a half-segregated tree.
  if (!productFolder) return tree;

  const developerFolder: Folder = {
    $id: "docs-track-developer",
    type: "folder",
    name: DEVELOPER_TRACK_TITLE,
    description: DEVELOPER_TRACK_DESCRIPTION,
    root: true,
    index: {
      $id: "docs-track-developer-index",
      type: "page",
      name: DEVELOPER_TRACK_TITLE,
      url: DEVELOPER_ENTRY_URL,
    },
    children: developerChildren,
  };

  return {
    ...tree,
    children: [...topLevel, productFolder, developerFolder],
  };
}
