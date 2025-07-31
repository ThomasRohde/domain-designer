# URL Viewer Not Working on GitHub Pages

## Issue Description
The URL viewer functionality is not working correctly on GitHub Pages deployment. When users click the demo links in README.md, they don't see the expected sample diagram.

## Expected Behavior
When visiting:
```
https://thomasrohde.github.io/domain-designer/viewer?url=https%3A//thomasrohde.github.io/domain-designer/test-models/sample-diagram.json
```

Should show:
- Sample diagram with hierarchical rectangles (Parent → Child → Grand child 1 & 2)
- "Editor" button to import the diagram
- Pan/zoom functionality
- Read-only viewing experience

## Actual Behavior
- Link opens the main viewer page (local storage viewer)
- No sample diagram is displayed
- Shows empty viewer or local storage content instead of URL-based content

## Technical Details

### Current Implementation
- **Route structure**: `/viewer` → ViewerPage, `/viewer/*` → URLViewerPage
- **Query parameter approach**: `/viewer?url=encoded_json_url`  
- **Conditional rendering**: ViewerPage detects `url` query param and renders URLViewerPage

### What We've Tried
1. **Path parameters**: `/viewer/url` (failed due to GitHub Pages routing)
2. **URL encoding**: `%3A` for `:` (partial success)
3. **404.html redirect**: GitHub Pages SPA workaround (didn't solve main issue)
4. **Query parameters**: `/viewer?url=...` (current approach)
5. **Conditional rendering**: ViewerPage → URLViewerPage when url param exists

### Debugging Information
- ✅ **JSON file accessible**: `https://thomasrohde.github.io/domain-designer/test-models/sample-diagram.json` returns 200
- ✅ **Local development works**: `localhost:3000/viewer?url=...` works correctly
- ❌ **GitHub Pages fails**: Production deployment doesn't load URL-based content
- ✅ **Build succeeds**: No TypeScript or lint errors
- ✅ **Routes exist": Both ViewerPage and URLViewerPage components exist

### Test Cases
| URL | Expected | Actual | Status |
|-----|----------|---------|--------|
| `/viewer` | Local storage viewer | ✅ Works | ✅ Pass |
| `/viewer?url=...` (local) | URL-based viewer | ✅ Works | ✅ Pass |
| `/viewer?url=...` (GitHub Pages) | URL-based viewer | ❌ Local viewer | ❌ Fail |

## Possible Root Causes

### 1. React Router Configuration
- GitHub Pages may handle query parameters differently
- Base URL configuration in `vite.config.ts` might affect routing
- React Router might not be processing query parameters correctly in production

### 2. Service Worker Interference  
- PWA service worker might be caching or intercepting requests
- Workbox configuration could be affecting route handling

### 3. URL Encoding Issues
- Double encoding/decoding problems
- Character escaping differences between dev and production

### 4. Component Rendering Issues
- ViewerPage conditional logic may not be executing properly
- URLViewerPage may not be receiving the URL parameter correctly
- useLocation() hook behavior differences in production

## Debug Steps to Try

### 1. Add Console Logging
```tsx
// In ViewerPage.tsx
console.log('ViewerPage Debug:', {
  search: location.search,
  urlParam,
  pathname: location.pathname,
  shouldRenderURLViewer: !!urlParam
});
```

### 2. Test URL Parameter Extraction
```tsx
// Test different URLSearchParams approaches
const searchParams = new URLSearchParams(location.search);
const urlParam1 = searchParams.get('url');
const urlParam2 = new URL(window.location.href).searchParams.get('url');
```

### 3. Check Service Worker
- Disable service worker temporarily
- Check network tab for request interception
- Verify if SW is affecting routing

### 4. Alternative Routing Approaches
- Try HashRouter instead of BrowserRouter
- Use useSearchParams hook from React Router
- Implement custom query parameter parsing

## Files Involved
- `src/App.tsx` - Route configuration
- `src/components/ViewerPage.tsx` - Conditional rendering logic
- `src/components/URLViewerPage.tsx` - URL-based viewer implementation
- `src/main.tsx` - Router setup and PWA configuration
- `vite.config.ts` - Build and PWA configuration
- `public/404.html` - GitHub Pages SPA redirect
- `README.md` - Demo links

## Impact
- **User Experience**: Demo links in README don't work
- **Feature Adoption**: Users can't try URL sharing functionality
- **Documentation**: Examples in README are broken
- **Reputation**: Broken links reflect poorly on project quality

## Priority
🔴 **High** - This is a core feature that's prominently featured in documentation but doesn't work for end users.

## Next Steps
1. Add comprehensive debugging logs to understand what's happening in production
2. Test with simplified URL structure 
3. Consider alternative routing approaches (HashRouter, manual parameter parsing)
4. Investigate service worker interference
5. Test with different browsers to rule out browser-specific issues

## Workaround
Until fixed, users can:
1. Clone the repository and run locally
2. Use the main app and manually import JSON files
3. Use other export formats (HTML, SVG) for sharing

---
*Created: January 31, 2025*  
*Status: Open*  
*Assignee: TBD*