import { ILayoutAlgorithm, ILayoutAlgorithmFactory, LayoutAlgorithmType } from './interfaces';
import { GridLayoutAlgorithm } from './GridLayoutAlgorithm';
import { FlowLayoutAlgorithm } from './FlowLayoutAlgorithm';

/**
 * Factory for creating layout algorithms using the Factory pattern
 * Provides a centralized way to create and manage different layout algorithms
 */
export class LayoutAlgorithmFactory implements ILayoutAlgorithmFactory {
  private algorithms = new Map<LayoutAlgorithmType, new () => ILayoutAlgorithm>();

  constructor() {
    // Register default algorithms
    this.registerAlgorithm('grid', GridLayoutAlgorithm);
    this.registerAlgorithm('flow', FlowLayoutAlgorithm);
  }

  /**
   * Create a layout algorithm instance by type
   */
  createAlgorithm(type: LayoutAlgorithmType): ILayoutAlgorithm {
    const AlgorithmClass = this.algorithms.get(type);
    
    if (!AlgorithmClass) {
      throw new Error(`Layout algorithm type '${type}' is not registered. Available types: ${Array.from(this.algorithms.keys()).join(', ')}`);
    }

    return new AlgorithmClass();
  }

  /**
   * Get all available algorithm types
   */
  getAvailableTypes(): LayoutAlgorithmType[] {
    return Array.from(this.algorithms.keys());
  }

  /**
   * Register a new layout algorithm
   */
  registerAlgorithm(type: LayoutAlgorithmType, algorithmClass: new () => ILayoutAlgorithm): void {
    this.algorithms.set(type, algorithmClass);
  }

  /**
   * Check if an algorithm type is registered
   */
  isRegistered(type: LayoutAlgorithmType): boolean {
    return this.algorithms.has(type);
  }

  /**
   * Unregister an algorithm type
   */
  unregisterAlgorithm(type: LayoutAlgorithmType): boolean {
    return this.algorithms.delete(type);
  }

  /**
   * Get algorithm information without instantiating
   */
  getAlgorithmInfo(type: LayoutAlgorithmType): { name: string; description: string } | null {
    const AlgorithmClass = this.algorithms.get(type);
    if (!AlgorithmClass) {
      return null;
    }

    // Create a temporary instance to get metadata
    const tempInstance = new AlgorithmClass();
    return {
      name: tempInstance.name,
      description: tempInstance.description
    };
  }
}

// Export a singleton instance for global use
export const layoutAlgorithmFactory = new LayoutAlgorithmFactory();