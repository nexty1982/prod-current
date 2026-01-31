# Project Overview

This React + Vite template is a fully client-side front-end that uses Material-UI (MUI), React Router, Context API, MSW (Mock Service Worker), and a custom theme. There is no built-in backend; all API calls are mocked under `src/api/mocks`.

Below is in-depth documentation on how to:

1. **Install, build, and run the front-end**
2. **Understand the project structure**
3. **Modify and extend front-end components, layouts, and styling**
4. **Configure routing**
5. **Replace MSW mocks with real API calls**
6. **Integrate a Node.js/Express backend**
7. **Use environment variables for API endpoints**

---

## 1. Setup & Scripts

- **Install dependencies:**
  ```bash
  cd main
  npm install
  ```

- **Start development server with HMR:**
  ```bash
  npm run dev
  ```

- **Build for production:**
  ```bash
  npm run build
  ```

- **Preview production build:**
  ```bash
  npm run preview
  ```

- **Linting:**
  ```bash
  npm run lint
  ```

---

## 2. Project Structure

```
main/                      # project root
├─ public/                 # static assets (served at /)
│  ├─ logoIcon.svg
│  └─ mockServiceWorker.js # MSW runtime
├─ src/                    # application source
│  ├─ api/                 # mock & real API layers
│  │  ├─ mocks/handlers    # MSW handlers
│  │  └─ globalFetcher.js  # central fetch wrapper
│  ├─ assets/              # images, fonts, SVGs
│  ├─ components/          # reusable UI components (MUI wrappers)
│  ├─ context/             # React contexts (e.g. CustomizerContext)
│  ├─ layouts/             # layout templates (FullLayout, BlankLayout)
│  ├─ routes/              # router definitions (Router.js)
│  ├─ theme/               # MUI theme configuration (Theme.js)
│  ├─ utils/               # utilities (i18n, helpers)
│  ├─ views/               # page components (dashboard, apps, pages, charts)
│  ├─ App.jsx              # root component (ThemeProvider, RouterProvider)
│  └─ main.jsx             # entry (mounts React root after MSW setup)
├─ package.json            # project metadata & scripts
├─ vite.config.js          # Vite configuration
└─ README.md               # minimal template description
```

---

## 3. Front-end Customization

### 3.1 Themes & Styling

- **MUI Theme:** Edit `src/theme/Theme.js` to adjust primary/secondary colors, typography, breakpoints.
- **RTL / LTR:** Controlled by `CustomizerContext` in `src/context/CustomizerContext.jsx`. You can add new direction settings (e.g., vertical) and expose via the Customizer UI.
- **Global CSS:** `src/App.css` and `src/index.css` contain base styles. Augment or override here for global adjustments.

### 3.2 Layouts & Navigation

- **FullLayout vs BlankLayout:** Located in `src/layouts/full/FullLayout.jsx` and `src/layouts/blank/BlankLayout.jsx`. 
- **Shared Nav / Sidebar:** Modify `src/layouts/full/shared` components (header, sidebar, footer) to change menus, add links, or update icons.
- **Loadable wrapper:** The `Loadable` HOC in `src/layouts/full/shared/loadable/Loadable.jsx` handles code-splitting and skeletons. You can tweak fallback UI here.

### 3.3 Pages & Views

- **Routes:** In `src/routes/Router.js`. Add new pages by:
  1. `import YourPage from '../views/yourpath/YourPage'`
  2. Add a new route in the `createBrowserRouter` configuration.
- **Views folder:** Contains subfolders by feature (e.g., `dashboard`, `apps/chat`, `pages/authentication`). Build new page components under `src/views` following existing naming conventions.

### 3.4 Components

- **MUI Examples:** Under `src/components/material-ui`, you’ll find example wrappers (e.g., `MuiButton.js`). Copy or extend these when building new UI.
- **Utility Components:** You can create a new folder `src/components/common` for shared components (buttons, form controls).

---

## 4. API Layer & MSW Mocks

- **MSW Setup:** In `src/api/mocks/browser.js`. The `deferRender()` call in `main.jsx` starts `worker.start()` before mounting the app.
- **Handlers:** Edit `src/api/mocks/handlers/mockHandlers.js` to modify or extend mock endpoints.
- **Global Fetcher:** `src/api/globalFetcher.js` exports `get/post/put/delete` wrappers. It currently points to mock routes; you will repoint it to real backend URLs.

---

## 5. Integrating a Node.js Backend

### 5.1 Create the Backend

1. **Initialize Node.js project:**
   ```bash
   mkdir backend
   cd backend
   npm init -y
   npm install express cors dotenv
   ```
2. **Basic Express Server (`backend/index.js`):**
   ```js
   import express from 'express';
   import cors from 'cors';
   import dotenv from 'dotenv';

   dotenv.config();
   const app = express();
   app.use(cors({ origin: process.env.CLIENT_URL }));
   app.use(express.json());

   // Example API route
   app.get('/api/users', (req, res) => {
     res.json([{ id: 1, name: 'Alice' }]);
   });

   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
   ```

3. **Environment Variables:**
   - `CLIENT_URL=http://localhost:5173` (Vite default port)
   - Optional: database connection strings, API keys in `.env`

### 5.2 Front-end Integration

1. **Set API Base URL:**
   - Create `.env` in `/main`:
     ```ini
     VITE_API_BASE_URL=http://localhost:3000/api
     ```
   - Vite will inject env variables via `import.meta.env.VITE_API_BASE_URL`.

2. **Update globalFetcher:**
   ```js
   // src/api/globalFetcher.js
   const BASE = import.meta.env.VITE_API_BASE_URL;
   export async function get(path) {
     const res = await fetch(`${BASE}/${path}`);
     return res.json();
   }
   // similarly for post, put, delete
   ```

3. **Replace MSW mocks:**
   - Remove or bypass MSW start in `main.jsx`:
     ```diff
     - const { worker } = await import("./api/mocks/browser");
     - await worker.start({ onUnhandledRequest: 'bypass' });
     + // No MSW in production; remove mockServiceWorker registration
     ```

4. **Refactor API modules:**
   - For each feature in `src/api/*/*.js`, replace static mock data exports with calls to `globalFetcher`. E.g.:
     ```diff
     - import ProductsData from './ProductsData';
     + import { get } from '../globalFetcher';
     export function fetchProducts() {
   -   return ProductsData;
   +   return get('ecommerce/products');
     }
     ```

5. **Handle authentication (optional):**
   - If you require protected routes, send `fetch` with credentials or JWT headers:
     ```js
     export async function post(path, body) {
       const res = await fetch(`${BASE}/${path}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify(body),
         credentials: 'include'
       });
       return res.json();
     }
     ```

---

## 6. Building & Deployment

- **Front-end:** after `npm run build`, serve `dist/` via any static host (Nginx, Express static middleware).
- **Backend:** deploy Node.js to Heroku, DigitalOcean, or your server. Ensure CORS `CLIENT_URL` matches deployed front-end URL.

---

## 7. Extending & Maintenance

- **Adding New Routes/Pages:** Modify `src/routes/Router.js` and create matching view in `src/views`.
- **Updating Styling:** Amend MUI theme in `src/theme/Theme.js` or override styles at component level using MUI’s `styled` API.
- **New API Endpoints:** Add Express routes in `backend/index.js` (or split into modules under `backend/routes`), then update front-end API wrappers.
