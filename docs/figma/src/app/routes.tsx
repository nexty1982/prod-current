import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Tour from "./pages/Tour";
import Samples from "./pages/Samples";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/about",
    Component: About,
  },
  {
    path: "/pricing",
    Component: Pricing,
  },
  {
    path: "/tour",
    Component: Tour,
  },
  {
    path: "/samples",
    Component: Samples,
  },
  {
    path: "/contact",
    Component: Contact,
  },
  {
    path: "/blog",
    Component: Blog,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "*",
    Component: NotFound,
  },
]);