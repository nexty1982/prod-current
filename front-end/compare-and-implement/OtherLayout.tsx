import Preloader from "@/components/Preloader"
import type { ChildrenType } from "@/types/component-props"
import { Suspense } from "react"
import { Container, Row } from "react-bootstrap"

const OtherLayout = ({ children }: ChildrenType) => {
  return (
    <div className="authentication-bg">
      <div className="account-pages pt-2 pt-sm-5 pb-4 pb-sm-5">
        <Container>
          <Row className="justify-content-center">
            <Suspense fallback={<Preloader />}>{children}</Suspense>
          </Row>
        </Container>
      </div>
    </div>
  )
}

export default OtherLayout