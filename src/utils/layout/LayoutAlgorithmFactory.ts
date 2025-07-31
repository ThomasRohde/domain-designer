import { ILayoutAlgorithm, ILayoutAlgorithmFactory, LayoutAlgorithmType } from './interfaces';
import { GridLayoutAlgorithm } from './GridLayoutAlgorithm';
import { FlowLayoutAlgorithm } from './FlowLayoutAlgorithm';
import { MixedFlowLayoutAlgorithm } from './MixedFlowLayoutAlgorithm';

/**
 * Factory for layout algorithm instantiation and registry management
 * 
 * Implements the Factory pattern with dynamic registration capabilities.
 * Maintains a registry of available algorithms and provides type-safe
 * instantiation with error handling for missing algorithms.
 */
export class LayoutAlgorithmFactory implements ILayoutAlgorithmFactory {
  private algorithms = new Map<LayoutAlgorithmType, new () => ILayoutAlgorithm>();

  constructor() {
    // Register default algorithms
    this.registerAlgorithm('grid', GridLayoutAlgorithm);
    this.registerAlgorithm('flow', FlowLayoutAlgorithm);
    this.registerAlgorithm('mixed-flow', MixedFlowLayoutAlgorithm);
  }

  /**
   * Instantiate algorithm by type with error handling
   * 
   * @param type - Algorithm identifier to instantiate
   * @returns New algorithm instance
   * @throws Error if algorithm type is not registered
   */
  createAlgorithm(type: LayoutAlgorithmType): ILayoutAlgorithm {
    const AlgorithmClass = this.algorithms.get(type);
    
    if (!AlgorithmClass) {
      throw new Error(`Layout algorithm type '${type}' is not registered. Available types: ${Array.from(this.algorithms.keys()).join(', ')}`);
    }

    return new AlgorithmClass();
  }

  /**
   * List all registered algorithm identifiers
   * 
   * @returns Array of available algorithm type strings
   */
  getAvailableTypes(): LayoutAlgorithmType[] {
    return Array.from(this.algorithms.keys());
  }

  /**
   * Add algorithm to registry for future instantiation
   * 
   * @param type - Unique identifier for the algorithm
   * @param algorithmClass - Constructor for algorithm instances
   */
  registerAlgorithm(type: LayoutAlgorithmType, algorithmClass: new () => ILayoutAlgorithm): void {
    this.algorithms.set(type, algorithmClass);
  }

  /**
   * Verify algorithm availability
   * 
   * @param type - Algorithm identifier to check
   * @returns true if algorithm is registered and available
   */
  isRegistered(type: LayoutAlgorithmType): boolean {
    return this.algorithms.has(type);
  }

  /**
   * Remove algorithm from registry
   * 
   * @param type - Algorithm identifier to remove
   * @returns true if algorithm was registered and removed
   */
  unregisterAlgorithm(type: LayoutAlgorithmType): boolean {
    return this.algorithms.delete(type);
  }

  /**
   * Retrieve algorithm metadata without instantiation overhead
   * 
   * Creates temporary instance to access name and description.
   * Used for UI display of available algorithms.
   * 
   * @param type - Algorithm identifier
   * @returns Algorithm metadata or null if not registered
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