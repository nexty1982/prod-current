import { lazy, Suspense } from "react"
import FallbackLoading from "@/components/FallbackLoading"
import Footer from "@/components/layout/Footer"
import Preloader from "@/components/Preloader"
const Topbar = lazy(() => import('@/components/layout/Topbar'))
const LeftSideBar = lazy(() => import('@/components/layout/LeftSideBar'))
import type { ChildrenType } from "@/types/component-props"

const AdminLayout = ({ children }: ChildrenType) => {
  return (
    <div className="wrapper">
      <Suspense fallback={<FallbackLoading />}>
        <Topbar />
      </Suspense>

      <Suspense fallback={<FallbackLoading />}>
        <LeftSideBar />
      </Suspense>

      <div className="page-content">
        <div className="container-fluid">
          <Suspense fallback={<Preloader />}>{children}</Suspense>

          <Footer />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout