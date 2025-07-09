Thanks! I’ll research modern PWA best practices and generate a developer-ready Product Requirements Document (PRD), along with a detailed task list to convert the `domain-designer` project into a desktop-focused PWA that supports offline model design and local browser storage. I'll keep you posted once the materials are ready.


# Product Requirements Document: **Domain-Designer PWA Conversion**

## Overview and Background

**Domain-Designer** is a single-page React 18 application (TypeScript) built with Vite, used for creating hierarchical domain models and diagrams. It is currently deployed as a static site on GitHub Pages, with no backend server required. Users can create and edit diagrams entirely in-browser, with features like JSON export for saving. However, the app is **not yet a Progressive Web App (PWA)** – it lacks installability and true offline support. This PRD outlines requirements and a technical plan to convert Domain-Designer into a **desktop-focused PWA**. The aim is to deliver an app-like experience that can be **installed on desktop** and **used offline**, while persisting user’s work locally in the browser.

## Goals and Objectives

* **PWA Installability:** Make Domain-Designer installable on desktop platforms (Chrome, Edge, etc.), so users can "Add to Home Screen" or install it as a standalone app. The PWA should have a proper Web App Manifest with name, icons (including at least 192x192 and 512x512 sizes), start URL, display mode, theme color, etc., to meet install criteria. Once installed, it should launch in a standalone window without browser UI, like a native app.
* **Offline Functionality:** Ensure the application **fully works offline** after first load. Users should be able to open the app without network connectivity and continue designing diagrams. All core features (adding/editing shapes, using toolbar, saving/exporting diagrams) must be available offline. A service worker will cache the necessary static assets (HTML, JS, CSS, images) so the app loads reliably with no internet. The PWA should provide a smooth experience even on flaky or no network – no generic error pages. If needed, a friendly offline fallback screen or message should inform users when network-dependent functionality (if any) isn’t available. However, since Domain-Designer is currently a fully client-side app, **virtually all features should work offline** once assets are cached.
* **Local Data Persistence:** Implement **offline storage** for the user’s current diagram model. Whenever a user makes changes, the app should save the current state (the list of rectangles, their properties, and any relevant settings) to browser storage. This ensures that if the app is closed or the browser is refreshed (even offline), the **most recent diagram is restored** on the next launch. We will leverage modern storage APIs (preferably **IndexedDB**) to store this data, as it allows storing structured data asynchronously and in larger volume. This way, Domain-Designer effectively has an “auto-save” capability in the browser, critical for an offline-first design.
* **Desktop-Focused Experience:** Tailor the PWA for desktop use. This includes using `display: standalone` (or possibly `window-controls-overlay` on Windows 11 for a more native window feel) in the manifest so it runs in a windowed mode. Keyboard shortcuts (already implemented for save, load, undo, etc.) should work in the PWA context as they do in-browser. Ensure the layout is responsive and usable on typical desktop screen sizes (which is already the case with the current responsive design). We will also verify that the PWA can be installed on major desktop OSes (Windows, macOS, Linux via Chrome/Edge).
* **Performance & Reliability:** The PWA should meet modern best practices for performance. Caching strategies will be used to optimize load times (instant loading from cache) while still allowing updates when a new version is deployed. The app should pass PWA audits (Lighthouse) – e.g., fast load, offline-capable, provides installability. Using a service worker and local storage will make the app **reliable under unstable networks**. We will ensure the caching does not bloat the storage unnecessarily and implement updates in a user-friendly manner (e.g., prompting when a new version is available).

## Functional Requirements

### 1. Installability (Web App Manifest)

* **Web App Manifest:** Create a manifest file (e.g., `manifest.webmanifest`) with all required fields for installability. This includes:

  * `name`: Full app name (e.g. “Domain Designer”) and `short_name` (for desktop shortcut, e.g. “DomainDesigner”).
  * `start_url`: `/domain-designer/` (since it’s hosted at that path on GitHub Pages) so that the installed app always opens the correct location. Include any query params or route if needed to ensure the app loads to the main editor page.
  * `display`: set to `standalone` so it appears like a standalone app without browser chrome.
  * `theme_color`: use a theme/accent color that matches the app’s design (perhaps the toolbar or brand color) – this color will be used for the title bar in some OS and for the splash screen background.
  * `background_color`: a background color for the splash screen (often same as theme\_color or a neutral light color).
  * `icons`: Provide at minimum a **192x192px** and a **512x512px** PNG icon. These will be used for the desktop shortcut/Start menu icon. We’ll design or generate icons that reflect the app (e.g., possibly using the app’s node/rectangle motif). The icons should be referenced in the manifest with correct `sizes` and `type`. *Note:* If no dedicated logo exists yet, we may use a placeholder or create a simple logo (e.g., stylized "D" or diagram shape) for the PWA icons.
  * `scope`: set to `/domain-designer/` so that the service worker’s scope and navigation scope is limited to the app’s pages.
* **HTTPS Requirement:** Ensure the app continues to be served over **HTTPS** (already satisfied by GitHub Pages). This is mandatory for PWAs to be installable and to enable service workers.
* **Manifest Linking:** The manifest file must be linked in the HTML head: `<link rel="manifest" href="manifest.webmanifest">`. Vite’s PWA plugin can inject this automatically, or we add it manually to `index.html`. The manifest should be placed such that it’s accessible (likely in the `dist/` output or `public/` folder) and served with correct MIME type (`application/manifest+json`).
* **Install Prompt:** Rely on the browser’s install UI by default (e.g., Chrome’s omnibox install icon). We will also implement a custom install prompt as an enhancement: listen for the `beforeinstallprompt` event and possibly provide a UI hint (“Install Domain-Designer”) in the app’s UI to encourage installation. This is optional but improves discoverability of the install feature.

### 2. Offline Support (Service Worker & Caching)

* **Service Worker Registration:** The app will register a **service worker** script at launch to enable offline capabilities. The service worker will be responsible for caching assets and intercepting network requests. We will register the SW in the app’s entry point (e.g., in `src/main.tsx` or similar, using `navigator.serviceWorker.register('/domain-designer/sw.js')` with proper scope) or leverage automatic registration via the Vite PWA plugin.
* **Asset Caching (App Shell):** Upon installation, the service worker should pre-cache the essential files (often called the “app shell”) so that the application can load offline. This includes `index.html`, the compiled JS bundle(s), CSS files, and any static assets (icons, favicon, etc.). By opening a cache (e.g., `'domain-designer-cache-v1'`) during the SW install event and using `cache.addAll(...)`, we ensure these files are stored locally. All static resources that the app needs to start and run should be cached.
* **Runtime Caching Strategy:** Implement appropriate caching strategies for different request types:

  * *Static assets (JS, CSS, icons)* – **Cache-first** strategy: Serve from cache if available, falling back to network if not cached. These assets change only when we deploy a new version, so cache-first makes the app very fast on subsequent loads and offline-friendly. When a new deployment occurs, the service worker (with an updated cache name or manifest) will fetch updated files and update the cache in background.
  * *HTML (index.html)* – Also cache-first, since the app shell HTML is needed offline. We’ll ensure `index.html` is part of precache.
  * *Data requests* – Currently, Domain-Designer does not fetch external data from APIs. All data (diagram content) is user-generated and handled in-memory or via file export. Therefore, there are no recurring network fetches for dynamic content. If in the future the app requests remote template files or other resources, we might use a **network-first** strategy for those (to get fresh data online, but serve cached data if offline). For now, we mostly need to cache static files and perhaps provide a fallback.
* **Offline Fallback Page:** As a safety net, we can create a simple **offline page** that the service worker returns if a navigation request is made while offline and the resource isn’t in cache (e.g., user navigates to an unsupported route). This page (could be just a minimal HTML saying “You are offline. Please reconnect.”) keeps the user in the app context rather than showing a default browser error. However, since our app is single-page and we precache the necessary files, users should normally not hit a missing page. It’s still a best practice to handle unmatched requests with an offline message.
* **Updating and Versioning:** Set up the service worker to handle new versions of the app gracefully. We might use **Workbox** via the Vite PWA plugin, which can handle updating caches and even prompting the user to refresh when a new version is available. If implementing manually, we will use cache version names (e.g., increment cache name on new deployment) or Workbox’s precache manifest approach. The service worker should ideally **delete old caches** when activating a new version to avoid storage bloat.
* **Push Notifications & Background Sync:** *Out of Scope.* This PWA conversion will not include push notifications or background sync, focusing solely on offline use and installability.

### 3. Offline Data Storage (Saving Models Locally)

* **Auto-save Diagram State:** The application must automatically save the user’s current diagram model to the browser so that progress isn’t lost if the app is closed or offline. We will implement a client-side **auto-save** mechanism that triggers on key events (e.g., adding/removing a rectangle, moving/resizing, editing text, etc.) or at a regular interval. The saved state will include the essential model data – likely the same data that is exported to JSON today (an array of rectangle objects with their properties, plus global settings like grid size, margins, etc.). By reusing the JSON structure already defined for exports, we ensure we capture all necessary info.
* **Storage API Choice:** Use **IndexedDB** for storing the model data. IndexedDB is built for structured data, allows async access (won’t block UI), and can handle larger amounts of data than synchronous localStorage. This is important as diagrams could potentially be complex, and we want smooth performance. LocalStorage (a Web Storage API) is simpler but is synchronous and not ideal for complex or large data. Thus, we’ll create an IndexedDB database (perhaps name it `DomainDesignerDB` with an object store for diagrams). We only need to store one diagram (the “current work-in-progress”) by default, but the schema could allow multiple named diagrams in the future.

  * If implementation speed is a concern, we could initially use `localStorage` to store a JSON string of the diagram (since typical diagram JSON might be only a few KB). However, **best practice favors IndexedDB** for reliability and scale. We may utilize a small wrapper library (like `idb` or `localforage`) to simplify IndexedDB usage, or use the native API directly.
* **When to Save:** Implement a hook or utility (e.g., `useAutoSave`) in the React app that listens to changes in the diagram state. For example, whenever the rectangle list or settings change, call a function to save the state to IndexedDB. To avoid performance issues, we can throttle these saves (e.g., save 1 second after the last change, or only save if changes have occurred, etc.). We’ll also trigger a save when the app is about to unload (listen for `beforeunload` as backup).
* **Restoring State on Launch:** On app startup, the code should attempt to load any saved diagram state from IndexedDB. If found, it should populate the editor with that diagram. For instance, we could load the saved rectangles array and feed it into the state management (perhaps using the existing import logic internally). This allows a user to close the PWA and reopen it (even offline) and continue where they left off. If no saved state is found (e.g., first ever use), the app can start with an empty canvas as it does now.
* **User Control:** Provide some basic controls for this feature within the UI/UX: for example, an indication that the diagram is auto-saved (“All changes saved offline”), and maybe a way to “Reset” or clear the saved state (in case the user wants to start fresh). We might add a menu option like “New Diagram” which clears the current state (and we’d then clear the IndexedDB entry as well). We will also ensure the existing **manual Save/Load (Ctrl+S to download JSON, Ctrl+O to upload JSON)** still work, as those are for exporting to files – the new auto-save is a separate convenience for persistent local state.
* **Quota and Persistence:** Using IndexedDB typically gives us plenty of storage (several MB or more). However, browsers might evict stored data if space is low. As a best practice, we can call the Storage Manager API to request persistent storage for our PWA data. This is an optional enhancement: `navigator.storage.persist()` can ask the browser to treat our data as persistent (not to be wiped without user consent). This can further protect user diagrams from being purged by the UA in low-space scenarios.

## Non-Functional Requirements

* **Performance:** The PWA should load quickly and feel responsive. Thanks to caching, repeat visits (or launching the installed app) should be near-instant, as assets come from local cache. We will monitor bundle size and only cache what’s needed to keep the cache efficient. Write operations to IndexedDB will be asynchronous and likely negligible given the data size, but we will avoid any blocking calls on the main thread to keep the UI smooth.
* **Compatibility:** The solution will be tested on the latest versions of Chrome and Edge on Windows, and Chrome on macOS. It should also work on Firefox (Firefox supports service workers and manifest install, though with a slightly different install flow) – however, Firefox’s PWA install support on desktop is limited (no native install UI), but the offline functionality will still benefit Firefox users. Safari (desktop) now supports service workers and offline caching, but doesn’t yet allow desktop install of PWAs (Safari iOS does allow Add to Homescreen). Regardless, nothing in our implementation should break Safari; it will simply function as a normal website there. The app will also remain mobile-responsive and could be installed on mobile devices (e.g., Android Chrome). Mobile is not the primary target, but we get it as a bonus.
* **Security:** Continue to enforce usage of HTTPS and valid certificates (taken care of by Pages). The service worker will be restricted to the app’s scope and will only cache safe assets. We must be mindful of any sensitive data: in our case, user diagrams are stored locally; this is fine since it’s user content, but we will not store anything sensitive beyond that.
* **Reliability and Recovery:** Ensure that the app doesn’t end up in a broken state. For example, if the service worker caching goes awry (e.g., cache corruption or a bug in SW logic), we should have a strategy to recover – typically, the user can always do a hard refresh (`Ctrl+F5`) to bypass the SW and fetch fresh content. We will document this for troubleshooting. Also, implement SW with care to avoid the **“double-download”** problem (Workbox or Vite’s plugin will handle this by generating a precache manifest so we’re not caching the HTML that then caches itself infinitely). After updates, the new service worker should activate and old one retire without user confusion. Using Workbox’s default **stale-while-revalidate** strategy for updates can ensure the user gets new content on next load, or we might implement an in-app “New version available, refresh to update” prompt.
* **Maintainability:** The PWA features (manifest, SW, caching rules, auto-save) should be implemented in a clear, modular way so future developers can adjust them. For instance, the caching strategy and files to cache might be defined in one configuration area (especially if using the Vite PWA plugin, this is in `vite.config.ts`). The auto-save logic should be well-documented and perhaps configurable (if the project later introduces user accounts or cloud sync, they might revisit how local storage is used). We will also add documentation in the README or a separate doc explaining how to build/test the PWA and any quirks for deployment.

## Technical Approach

To implement the above requirements, we will use a combination of **standard PWA technologies** and integrate them with the existing React/Vite project:

* **Vite Plugin for PWA:** We will use the official Vite plugin `vite-plugin-pwa` to streamline the addition of the service worker and manifest. This plugin can auto-generate a service worker with Workbox under the hood and inject the manifest, requiring minimal configuration. It’s a zero-config solution that covers most PWA needs: offline caching, updating, and manifest injection. The plugin will be added to the Vite config, specifying details like the manifest JSON content (name, icons, etc.) and caching strategy. Using this plugin is a modern best practice for Vite projects, as it “adds a service worker that handles offline support, caching assets, and prompting users when new content is available”.

  * *Workbox:* Under the hood, Workbox (a library by Google for easy SW creation) will manage asset precaching and runtime caching. We’ll opt for the **`generateSW`** mode, which automatically lists the build assets to precache. We can customize the Workbox config via the plugin options (e.g., set `runtimeCaching` rules if needed for external resources, though currently not needed).
  * The plugin will also generate the manifest (or inject ours) and ensure it’s included in the build. This saves us from manually keeping a manifest file in sync.
* **Manual Service Worker (if needed):** If for any reason the Vite PWA plugin is insufficient (though unlikely), we could fallback to writing a custom `service-worker.js`. In that case, we’d implement the install, activate, and fetch event handlers ourselves (as illustrated in many PWA tutorials). We would then use Vite to copy this file to `dist` and register it. However, our preference is to use the plugin to reduce complexity and potential for errors. The plugin also provides good defaults, like immediately controlling the app on first load (via `clientsClaim`) and skipping waiting on updates, or showing an update prompt.
* **IndexedDB Integration:** We will use the modern IndexedDB API for saving diagram data. To simplify, we might use a tiny utility or an existing hook. One approach: create a React context or a custom hook that wraps IndexedDB operations (open database, read/write object store). The data to store can be just one object representing the diagram. For example, an object `{ rectangles: [...], appSettings: { ... }, timestamp: ... }` as already used in JSON export. On each relevant state change, we perform an `IDBObjectStore.put()` to upsert the object. On app launch, we do an `get()` to retrieve it.

  * We must handle the async nature – likely by initializing state only after data is loaded (show a loading spinner if needed very briefly). Since the data load will be quick (small data), this is usually seamless. We will ensure that this load doesn’t block the UI unnecessarily; perhaps show the canvas immediately and then overlay the saved diagram when ready, for better UX.
  * We will also consider error handling: if the DB is not accessible (e.g., in Safari Private mode, IndexedDB might fail), we should catch errors gracefully and perhaps fall back to no auto-save (with a console warning). In normal scenarios, this should not be an issue.
* **Testing Tools:** We will use **Chrome DevTools** extensively to test PWA functionality. This includes:

  * Using the **Application** tab to inspect the Service Worker status, the Cache Storage (to ensure assets are cached), and IndexedDB (verify our diagram data is stored).
  * Using the **Network** tab offline mode (toggle “Offline”) to simulate no internet and ensure the app still loads and works – the entire UI should come up and the last diagram should be present.
  * Running **Lighthouse** audits (in DevTools or using `npm run build` and then `npx serve` to serve `dist/` locally) to verify PWA criteria: Lighthouse will check for a manifest with correct fields, a service worker that intercepts requests, and offline functionality. We should aim for a 100% PWA Lighthouse score, which is achievable if all requirements are met (manifest, SW, proper responses offline).
  * Testing installation on desktop: we will manually install the PWA in Chrome/Edge and ensure the app launches correctly, with the icon and name looking correct, and that it persists data.
  * Cross-browser basic tests: ensure that non-Chrome browsers don’t break. For example, in Firefox the service worker will still cache and allow offline usage (though install is manual via menu), in Safari ensure no errors (though no install, just use as website).
* **Deployment Considerations:** After implementing, we will build the app (`npm run build`). The output should include our `manifest.webmanifest` and the service worker (likely `sw.js` or custom name if configured). Because our app is served from `/domain-designer/`, we’ll double-check that the service worker file is also served from the same scope. The Vite plugin will take care of scope if we set `base: '/domain-designer/'` in Vite config (which is already done for GitHub Pages). We need to ensure the registration path matches (probably `navigator.serviceWorker.register('/domain-designer/sw.js')` so it’s within scope).

  * We will ensure the GitHub Pages deployment (via GitHub Actions) includes the new files. Typically, the action simply deploys the `dist` folder to Pages – so as long as our files are there, it will work. We may need to add a `.nojekyll` (already likely handled) and ensure the manifest has the correct path references. For example, the manifest’s `start_url` and `scope` must include `/domain-designer/` prefix; icons paths should likely be absolute or prefixed as well. The Vite plugin typically handles this by using the `base` path in generating URLs. We will verify this by inspecting the built `manifest.webmanifest`.

## Implementation Plan and Task Breakdown

Below is a detailed, step-by-step plan to implement the PWA features in Domain-Designer. Each step is described in developer terms, covering from setup to deployment:

1. **Project Setup & Dependency Installation** – *Environment: Node 18+*

   * Ensure the development environment is up-to-date (Node.js 18+ as required by Vite 5 and the PWA plugin). Update dependencies if needed.
   * Install the Vite PWA plugin: run `npm install vite-plugin-pwa workbox-window` (the second package is optional, used if we want to listen to update events in the app). Add any other needed libraries, e.g. `idb` for IndexedDB if we choose to use it.
   * Create a branch for the PWA feature (for code review purposes) as per our Git workflow.

2. **Integrate Vite PWA Plugin** – *Manifest & SW generation*

   * Open `vite.config.ts`. Import the plugin: `import { VitePWA } from 'vite-plugin-pwa';`. In the Vite `defineConfig`, add `VitePWA({...})` to the plugins array.
   * Configure the plugin: Provide a `manifest` object with required properties (name, short\_name, start\_url, display, theme\_color, background\_color, icons). For icons, prepare PNG files (192x192 and 512x512) and place them in `public/` or reference them appropriately so they end up in `dist`. Example:

     ```js
     VitePWA({
       registerType: 'prompt' or 'autoUpdate',
       includeAssets: ['vite.svg'], // any static assets to include
       manifest: {
         name: 'Domain Designer',
         short_name: 'DomainDesigner',
         start_url: '/domain-designer/',
         scope: '/domain-designer/',
         display: 'standalone',
         theme_color: '#FFFFFF',
         background_color: '#FFFFFF',
         icons: [
           { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
           { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png' }
         ]
       }
     })
     ```

     Adjust colors and icon file names as decided. The `registerType` option can be `'autoUpdate'` for automatic SW updates, or `'prompt'` to allow controlling when to update (we might use autoUpdate for simplicity so the SW updates in background and activates when clients closed).
   * Set `workbox` options if needed: e.g., `workbox: { navigateFallback: '/domain-designer/index.html' }` to ensure SPA routing works (though our app doesn’t use client routing currently). The default offline strategy will precache all build assets, which is what we want. The plugin by default will also inject a `<link rel="manifest">` into our `index.html` and take care of SW registration script.
   * **Verify base path:** Ensure `base: '/domain-designer/'` is set in config (likely already done for GH Pages). This is crucial so that the service worker and manifest have the correct URLs on deployment.
   * Save the config and run `npm run build` to test. After build, check `dist/`: there should be `manifest.webmanifest` with our content, and a service worker file (maybe `sw.js`) and associated assets. We will tweak as necessary (for example, if the icons paths in manifest are not prefixed correctly, adjust them).

3. **Implement Service Worker Registration (if needed)** – *Double-check SW control*

   * By default, VitePWA plugin provides a script to auto-register the service worker. It uses a virtual module `import { registerSW } from 'virtual:pwa-register';`. We will use this in our app code. For example, in `main.tsx` (or `App.tsx`), add:

     ```ts
     import { registerSW } from 'virtual:pwa-register';
     registerSW({ immediate: true });
     ```

     This will register the generated `sw.js` file and start the service worker. The `{ immediate: true }` ensures it registers on page load without waiting for user interaction.
   * If not using the plugin’s register, manually register:

     ```js
     if ('serviceWorker' in navigator) {
       navigator.serviceWorker.register('/domain-designer/sw.js')
         .then(reg => console.log('SW registered scope:', reg.scope))
         .catch(err => console.error('SW registration failed:', err));
     }
     ```

     This code can run on window load. But using the plugin’s helper is fine and gives us ability to listen for update events easily (via `onNeedRefresh` and `onOfflineReady` callbacks, if we want to prompt user).
   * Build and run the dev server (`npm run dev`) to test in development. Note: The PWA plugin can simulate SW in dev, but often it only truly works after build (`npm run preview`). So we might need to build and serve `dist` to test the SW. We’ll do that to ensure registration works (check DevTools > Application > Service Workers to see if it’s active).

4. **Caching Strategy Validation** – *Ensure offline availability*

   * The generated SW will precache all static assets. We should verify that important files are indeed cached: open `dist/sw.js` (or a workbox manifest file) to see the list of URLs. It should include `index.html`, `assets/index.<hash>.js` (main bundle), CSS, etc. If anything critical is missing, adjust plugin config (e.g., add any extra assets or fallback).
   * No additional runtime caching routes are needed since no external fetches. But if, say, Google Fonts were used or any API, we’d configure those with Workbox runtime caching.
   * Test offline behavior: With the app open, use DevTools to go offline and refresh. The app should still load. If it doesn’t, investigate (maybe missing caching of some file). Also test that after an initial visit, you can fully close the browser and reopen at the URL (with no connection) and it still loads – that’s the ultimate proof of offline readiness.

5. **Implement Auto-Save to IndexedDB** – *Client-side data persistence*

   * Design the data schema: We can have an IndexedDB database named `DomainDesigner` and an object store `diagrams` (keyed by an ID or name). Since we only store one current diagram, we might use a fixed key (like key = `"current"`). Alternatively, use an object store with auto-increment and just use one record. For simplicity, we’ll likely store one record with key `"autosave"` or similar.
   * Use a library or direct API: If using `idb`, we can do:

     ```ts
     const db = await openDB('DomainDesignerDB', 1, {
       upgrade(db) { db.createObjectStore('diagrams'); }
     });
     // Save function
     await db.put('diagrams', diagramData, 'autosave');
     // Load function
     const saved = await db.get('diagrams', 'autosave');
     ```

     If not using a lib, use `indexedDB.open` and handle events (onupgradeneeded, on success). Given our data is simple, either approach is fine.
   * Integrate with React state: In the main component (e.g., `HierarchicalDrawingApp` or a higher App level), initialize state by attempting to load from IndexedDB. For example, on component mount, do `const saved = await loadDiagramFromDB(); if(saved) apply it to state`. This might involve calling `rectangleManager.setRectangles(saved.rectangles)` and applying saved settings. We must ensure this happens before the initial render of the canvas, or else quickly after (to avoid flashing an empty canvas). Using a React effect with an empty dependency array to load data on mount is appropriate (and render a loading indicator in the meantime if needed).
   * Hook into state changes: The `rectangleManager` or similar state container likely has a way to subscribe to changes. If not, we can use a React effect watching the rectangles state (perhaps `useEffect(() => { saveToDB(rectangles, settings); }, [rectangles, settings])`). We should also capture any global settings changes if we want to save those too (grid size, etc., as those affect layout). The idea is whenever the diagram changes, we persist it.
   * Throttling: Implement a debounce so we’re not writing on every tiny change continuously. For example, use `lodash.debounce` or a custom timer: if many changes occur (e.g., moving a shape triggers many state updates), wait a short moment after the last change before writing to IndexedDB. A 500ms or 1s debounce could work. This ensures we don’t flood the disk with writes while dragging, for instance.
   * Manual Save/Load integration: The existing Ctrl+S (export JSON) and Ctrl+O (import JSON) features will remain. But we might adjust the **Ctrl+O (Load)** to also put the loaded diagram into IndexedDB (so that if a user manually loads a file, that becomes the current state which we then autosave). Similarly, a user hitting **Ctrl+N** (if we implement a “new diagram” shortcut) could clear the autosave. We will update those parts of code accordingly, ensuring no conflict between manual and auto save.
   * Testing auto-save: In the browser, create or edit a diagram, open DevTools > Application > IndexedDB to see if the data appears. Try closing the tab and reopening (or doing a hard refresh without cache) – the content should reappear. Also test with offline: edit the diagram offline (should still work since no network needed), close tab, reopen offline – state should persist. This confirms our offline persistence end-to-end.
   * Error handling: Log any errors during DB operations to console for debugging. If a write fails (rare), the user still has manual save as fallback.

6. **UI/UX Enhancements for PWA** – *Nice-to-have improvements*

   * Add an **“Install App”** button or banner in the UI (optional). Although browsers show their own UI, an in-app prompt can be useful. We can detect the `beforeinstallprompt` event and, say, show a small alert or a button in the sidebar “Install Domain-Designer” which calls `event.prompt()` to open the install dialog. This can be implemented in a React component listening for that event.
   * Provide feedback for offline status: for example, if the app is offline (we can listen to `window.onoffline/online` events), we might show an icon or text “Offline Mode” so the user knows their connection status. This is not strictly required, but it can be reassuring in an offline-first app.
   * Provide feedback for auto-save: e.g., a small text “Saved” that appears in the toolbar when auto-save to IndexedDB completes. This is similar to how Google Docs shows “All changes saved”. It gives confidence that their work is not lost. This could be as simple as setting a state “lastSavedAt” and showing a message periodically.
   * Ensure the app’s design remains consistent in standalone mode. Possibly adjust some CSS if needed for PWA context (e.g., if we want more padding at top because of no browser bar, etc. Usually not needed). Also ensure the title bar color (theme\_color) works well – e.g., on Android the status bar will use it, on desktop Chrome the window border might use it.

7. **Testing & Quality Assurance** – *Verification of requirements*

   * **Automated Tests:** Update any test cases if present (though this project may not have a huge test suite beyond maybe lint/type checks). We might add a couple of unit tests for the persistence functions (if we can abstract them enough to test outside the browser, or use `jest-localstorage-mock` for localStorage if we go that route). For service worker, testing is mostly manual or via integration tests.
   * **Manual Testing Checklist:**

     * Installability: After deploying to a test environment or using `npm run preview`, use Chrome to verify that the install prompt appears. Check that after installation, the app opens in a separate window with no address bar. Verify the app icon and name appear correctly in the OS’s app launcher (Start menu or equivalent).
     * Offline startup: Close the installed app, turn off internet, re-open the app from the installed shortcut – it should launch and load the content (verify by seeing your last diagram).
     * Data persistence: Open app, make an edit, close the app completely, reopen – the edit should still be there. Do this both online and offline to ensure it’s truly stored locally.
     * Cross-browser: In Edge, the PWA should similarly be installable (Edge uses the same criteria as Chrome). In Firefox, no install UI but check that offline works (open, then offline refresh). In Safari desktop, add to Dock is not available, but ensure app still functions normally (no errors if service worker is slightly different – Safari has some quirks but by now it supports basic SW caching).
     * Regression testing: Confirm that exporting to PNG/SVG/PDF still works in the PWA context (they should, since those libraries use canvas and are independent of network). Also check all keyboard shortcuts in the installed app (they should behave the same).
   * **Lighthouse PWA Audit:** Run Lighthouse and ensure the score is high. It will check that: a manifest is present and has required fields (we should see all checkmarks for name, icons, start\_url, etc.), that a service worker controls the page and returns an offline response (we might test by emulating offline in Lighthouse). If anything fails (e.g., “start\_url not cached”), we’ll adjust caching to include it. Our goal is to see “PWA optimizations – passed” on all counts.

8. **Deployment to Production (GitHub Pages)** – *Release*

   * Merge the PWA feature branch into `main` after review. The CI/CD (GitHub Actions) will build and deploy to GitHub Pages. We need to verify after deployment that everything works on the live site:

     * Access [https://thomasrohde.github.io/domain-designer/](https://thomasrohde.github.io/domain-designer/) in an incognito window (to avoid any cached stuff). Check that the service worker registers (DevTools should show it). Try installing the PWA from there and test offline usage as done locally.
     * Verify the manifest is being served (it should be accessible at [https://thomasrohde.github.io/domain-designer/manifest.webmanifest](https://thomasrohde.github.io/domain-designer/manifest.webmanifest) – try opening that URL to see if JSON manifest loads). Also verify the Content-Type is correct (should be `application/manifest+json`; if not, Chrome might log a warning – if needed, rename to `.webmanifest` which we likely did).
     * Ensure the scope is correct: when installed from that URL, launching it should go to `/domain-designer/` and not some other scope. Also ensure refresh in the PWA doesn’t navigate out of scope (shouldn’t, given scope setting).
     * Check that our icons appear in the installed app (both in the OS and in the Chrome Apps UI). If not, we may need to adjust icon paths in manifest (e.g., maybe they need to be absolute URLs).
   * Monitor for any issues reported by users (if any beta testers). Particularly, if any user data loss issues or caching quirks are found, address them promptly.
   * Update documentation: add a section in README about “**Offline & PWA Usage**”, explaining that the app can be installed as a PWA and that it auto-saves work locally. Include instructions for installing (with screenshots for a typical browser maybe) and how to clear local storage if needed. This will help users take advantage of the new features and understand their benefits.

By following this implementation plan, we will transform Domain-Designer into a modern PWA that **works offline, saves data in-browser, and can be installed on desktops** for a more native-like experience. This aligns with current best practices for PWAs – adapt to all devices and network conditions, providing reliability and an app-like convenience. Once completed, Domain-Designer will offer its users seamless offline productivity and easy access, fulfilling the requirements outlined in this document.

**Sources:**

* Mozilla Developer Network – PWA Best Practices (Installability & Offline)
* Google Developers – PWA Install Criteria (Manifest Requirements)
* *web.dev* (Chrome Developers) – Offline Data Storage Options
* PixelFreestudio Tech Blog – Using IndexedDB in PWAs (advantages over localStorage)
* PixelFreestudio Tech Blog – Service Worker Caching Strategies (Cache-first vs Network-first)
* Vite PWA Plugin Documentation – Offline support via Workbox and integration guide
* CSS-Tricks – *“Making a Site Work Offline with VitePWA”* (overview of plugin capabilities)
* Domain-Designer Repository – Project structure and deployment context
* Domain-Designer Code – JSON export format (diagram data structure)
