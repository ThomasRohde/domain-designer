/**
 * Template node from JSON file matching the specified schema
 */
export interface TemplateNode {
  /** Unique identifier for the template node */
  id: string;
  /** Display name for the template node */
  name: string;
  /** Description of the template node */
  description: string;
  /** Parent node ID (null for root nodes) */
  parent: string | null;
}

/**
 * Tree item structure for react-complex-tree
 */
export interface TreeItem {
  /** Unique identifier */
  index: string;
  /** Array of child item indexes */
  children?: string[];
  /** Template node data */
  data: TemplateNode;
  /** Whether this item can contain children */
  isFolder?: boolean;
  /** Whether this item can be moved */
  canMove?: boolean;
  /** Whether this item can be renamed */
  canRename?: boolean;
}

/**
 * Tree data structure for react-complex-tree
 */
export interface TreeData {
  [key: string]: TreeItem;
}

/**
 * Template loading state
 */
export interface TemplateLoadingState {
  /** Whether a template is currently being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Loaded template data */
  templateData: TemplateNode[] | null;
  /** Tree data for react-complex-tree */
  treeData: TreeData | null;
  /** Root item IDs for the trees */
  rootItems: string[];
}

/**
 * Template insertion options
 */
export interface TemplateInsertionOptions {
  /** ID of the template node to insert */
  templateNodeId: string;
  /** Whether to include all children */
  includeChildren: boolean;
  /** Starting position for insertion */
  startPosition?: {
    x: number;
    y: number;
  };
  /** Color to apply to inserted rectangles */
  color?: string;
}

/**
 * Result of template insertion
 */
export interface TemplateInsertionResult {
  /** Whether insertion was successful */
  success: boolean;
  /** Error message if insertion failed */
  error?: string;
  /** IDs of inserted rectangles */
  insertedRectangleIds: string[];
  /** ID of the root inserted rectangle */
  rootRectangleId: string | null;
}

/**
 * Template page state
 */
export interface TemplatePageState {
  /** Whether the template page is open */
  isOpen: boolean;
  /** Current template loading state */
  loadingState: TemplateLoadingState;
  /** Currently selected template node IDs */
  selectedNodeIds: string[];
  /** Whether insertion is in progress */
  isInserting: boolean;
}