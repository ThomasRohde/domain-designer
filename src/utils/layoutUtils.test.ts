import { Rectangle } from '../types';
import { 
  calculateChildLayout, 
  updateChildrenLayout, 
  calculateNewRectangleLayout,
  getAllDescendants,
  getChildren,
  isLeaf,
  getRootRectangles,
  getZIndex
} from '../utils/layoutUtils';

// Simple test to verify layout functions
const testRectangles: Rectangle[] = [
  {
    id: 'root-1',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    label: 'Root 1',
    color: '#3B82F6',
    type: 'root'
  },
  {
    id: 'child-1',
    parentId: 'root-1',
    x: 1,
    y: 1,
    w: 4,
    h: 4,
    label: 'Child 1',
    color: '#10B981',
    type: 'leaf'
  },
  {
    id: 'child-2',
    parentId: 'root-1',
    x: 5,
    y: 1,
    w: 4,
    h: 4,
    label: 'Child 2',
    color: '#10B981',
    type: 'leaf'
  }
];

// Test functions
console.log('Root rectangles:', getRootRectangles(testRectangles));
console.log('Children of root-1:', getChildren('root-1', testRectangles));
console.log('Is root-1 a leaf?', isLeaf('root-1', testRectangles));
console.log('Is child-1 a leaf?', isLeaf('child-1', testRectangles));
console.log('All descendants of root-1:', getAllDescendants('root-1', testRectangles));

const parent = testRectangles[0];
const children = getChildren('root-1', testRectangles);
console.log('Child layout:', calculateChildLayout(parent, children));

export {};
