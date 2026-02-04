import { Col, Row } from 'react-bootstrap'

import type { PageBreadcrumbProps } from '@/types/component-props'
import IconifyIcon from './wrappers/IconifyIcon'
import { Link } from 'react-router-dom'
import PageMetaData from './PageMetaData'

const PageBreadcrumb = ({ subName, title }: PageBreadcrumbProps) => {
  return (
    <>
      <PageMetaData title={title} />
      <Row>
        <Col xs={12}>
          <div className="page-title-box">
            <h4 className="mb-0">{title}</h4>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="">{subName}</Link>
                <span style={{ height: 24 }} className="d-inline-block">
                  <IconifyIcon icon="bx:chevron-right" className="mx-2" />
                </span>
              </li>
              <li className="breadcrumb-item content-none active">{title}</li>
            </ol>
          </div>
        </Col>
      </Row>
    </>
  )
}

export default PageBreadcrumb
