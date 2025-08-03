# Modern React+TypeScript Application Scaffold

**Prompt for Claude Code**: Please scaffold a new React+TypeScript application using this enterprise-grade architecture. Create a robust, maintainable application with sophisticated state management, PWA capabilities, and production-ready tooling.

## Architecture Overview

This scaffold creates applications with modern React development patterns and enterprise-grade architecture:

- **Hook-based architecture** for clean separation of concerns
- **Zustand state management** with modular slice pattern
- **Constraint-based business logic** with automated validation
- **PWA capabilities** with offline support and auto-updates
- **Comprehensive testing** with Vitest and Testing Library
- **Zero-config tooling** with excellent developer experience
- **Production-ready deployment** via GitHub Actions and Pages

## Core Technology Stack

### Runtime Dependencies

```bash
# Install latest versions of core runtime dependencies
npm install react react-dom react-router-dom zustand immer lucide-react idb vite-plugin-pwa workbox-window
```

**Core Libraries Explained:**
- **React**: Latest React with concurrent features and enhanced hooks
- **Zustand**: Lightweight state management with middleware support
- **Immer**: Immutable state updates with mutable-style syntax
- **Lucide React**: Modern icon library with tree-shaking support
- **idb**: Promised-based IndexedDB wrapper for client-side persistence
- **Vite PWA**: Service worker and offline capabilities

### Development Tools

```bash
# Install latest versions of development dependencies
npm install -D @vitejs/plugin-react vite typescript tailwindcss autoprefixer postcss
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @types/node
```

**Tooling Philosophy:**
- **Vite**: Ultra-fast development server with instant HMR
- **TypeScript**: Strict type checking with modern language features
- **Tailwind CSS**: Utility-first styling with design system support
- **ESLint**: Code quality enforcement with zero-warnings policy
- **Vitest**: Jest-compatible testing with native ESM support

## Architecture Patterns

### 1. Hook-Based Architecture

**Pattern**: Separate business logic into focused custom hooks that handle specific domains.

```typescript
// Example: useEntityManager hook
export interface UseEntityManagerReturn {
  updateEntity: (entities: Entity[], updates: EntityUpdate) => Entity[];
  validateEntity: (entity: Entity) => ValidationResult;
  processEntityRules: (entities: Entity[], entityId: string) => Entity[];
  canModifyEntity: (entity: Entity, rules?: BusinessRules) => boolean;
}

const useEntityManager = ({ getConstraints, getRules }: Props): UseEntityManagerReturn => {
  // Implementation handles entity operations and business rule validation
}
```

**Benefits:**
- Clear separation of concerns
- Reusable business logic
- Easy unit testing
- Composition over inheritance
- Memoization for performance

**Replication Strategy:**
1. Identify domain boundaries in your application
2. Create hooks for each major business concern
3. Use TypeScript interfaces to define hook contracts
4. Implement constraint validation within hooks
5. Return memoized functions to prevent unnecessary re-renders

### 2. Zustand Store with Slice Pattern

**Pattern**: Modular state management using domain-specific slices combined into a unified store.

```typescript
// Store composition pattern
const createAppStore = (set: any, get: any, api: any): AppStore => {
  const entitySlice = createEntitySlice(set, get, api);
  const uiSlice = createUISlice(set, get, api);
  const settingsSlice = createSettingsSlice(set, get, api);
  
  return {
    // State from slices
    entities: entitySlice.entities,
    ui: uiSlice.ui,
    settings: settingsSlice.settings,
    
    // Actions grouped by domain
    entityActions: entitySlice.entityActions,
    uiActions: uiSlice.uiActions,
    settingsActions: settingsSlice.settingsActions,
    
    // Cross-slice computed getters
    getters: {
      canUndo: () => get().history.index > 0,
      findEntity: (id: string) => get().entities.find(e => e.id === id)
    }
  };
};

// Store with middleware stack
export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        immer(createAppStore),
        { /* persistence config */ }
      ),
      { name: 'app-store' }
    )
  )
);
```

**Middleware Stack:**
- **Immer**: Enables mutable-style state updates with immutability
- **Persist**: Selective localStorage persistence for user preferences
- **DevTools**: Redux DevTools integration for debugging
- **subscribeWithSelector**: Reactive subscriptions for auto-save

**Replication Strategy:**
1. Design your state domains (entities, UI, settings, etc.)
2. Create separate slice files for each domain
3. Use TypeScript interfaces to define state shapes and actions
4. Compose slices in the main store creator
5. Add getters for computed values and cross-slice logic
6. Configure middleware based on your persistence and debugging needs

### 3. Command Pattern for Complex Operations

**Pattern**: Encapsulate complex business operations in command objects with undo/redo support.

```typescript
// Command interface
interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

// Example: Bulk operation command
class BulkUpdateCommand implements Command {
  constructor(
    private entityIds: string[],
    private updates: Partial<Entity>,
    private store: AppStore
  ) {}
  
  execute(): void {
    // Validate business constraints
    // Apply bulk updates
    // Trigger dependent calculations
  }
  
  undo(): void {
    // Reverse the changes
  }
}
```

**Benefits:**
- Complex operations are atomic
- Natural undo/redo implementation
- Constraint validation at operation level
- Batch operations for performance

### 4. Constraint-Based Business Logic

**Pattern**: Implement business rules as constraint functions that validate operations before execution.

```typescript
// Constraint validation utilities
export const validateBulkOperationConstraints = (
  selectedIds: string[],
  entities: Entity[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Example: Same category constraint
  const categories = selectedIds.map(id => findEntity(id, entities)?.category);
  const uniqueCategories = new Set(categories);
  if (uniqueCategories.size > 1) {
    errors.push('Selected entities must be in the same category');
  }
  
  // Example: Status validation
  const entities = selectedIds.map(id => findEntity(id, entities));
  const invalidEntities = entities.filter(e => e.status === 'locked');
  if (invalidEntities.length > 0) {
    errors.push('Cannot modify locked entities');
  }
  
  return { isValid: errors.length === 0, errors };
};
```

**Benefits:**
- Business rules are explicit and testable
- Consistent validation across the application
- Clear error messaging for users
- Prevents invalid state transitions

## Development Workflow

## Scaffolding Instructions for Claude Code

**Step 1: Initialize Project**
Create a new Vite React+TypeScript project and install the complete dependency stack:

```bash
# Initialize new project with latest Vite
npm create vite@latest my-app -- --template react-ts
cd my-app

# Install latest runtime dependencies
npm install react react-dom react-router-dom zustand immer lucide-react idb vite-plugin-pwa workbox-window

# Install latest development tools
npm install -D @vitejs/plugin-react vite typescript tailwindcss autoprefixer postcss
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @types/node

# Initialize Tailwind CSS
npx tailwindcss init -p
```

**Step 2: Configure Project**
Set up all configuration files as specified in the sections below.

**Step 3: Create Architecture**
Implement the folder structure and architectural patterns outlined in this guide.

### Essential Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

### TypeScript Configuration

Create `tsconfig.json` with modern, strict TypeScript settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### ESLint Configuration

Create `eslint.config.js` with strict TypeScript and React rules:

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
];
```

### Vite Configuration with PWA

Create `vite.config.ts` with PWA support and GitHub Pages compatibility:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Your App Name',
        short_name: 'App',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [/* Add your icon definitions */]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  base: mode === 'production' && process.env.GITHUB_PAGES ? '/your-repo-name/' : '/',
  server: { port: 3000, open: true },
  build: { outDir: 'dist', sourcemap: true }
}));
```

## State Management Architecture

### Store Structure

```typescript
// types.ts - Define your state interfaces
export interface AppStore {
  // State slices
  entities: Entity[];
  ui: UIState;
  settings: Settings;
  canvas: CanvasState;
  history: HistoryState;
  
  // Action groups
  entityActions: EntityActions;
  uiActions: UIActions;
  settingsActions: SettingsActions;
  canvasActions: CanvasActions;
  historyActions: HistoryActions;
  
  // Computed getters
  getters: {
    canUndo: () => boolean;
    canRedo: () => boolean;
    findEntity: (id: string) => Entity | undefined;
    getFilteredEntities: (filter: FilterCriteria) => Entity[];
  };
}
```

### Slice Implementation Pattern

```typescript
// entitySlice.ts
export const createEntitySlice: SliceCreator<EntitySlice> = (set, get, api) => ({
  entities: [],
  nextId: 1,
  
  entityActions: {
    addEntity: (data: Partial<Entity>) => {
      set((state) => {
        const newEntity = createEntity(state.nextId, data);
        state.entities.push(newEntity);
        state.nextId += 1;
      });
    },
    
    updateEntity: (id: string, updates: Partial<Entity>) => {
      set((state) => {
        const entity = state.entities.find(e => e.id === id);
        if (entity) {
          Object.assign(entity, updates);
        }
      });
    },
    
    removeEntity: (id: string) => {
      set((state) => {
        state.entities = state.entities.filter(e => e.id !== id);
      });
    }
  }
});
```

### Auto-save Implementation

```typescript
// Auto-save with IndexedDB
export const initializeAutoSaveSubscription = () => {
  return useAppStore.subscribe(
    (state) => ({ 
      entities: state.entities, 
      settings: state.settings 
    }),
    (current, previous) => {
      const hasChanges = JSON.stringify(current) !== JSON.stringify(previous);
      if (hasChanges) {
        const state = useAppStore.getState();
        state.autoSaveActions.saveData();
      }
    },
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
  );
};
```

## Testing Strategy

### Vitest Configuration

Create `vitest.config.ts` for modern testing setup:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': '/src' }
  }
});
```

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB for testing
const mockIDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIDB,
  writable: true,
});
```

### Component Testing Pattern

```typescript
// Component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { useAppStore } from '@/stores/useAppStore';
import Component from './Component';

// Mock store for isolated testing
vi.mock('@/stores/useAppStore');

describe('Component', () => {
  beforeEach(() => {
    const mockStore = {
      entities: [],
      entityActions: {
        addEntity: vi.fn(),
        updateEntity: vi.fn(),
      }
    };
    
    vi.mocked(useAppStore).mockReturnValue(mockStore);
  });
  
  it('should handle user interactions correctly', () => {
    render(<Component />);
    
    const button = screen.getByRole('button', { name: /add/i });
    fireEvent.click(button);
    
    expect(useAppStore().entityActions.addEntity).toHaveBeenCalled();
  });
});
```

## Deployment Architecture

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          
      - name: Clean install dependencies
        run: |
          rm -rf node_modules package-lock.json
          npm install --ignore-scripts

      - name: Rebuild native dependencies
        run: npm rebuild

      - name: Build
        run: GITHUB_PAGES=true npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Environment Configuration

```typescript
// Handle different deployment environments
const isGitHubPages = import.meta.env.PROD && import.meta.env.BASE_URL !== '/';

export const config = {
  baseUrl: isGitHubPages ? '/your-repo-name/' : '/',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  enablePWA: import.meta.env.PROD,
  debugMode: import.meta.env.DEV,
};
```

## Performance Optimizations

### Code Splitting

```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const AdminPanel = lazy(() => import('./AdminPanel'));

// Route-based splitting
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { 
        path: 'admin', 
        element: <Suspense fallback={<Loading />}><AdminPanel /></Suspense> 
      }
    ]
  }
]);
```

### Memoization Strategy

```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(entities, filters);
}, [entities, filters]);

// Memoize event handlers to prevent child re-renders
const handleEntityUpdate = useCallback((id: string, updates: Partial<Entity>) => {
  updateEntity(id, updates);
}, [updateEntity]);

// Memoize selectors for derived state
const selectedEntities = useAppStore(
  useCallback(
    (state) => state.entities.filter(e => state.ui.selectedIds.includes(e.id)),
    []
  )
);
```

### Bundle Optimization

```typescript
// vite.config.ts - Optimize bundle splitting
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          state: ['zustand', 'immer'],
          utils: ['date-fns', 'lodash-es']
        }
      }
    }
  }
});
```

## Accessibility and UX

### Keyboard Navigation

```typescript
// Comprehensive keyboard shortcut system
const useKeyboardShortcuts = (handlers: KeyboardHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is in editable elements
      const target = e.target as HTMLElement;
      const isEditable = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      );
      
      if (isEditable) return;
      
      // Handle shortcuts based on key combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            e.shiftKey ? handlers.onRedo() : handlers.onUndo();
            break;
          case 's':
            e.preventDefault();
            handlers.onSave();
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
```

### Focus Management

```typescript
// Manage focus for modal dialogs and dynamic content
const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Trap focus within modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      firstElement?.focus();
      
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus();
              e.preventDefault();
            }
          }
        }
      };
      
      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [isOpen]);
  
  return isOpen ? (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  ) : null;
};
```

## Security Considerations

### Input Validation

```typescript
// Schema validation for data integrity
import { z } from 'zod';

const EntitySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['type1', 'type2', 'type3']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const validateEntity = (data: unknown): Entity => {
  return EntitySchema.parse(data);
};

// Sanitize user input
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};
```

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' ws: wss:;
">
```

## Migration and Adaptation Guide

## Application Examples

**E-commerce Application:**
```typescript
// Define your entity model
interface Product extends BaseEntity {
  name: string;
  price: number;
  inventory: number;
  category: string;
  variants: ProductVariant[];
}

// Implement business constraints
const validateProductConstraints = (product: Product): ValidationResult => {
  const errors: string[] = [];
  
  if (product.price <= 0) {
    errors.push('Price must be greater than zero');
  }
  
  if (product.inventory < 0) {
    errors.push('Inventory cannot be negative');
  }
  
  return { isValid: errors.length === 0, errors };
};
```

**Data Visualization Dashboard:**
```typescript
// Define widgets as entities
interface Widget extends BaseEntity {
  type: 'chart' | 'table' | 'metric';
  dataSource: string;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
}

// Create layout management hooks
const useDashboardLayout = () => {
  const updateWidgetLayout = useCallback((widgets: Widget[]) => {
    // Implement grid-based layout algorithm
    return layoutManager.arrangeWidgets(widgets);
  }, []);
  
  return { updateWidgetLayout };
};
```

**Project Management Tool:**
```typescript
// Define tasks with hierarchy
interface Task extends BaseEntity {
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  parentTask?: string;
  dependencies: string[];
}

// Implement task validation rules
const validateTaskConstraints = (task: Task, allTasks: Task[]): ValidationResult => {
  // Check for circular dependencies
  // Validate status transitions
  // Ensure proper hierarchy
};
```

## Implementation Checklist for Claude Code

When scaffolding a new application using this architecture, implement the following:

### Core Setup
- [ ] Initialize Vite React+TypeScript project
- [ ] Install all dependencies from the runtime and development stacks
- [ ] Configure TypeScript, ESLint, Tailwind CSS, and Vitest
- [ ] Set up Vite PWA configuration

### Architecture Implementation
- [ ] Create folder structure: `src/{components,hooks,stores,types,utils,test}`
- [ ] Implement Zustand store with slice pattern
- [ ] Create base entity types and interfaces
- [ ] Set up hook-based architecture for business logic
- [ ] Implement constraint validation system
- [ ] Add command pattern for complex operations

### State Management
- [ ] Create entity slice with CRUD operations
- [ ] Create UI slice for interface state
- [ ] Create settings slice for user preferences
- [ ] Add history slice for undo/redo functionality
- [ ] Implement auto-save with IndexedDB
- [ ] Set up reactive subscriptions

### Testing & Quality
- [ ] Configure Vitest with jsdom environment
- [ ] Set up Testing Library for component tests
- [ ] Create test utilities and mocks
- [ ] Implement ESLint rules with zero-warnings policy
- [ ] Add pre-commit hooks for code quality

### Deployment
- [ ] Configure GitHub Actions workflow
- [ ] Set up GitHub Pages deployment
- [ ] Configure PWA manifest and service worker
- [ ] Add environment-specific configurations

### Application-Specific Customization
- [ ] Define your domain entities and relationships
- [ ] Implement business-specific validation rules
- [ ] Create domain-appropriate UI components
- [ ] Customize keyboard shortcuts and interactions
- [ ] Adapt accessibility features for your use case
- [ ] Configure application-specific PWA settings

## Summary for Claude Code

This scaffold creates enterprise-grade React+TypeScript applications with:

- **Modern Architecture**: Hook-based patterns with clear separation of concerns
- **Robust State Management**: Zustand with slice pattern and middleware stack
- **Business Logic Integration**: Constraint validation and command patterns
- **Production Ready**: PWA capabilities, testing, and automated deployment
- **Developer Experience**: Zero-config tooling with excellent debugging support

**Instructions**: Use this guide to scaffold new applications. Follow the implementation checklist and adapt the patterns to your specific domain requirements. The architecture scales from prototype to production while maintaining type safety and performance.