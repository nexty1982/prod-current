Below is a complete implementation for a GUI page to manage your React routes dynamically, along with the necessary backend route handler and updates to integrate it into your router.

---

## 1. Frontend: `src/app/(admin)/pages/routes-manager/page.jsx`
```jsx
import React, { lazy } from 'react';

// Auth Routes
const AuthSignIn = lazy(() => import("@/pages/auth/sign-in/page"));
const AuthSignUp = lazy(() => import("@/pages/auth/sign-up/page"));
const ResetPassword = lazy(() => import("@/pages/auth/reset-pass/page"));
const LockScreen = lazy(() => import("@/pages/auth/lock-screen/page"));

const initialRoutes = [
  {
    path: "/",
    name: "root",
    element: <LandingPageRedirect />,
  },
];
const generalRoutes = [
  {
    path: "/dashboard/analytics",
    name: "Analytics",
    element: <Analytics />,
  },
  {
    path: "/dashboard/ecommerce",
    name: "Ecommerce",
    element: <Ecommerce />,
  },
];

const customRoutes = [  
  {
    name: "Landing",
    path: "/pages/landing",
    element: <LandingPage />,
  },
  {
    name: "Calendar",
    path: "/pages/calendar",
    element: <Calendar />,
  },
  {
    name: "BaptismRecords",
    path: "/pages/baptismrecords",
    element: <BaptismRecordsPage />,
  },
  {
    name: "MarriageRecords",
    path: "/pages/marriagerecords",
    element: <MarriageRecordsPage />,
  },
  {
    name: "FuneralRecords",
    path: "/pages/funeralrecords",
    element: <FuneralRecordsPage />,
  },
  {
    name: "UserPermissions",
    path: "/pages/userpermissions",
    element: <UserPermissionsPage />,
  },
  {
    name: "SiteAdmin",
    path: "/pages/siteadmin",
    element: <SiteAdminPage />,
  },
  {
    name: "MenuSettings",
    path: "/pages/menusettingspage",
    element: <MenuSettingsPage />,
  },
  {
    name: "FAQs",
    path: "/pages/faqs",
    element: <FAQs />,
  },
  {
    name: "Timeline",
    path: "/pages/timeline",
    element: <TimelinePage />,
  },
  {
    name: "Pricing",
    path: "/pages/pricing",
    element: <Pricing />,
  },
  {
    name: "Error 404 Alt",
    path: "/pages/not-found-alt",
    element: <NotFoundAdmin />,
  },
  {
    name: "Widgets",
    path: "/widgets",
    element: <Widgets />,
  },
];

// Add the Routes Manager after declaration
customRoutes.push({
  name: 'Routes Manager',
  path: '/routes/manager',
  element: React.createElement(
    lazy(() => import('@/pages/routes/manager/page'))
  ),
});
```

## 2. Backend: `server/routes/routesConfig.js`
```js
import fs from 'fs';
import path from 'path';
import express from 'express';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse from '@babel/traverse';

const router = express.Router();
const routesFile = path.resolve(__dirname, '../src/routes/index.js');

// GET current routes
router.get('/', (req, res) => {
  const src = fs.readFileSync(routesFile, 'utf-8');
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
  let routes = [];

  traverse(ast, {
    VariableDeclarator({ node }) {
      if (node.id.name === 'appRoutes') {
        const arr = node.init.elements || [];
        routes = arr.map(elem => {
          const obj = {};
          elem.properties.forEach(p => {
            obj[p.key.name] = p.value.value;
          });
          return obj;
        });
      }
    }
  });
  res.json(routes);
});

// POST updated routes
router.post('/', (req, res) => {
  const newRoutes = req.body;
  let src = fs.readFileSync(routesFile, 'utf-8');
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });

  traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.name === 'appRoutes') {
        const elems = newRoutes.map(r => parse(`const x={name:'${r.name}',path:'${r.path}',element:<${r.element}/>};`).program.body[0].declarations[0].init);
        path.node.init.elements = elems;
      }
    }
  });

  const out = generate(ast, { retainLines: true }).code;
  fs.writeFileSync(routesFile, out);
  res.json({ status: 'ok' });
});

export default router;
```

## 3. Mount the new backend route in `server/index.js`
```diff
 // DYNAMIC ROUTE LOADING
 fs.readdirSync(routesDir)
   .filter(f => f.endsWith('.js'))
   .forEach(file => {
     const mod = require(path.join(routesDir, file));
     if (typeof mod === 'function') {
       console.log(`Mounting /api from ./routes/${file}`);
       app.use('/api', mod);
     } else {
       console.warn(`Skipping ./routes/${file}: module.exports is not a Router function`);
     }
   });
+// Add routes manager
+const routesConfig = require('./routes/routesConfig').default;
+app.use('/api/routes', routesConfig);
```

## 4. Frontend route registration in `src/routes/index.js`
```jsx
import React, { lazy } from 'react';

export const customRoutes = [
  // ...existing entries
];

// Add Routes Manager
customRoutes.push({
  name: 'Routes Manager',
  path: '/routes/manager',
  element: React.createElement(
    lazy(() => import('@/pages/routes/manager/page'))
  ),
});
```
