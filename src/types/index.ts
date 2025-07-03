export type RectangleCategory = 
  | 'channel'
  | 'relationship' 
  | 'business'
  | 'product'
  | 'control'
  | 'risk'
  | 'platform'
  | 'data'
  | 'support';

export type RectangleType = 'root' | 'parent' | 'leaf';

export interface Rectangle {
  id: string;
  parentId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  category: RectangleCategory;
  type: RectangleType;
  isEditing?: boolean;
  metadata?: {
    description?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export interface DragState {
  id: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

export interface ResizeState {
  id: string;
  startX: number;
  startY: number;
  initialW: number;
  initialH: number;
}

export interface DiagramState {
  rectangles: Rectangle[];
  selectedId: string | null;
  nextId: number;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  history: Rectangle[][];
  historyIndex: number;
}

export interface CategoryConfig {
  name: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  icon?: string;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality?: number;
  scale?: number;
  includeBackground?: boolean;
}