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
  type: RectangleType;
  isEditing?: boolean;
  metadata?: {
    description?: string;
    tags?: string[];
    [key: string]: unknown;
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

export interface GlobalSettings {
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
}

export interface DiagramState {
  rectangles: Rectangle[];
  selectedId: string | null;
  nextId: number;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  history: Rectangle[][];
  historyIndex: number;
  globalSettings: GlobalSettings;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality?: number;
  scale?: number;
  includeBackground?: boolean;
}