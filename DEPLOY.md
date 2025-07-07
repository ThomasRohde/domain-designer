Thanks! I’ll review the domain-designer repo to assess its current tech stack, structure, and functionality. Then I’ll outline a detailed, developer-ready plan for updating and publishing it as a GitHub Pages project under thomasrohde.github.io/domain-designer using best practices as of 2025. I’ll let you know as soon as the plan is ready.


# Plan to Publish **domain-designer** on GitHub Pages

## 1. Assessment of Current Repository Status

* **Tech Stack & Framework**: The **domain-designer** repository is a single-page **React 18** application written in **TypeScript**, built with the **Vite** bundler. The project uses **Tailwind CSS** for styling and likely employs utility-first styling with custom theme colors. The README confirms it's a “React+TypeScript application” and requires Node.js 16+ to run. Key dependencies include React and ReactDOM (v18), icons via **lucide-react**, and client-side export libraries **html2canvas** and **jspdf**. These allow exporting the diagram as PNG/SVG/PDF completely in-browser, meaning **no backend server** is required.

* **Project Structure**: The source code resides in the `src/` directory with an entry point at `src/main.tsx` mounting the app into an HTML root div. The main component (`App.tsx`) renders a higher-level `HierarchicalDrawingApp` component, which in turn composes the UI from numerous custom components (Toolbar, Canvas, Sidebar, etc. as seen in imports). Styling is managed via Tailwind (see `tailwind.config.js` with content paths configured). There is an `index.html` at the project root that loads the app – in development it pulls in `src/main.tsx` as a module. The project already defines useful scripts for development and building: e.g. `npm run dev` for a dev server, `npm run build` for production build, plus linting and type-checking scripts.

* **Build System**: The app uses **Vite (v5)** as the build tool. Vite’s config (`vite.config.ts`) includes the React plugin and is set to output files to the `dist/` directory on build. Sourcemaps are enabled in the current config for easier debugging. Vite will bundle the app into optimized static assets (HTML, JS, CSS) suitable for deployment. No explicit routing library (like React Router) is present, implying the app likely uses a **single page** with interactive UI (no multi-page routes to handle). This simplifies deployment because we don't need special routing fallbacks for multiple pages (the app will always serve `index.html` as the entry point).

* **Overall Suitability**: Because the app is purely client-side and outputs static files, it is well-suited for GitHub Pages hosting. All features (diagram editing, hierarchy management, **saving to JSON**, and **exporting to PNG/SVG/PDF**) are implemented in the browser (using the aforementioned libraries), so the deployed site will be fully functional as a self-contained web application with no server requirements. In summary, the repository is a typical modern React+TypeScript project with Vite, which we can prepare for static deployment on GitHub Pages.

## 2. Updates Required to Enable GitHub Pages Deployment

To prepare the project for GitHub Pages, a few configuration tweaks are needed so that the app will work when served from the URL `https://thomasrohde.github.io/domain-designer/` (note the **`/domain-designer/`** base path):

* **Configure Base Path**: Update the Vite config to set the correct base URL path for assets. GitHub Pages project sites are served from a subdirectory (the repository name) by default. In our case, all asset URLs should be prefixed with `/domain-designer/`. In `vite.config.ts`, add the `base` option to the exported config. For example:

  ```ts
  // vite.config.ts
  export default defineConfig({
    plugins: [react()],
    base: '/domain-designer/',  // <--- add this for GitHub Pages
    // ... rest of config ...
  });
  ```

  This ensures that the production build outputs links to JavaScript, CSS, and image assets with the `/domain-designer/` prefix. For instance, a script that might normally be referenced as `/assets/index.[hash].js` will be output as `/domain-designer/assets/index.[hash].js`, so that it loads correctly from the GitHub Pages URL. This step is crucial; **without the correct base, the app’s JS/CSS files may 404 on GitHub Pages**.

  *Advanced tip:* We can make the base path conditional so it doesn’t affect local dev. GitHub’s Pages Actions set an environment variable `GITHUB_PAGES=true` during the deploy run. We could leverage this: for example, `base: process.env.GITHUB_PAGES ? '/domain-designer/' : '/'`. This way, in development (`npm run dev` or local builds) the base will default to `'/'` (no subpath), but when the GitHub Actions deployment runs, it will automatically apply the `/domain-designer/` base. This conditional approach keeps local development paths simple while still producing correct URLs in production.

* **Asset Paths and Static Files**: Ensure any static asset references are compatible with the new base path. In `index.html`, the favicon is set as `<link rel="icon" href="/vite.svg" />`. The leading slash makes it absolute (root-relative), which would point to `https://thomasrohde.github.io/vite.svg` instead of the `domain-designer` subfolder – this would be wrong. After adding the base in Vite config, Vite will process `index.html` during build and should adjust such references. However, it's good to double-check: you might move `vite.svg` (or any static icons) into the `public/` directory and reference them by relative path so that Vite includes them. For example, put the SVG in `public/favicon.svg` and reference it as `<link rel="icon" href="favicon.svg" />`. This will ensure the icon is served correctly from the Pages site (Vite will copy `public/` files to `dist` unchanged, under the base path).

* **No Jekyll Interference**: Add an empty file named **`.nojekyll`** to the published output (the root of the `gh-pages` branch or the `docs/` folder, depending on deployment method). This tells GitHub Pages not to run Jekyll processing. This is important especially if any filenames in the build output start with an underscore or have other patterns Jekyll might ignore. Since our app is a static SPA and not Jekyll-based, we want to ensure all files are served as-is. Many deployment tools or actions add this automatically, but it’s good practice to include it to avoid any unexpected 404s due to Pages trying to treat the site as a Jekyll project.

* **Verify Single-Page App considerations**: As noted, the app does not appear to use client-side routing (no React Router). If that’s true, we don’t need a special fallback for routes. If in the future we add routes (for example, using React Router’s BrowserRouter), we would need to handle direct page loads (refreshes) on deep routes. In a GitHub Pages context, one common solution is to add a custom `404.html` that redirects to `index.html` for unknown routes, or to use hash-based routing. Another approach is setting a basename in the router to match the repo name (e.g., `<BrowserRouter basename="/domain-designer">`), as pointed out in deployment guides. For now, with a single-page application that always loads index.html, we’re okay. Just keep this in mind if multi-page routing is introduced later.

* **Ensure Production Readiness**: No other major code changes are required for Pages. The app already handles state in-browser (using hooks and context) and saves files via the browser’s file APIs (e.g., creating download links for JSON, PNG, etc.). These will work on GitHub Pages since it’s just static hosting. We should, however, test the production build locally after setting the base path. Run `npm run build` and then either use `npm run preview` or serve the `dist/` folder locally (using a tool like `npx serve`) to confirm that the app works with the `/domain-designer/` prefix (check that CSS and JS load and that interactions like save/export still function). This local test will catch any path issues early.

## 3. Step-by-Step Setup of GitHub Pages Deployment

Next, we need to **publish** the site on GitHub Pages. We have a few options for how to host the built files on Pages:

**Option A: Deploy using the `docs/` folder (simplest, but manual)** – You could build the app and commit the contents of `dist/` into a `docs` directory on the `main` branch. GitHub Pages can be configured to serve from the `/docs` folder on the main branch. This approach is simple but not very clean: it mixes generated files with source files in the repo, and you'd need to remember to rebuild and recommit on updates.

**Option B: Use a separate `gh-pages` branch (manual or via script)** – A common pattern is to keep the compiled site on a separate branch. We could run the build and then push the `dist/` contents to a branch named `gh-pages`. The repository settings can be set to deploy Pages from the **gh-pages branch**. You can do this push manually or use an npm package like `gh-pages` to automate it (as in many tutorials). For instance, adding a script `"deploy": "gh-pages -d dist"` will publish the `dist` folder to the gh-pages branch for you. If this method is used, after running `npm run deploy` the first time, you must go to the repository **Settings > Pages** and set the source to the `gh-pages` branch (with root folder). Once configured, the site will be live at the URL. However, one drawback: if you use the default GitHub token in Actions to push to `gh-pages`, GitHub Pages might not auto-publish that push (GitHub has a rule that Actions using `GITHUB_TOKEN` won't trigger Pages build by default). There are workarounds (using a deploy key or a special Action), which leads us to the recommended approach.

**Option C: Use GitHub Actions for automated Pages deployment (recommended)** – The best practice in 2025 is to set up **continuous deployment** using GitHub Actions. This way, every time you push changes to the main branch (or when you want to release), the site is rebuilt and published automatically, without manually running deploy commands. GitHub now provides an official Actions workflow for Pages that handles the publish step for you using a special Pages **artifact** and deploy step. We will detail the CI/CD setup in the next section, but at a high level:

* We create a GitHub Actions workflow that triggers on pushes to the `main` branch.
* The workflow will install dependencies, run tests/build, then upload the `dist/` folder as a Pages artifact, and finally use the **GitHub Pages Deploy** action to publish that artifact.
* This avoids the need to manually handle the `gh-pages` branch. In fact, after the first deployment, GitHub will manage the Pages content internally (you don't even need a visible `gh-pages` branch unless you want one – the action can deploy without it, using an internal deployment mechanism).
* We should go to **Settings > Pages** and ensure the Pages source is set to **GitHub Actions** (this option tells GitHub we will deploy via workflow, not via branch directly). If the interface doesn’t explicitly have "GitHub Actions" as a choice, it may simply show that the site is being deployed from the `github-pages` environment once we use the Actions workflow.

**Step-by-Step Deployment using GitHub Actions (Option C)**:

1. **Create the GitHub Pages workflow**: In the repository, create a new file `.github/workflows/pages-deploy.yml` (for example). This YAML will define two jobs: one to build the project, and one to deploy to Pages. See Section 5 for details on the CI/CD configuration. Make sure to include the proper permissions and environment settings (Pages deployments require the workflow to have `pages: write` and `id-token: write` permissions, and use the `github-pages` environment).

2. **Configure Pages settings**: Go to **Repository Settings > Pages**. Select **Source: GitHub Actions** (or if using the branch approach, Source: gh-pages branch). If using the Actions method, GitHub will listen to our workflow deploying to the `github-pages` environment. The first successful run of the deployment workflow will generate a Pages deployment. Ensure the **branch protection rules** (if any) allow the workflow to run on main or your deployment branch.

3. **Commit and push** the changes:

   * The updated `vite.config.ts` (with base path) and any other config changes from Step 2.
   * The new GitHub Actions workflow file.
   * Possibly an updated README (we'll handle docs in section 6).
     Push these changes to the `main` branch. This push will trigger the Actions workflow.

4. **Monitor the Action run**: On GitHub, check the **Actions** tab to see the workflow executing. The build job should install dependencies and produce the `dist/` folder. Then the deploy job will upload the artifact and publish to Pages. If everything is configured correctly, the action will complete successfully. (If it fails, inspect logs – common mistakes are forgetting to set the base path, or not having Pages enabled. Fix any issues and re-run.)

5. **Verify the live site**: Once the workflow passes, go to **[https://thomasrohde.github.io/domain-designer/](https://thomasrohde.github.io/domain-designer/)** in your browser. You should see the app load (the toolbar, canvas, etc.). Test key functionality in the live environment:

   * Create some rectangles, nested rectangles, etc., to ensure the interactive parts work.
   * Use the **Save** (Ctrl+S) to download a JSON and verify it downloads.
   * Try **Export to PNG/PDF** to ensure the html2canvas/jsPDF functionalities work in production. (They should, since they are client-side – check that the downloads initiate properly).
   * Check that the category colors and styling look correct (to confirm Tailwind CSS built correctly and all assets loaded).
   * If anything is not working (e.g., missing styles or broken links), that likely indicates a misconfiguration of paths or a file not deployed. Address any such issues locally (for example, if CSS is missing, maybe Tailwind wasn’t built or included – but in our case it should be part of the bundle). Then rebuild and redeploy via Actions as needed.

By the end of this step, the application should be live on GitHub Pages, served at the `/domain-designer` path, with full functionality available to end users.

## 4. Build Configuration and Optimization for Production

Building for production should follow modern best practices to ensure the app is fast and efficient. **Vite** already handles much of this out-of-the-box, but we will double-check and tune anything necessary:

* **Production Build Script**: The project’s build script (`npm run build`) runs TypeScript type-checking (`tsc`) and then invokes Vite to bundle the app. Vite will produce a production-ready bundle in the `dist` directory, with minified JS/CSS. We should run this in a production mode (by default, `vite build` does this). Ensure that the Node environment is set to production when building (GitHub Actions does this automatically for `push` events, and Vite will assume prod mode for build, so this is usually fine). The output will include an `index.html` referencing hashed asset files (for cache busting).

* **Minification & Tree-Shaking**: Vite uses Rollup under the hood and **esbuild** for JS transpilation/minification, so unused code is removed and the output JS is minified by default. Verify that the `vite.config.ts` doesn't disable minification. Currently, the config explicitly enables source maps in production. Source maps are useful for debugging in production, but if file size is a concern, you can disable them (`sourcemap: false` for the build) for a smaller footprint. Given this is a user-facing app and not extremely large, leaving source maps on is fine (they will be uploaded to Pages but not served unless someone manually finds them). For a slight optimization, you could turn them off in the final build to reduce the number of files published.

* **Tailwind CSS optimization**: The Tailwind configuration is set up to scan all source files and purge unused styles. In production, Tailwind will automatically drop any CSS classes not used in `index.html` or `src/**/*.{js,ts,jsx,tsx}`. This keeps the CSS bundle minimal. We should ensure we run the build in NODE\_ENV=production so that Tailwind enables purge. Vite’s default build process will set `process.env.NODE_ENV` to "production", so we’re covered. The final CSS will be minified and contain only the styles actually used in the UI.

* **Static Asset Handling**: Any images or static assets should be optimized. Currently, the app seems to mainly use vector graphics (the `vite.svg` icon) and Tailwind for design, so there may not be large images to compress. If in the future you add images (like logos or background images), consider optimizing them (using modern formats like WebP/AVIF for photos, or SVG for illustrations) and let Vite handle copying them to `dist`. Vite will hash filenames for cache-busting. GitHub Pages will serve these static files, and since they have unique hashes, browsers can cache them long-term — a user will fetch new files only when you deploy a new version (a best practice for front-end performance).

* **Bundle Splitting**: Check if any very large libraries can be lazy-loaded. For example, **html2canvas** and **jspdf** are used for exporting. These libraries might add significant weight to the bundle. If export functionality is not used frequently by all users upfront, we could load them on demand. Right now, `exportUtils.ts` imports them at the top, meaning they will be part of the main bundle. An optimization would be to refactor export logic to dynamically import these libraries when needed, e.g. inside the `handleExport` callback. For instance:

  ```js
  const handleExport = async (options) => {
    if (!containerRef.current) return;
    const [html2canvas, jsPDF] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);
    // ... then use html2canvas.default(...) and jsPDF.default(...) for export ...
  };
  ```

  This way, the \~300KB (just as an example) of PDF/canvas libraries are not loaded until the user actually triggers an export. This improves initial load time. While this code change is optional, it is a 2025 best-practice to **code-split** heavy optional features for performance. If implementing this, test thoroughly that exports still work.

* **Testing and Performance Audit**: After building, it’s wise to do a quick performance audit. Use tools like Chrome DevTools Lighthouse or WebPageTest on the deployed site to ensure the site loads fast. The app should be quite lightweight (mostly simple shapes and text, with no huge third-party data pulls). The biggest files will likely be the JS bundle. Thanks to Vite and modern bundling, the app should load quickly. If any performance issues are detected, consider techniques like preloading critical assets or further splitting code. Also verify that the site works on various devices/browsers (especially the drag-drop and canvas functionality).

* **SEO and Metadata**: Though this is an interactive app (and SEO is not a primary concern since it’s not content-heavy), make sure basic metadata is set. The `<title>` is already set to "Hierarchical Drawing Program". We might add a `<meta name="description" ...>` in `index.html` describing the app, so that when the site is shared or if someone finds it via search, it has a meaningful description. Also ensure the favicon link is correct (addressed in the base path step above). These little touches are good practice for a polished deployment.

In summary, the build process largely can remain as-is (with possibly a minor config tweak for base path). Vite will handle bundling, minification, and Tailwind CSS purging. We just have to be mindful of asset paths and consider advanced optimizations like code-splitting for large libs. The result will be an optimized static bundle ready for GitHub Pages.

## 5. CI/CD Automation with GitHub Actions (Continuous Deployment)

To streamline deployment, we will set up a **Continuous Integration/Continuous Deployment (CI/CD)** pipeline using **GitHub Actions**. This ensures that every change to the codebase can be automatically tested and deployed to GitHub Pages, so the live site is always up-to-date with the main branch.

**Key points for the CI/CD setup**:

* **Workflow Trigger**: We want to deploy on push to the `main` branch (you could also trigger on pull request merges or releases, but push to main is simplest if main is the stable branch). So our workflow YAML will use `on: push` (with branch filter for main).

* **Node Environment**: Use the latest LTS Node.js in 2025 (Node 18 or Node 20). The Actions step `actions/setup-node` will be configured to use a specific Node version. We’ll also enable dependency caching to speed up installs (GitHub Actions supports caching `node_modules` via `setup-node` or a separate cache action).

* **Install & Build Job**: The first job ("build") will:

  1. Check out the repository code: `actions/checkout@v3`.
  2. Set up Node: `actions/setup-node@v3` with `node-version: 20` (for example) and `cache: 'npm'` to cache dependencies.
  3. Install dependencies: `npm ci` (which uses the lockfile for deterministic install).
  4. Run linting and type-checking: `npm run lint && npm run typecheck`. This ensures code quality. If either fails, the workflow will stop and not deploy (so we don't publish broken code).
  5. Run the build: `npm run build`. This produces the `dist/` folder with the static site.
  6. Upload the build artifact: Use `actions/upload-pages-artifact@v1` to package the `dist` folder for deployment. (By default, this action names the artifact "github-pages", which the deploy step will look for.)

* **Deploy Job**: The second job ("deploy") will depend on the successful completion of the build job (`needs: build`). This job will:

  1. Set appropriate permissions for deployment: we give it `permissions: pages: write` and `id-token: write` so it can publish to Pages. (These permissions allow the action to make a Pages deployment and to authenticate to GitHub’s servers.)
  2. Specify the deployment **environment** as GitHub Pages: `environment: name: github-pages`. (This is a special environment that GitHub recognizes for Pages. It will also automatically set the environment URL to the final Pages URL.).
  3. Use the deploy action: include a step using `actions/deploy-pages@v4` (the latest version as of 2025) to actually deploy. This action will take the artifact from the previous job and publish it to GitHub Pages hosting. We give this step an `id: deployment` so we can reference outputs (like the published URL if needed). The action will handle either creating or updating the `gh-pages` branch (or an internal Pages deploy) as needed. After this step, GitHub Pages will start serving the new version of the site.

* **Workflow YAML Example**: Below is a **sample** workflow configuration encapsulating the above (to be placed in `.github/workflows/deploy.yml`):

  ```yaml
  name: Deploy to GitHub Pages
  on:
    push:
      branches: [ "main" ]
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: "20"
            cache: "npm"
        - run: npm ci
        - run: npm run lint && npm run typecheck
        - run: npm run build
        - name: Upload artifact
          uses: actions/upload-pages-artifact@v1
          with:
            path: "./dist"
    deploy:
      runs-on: ubuntu-latest
      needs: build
      permissions:
        pages: write      # allow deployment to Pages
        id-token: write   # allow OIDC token for authentication
      environment:
        name: github-pages    # target the GitHub Pages environment
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - name: Deploy to GitHub Pages
          id: deployment
          uses: actions/deploy-pages@v4   # publish the artifact to Pages
  ```

  This workflow first builds and tests the app, then publishes it. Using the official `deploy-pages` action means we don't need to manually push to a branch or deal with access tokens. GitHub handles the deployment internally (the result is similar to having a `gh-pages` branch served, but using the `github-pages` environment is more secure and integrated).

* **Best Practices**:

  * We included linting and type-checking in CI: this helps catch errors early. You might also add any unit tests (if present) in the build job (e.g., `npm test`). Currently, it looks like we rely on manual testing and type safety; adding tests in the future would be good and can integrate here.
  * The `cache: 'npm'` setting saves and restores `~/.npm` cache across builds, significantly speeding them up, which is valuable for frequent deployments.
  * Only deploy after a successful build/test. The `needs: build` ensures that if the build fails, the deploy job is skipped.
  * Use the `$GITHUB_TOKEN` provided by Actions (the deploy-pages action uses it by default) – this token has the necessary rights and is short-lived, and using it is more secure than adding a personal access token secret.
  * Once this is set up, every push to main will go through CI. If main is protected, you might run the workflow on pull request branches for testing (without the deploy step) and then let it deploy on merge to main. This ensures only vetted code gets deployed.
  * Monitor the Pages deployment status in the repository "Environments" section or the Pages settings. GitHub will show if a deployment is active or if there were errors. Typically, if the Actions workflow passes, the site should update within seconds.

* **Continuous Deployment in Action**: After this, you no longer need to manually trigger deployments. Developers can focus on code; when changes are pushed, the site updates. This reduces the chance of forgetting to deploy or deploying the wrong version. It also makes rollbacks easier – you can revert a commit and the pipeline will deploy the prior version again. Each deployment is tied to a git commit (you can even use GitHub's Pages history or environment history to see when and what was deployed).

In summary, GitHub Actions will provide a robust CI/CD pipeline: test the code, build the app, and deploy to Pages, all automatically. This aligns with 2025 best practices for DevOps even for front-end projects.

## 6. Documentation and README Updates

Finally, we should update project documentation to reflect the new deployment and any changes made during this process:

* **Add Project Website Link**: In the README, prominently add the link to the live GitHub Pages site. For example, near the top, you might include: “**Live Demo**: Available at [https://thomasrohde.github.io/domain-designer/”](https://thomasrohde.github.io/domain-designer/”). This lets users and contributors quickly find the running application. You can even add a badge or screenshot of the app in the README to showcase it.

* **Update Usage/Deployment Instructions**: Since the app is now on GitHub Pages, mention that **GitHub Pages hosts the app**, and describe the deployment method. For instance, under a new **Deployment** section, explain that the site is deployed via GitHub Actions on each push to main (so contributors should generally not need to deploy manually). If you decided to include a manual deploy script (like using `gh-pages` npm package) you could mention how to use `npm run deploy`, but if we're fully automated, it's not necessary for contributors to run that. Instead, document the CI: “This project uses GitHub Actions to auto-deploy the latest version to GitHub Pages. Any push to the main branch will trigger a deployment.” This transparency helps future maintainers.

* **Prerequisites**: If we bumped the Node version for development (for example, recommending Node 18+ now), update the prerequisites in README (it currently says "Node.js 16+"). Keeping this up-to-date ensures new developers have the right setup.

* **Development vs Production**: Emphasize that the base URL is configured for GitHub Pages but does not affect development. For example, you might note: “In development, simply run `npm run dev` and access the app at [http://localhost:3000](http://localhost:3000) (no special path needed). In production, the app is served under `/domain-designer/` – this is handled by the build config automatically.” This can prevent confusion if someone sees the base path in code and wonders about it.

* **README Content**: The README already has excellent sections on features, usage, and architecture. We should add to the **Getting Started** or **Installation** section instructions on how to build and preview the production version, e.g., `npm run build` and `npm run preview` to test the static build locally. Also, under **Contributing**, note that deployment is automated, but if the contributor wants to test Pages locally, they can use `vite preview` or a tool like `http-server` on the dist folder.

* **License and Attribution**: No changes needed there (the project is MIT licensed). But if we used any GitHub Actions from the community (like the `deploy-pages` action), it's good to mention them in passing (perhaps in the workflow file or docs) just for credit, though not strictly required.

* **Changelog/Release Notes**: If your project maintains a CHANGELOG, note the addition of GitHub Pages deployment and any version bumps (like dependencies) done as part of this update. This context is useful for users to know the project is now accessible online and easier to try out.

* **Ensure accuracy**: Double-check that any code snippets or commands in the README are still correct after our changes. For example, if we added a `homepage` field in `package.json` (common in Create React App, though not required for Vite), ensure it’s accurate. Adding `"homepage": "https://thomasrohde.github.io/domain-designer/"` to package.json can be done as a courtesy (it’s not used by Vite, but documents the intended deployment URL and can help some tools or scripts). If you add it, mention it in the documentation or commit message.

* **Project Status**: You might also add a note that the project is in a published state and invite feedback. If the app is experimental or under development, clarify that even though it's on Pages, it's not yet version 1.0 (if that’s the case). Since the version in package.json is 1.0.0, you could announce that v1.0 is live on Pages.

In essence, make sure the README reflects that:

* The app can be accessed on GitHub Pages (provide URL).
* Deployment is automated (no need for readers to manually deploy, but they can fork and set up their own Pages if they wish).
* Any new setup steps (none for basic usage, but for development Node version or commands) are updated.

By updating documentation, we ensure that other developers (or even your future self) can easily understand how the project is built and deployed. This completes the process: not only is the project now live and following best practices, but it’s also well-documented for maintainers and users.
