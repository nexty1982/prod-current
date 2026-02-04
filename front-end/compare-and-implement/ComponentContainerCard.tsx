import clsx from 'clsx'
import { type ReactNode } from 'react'
import { Card, CardBody, CardTitle } from 'react-bootstrap'

type ContainerCardProps = {
  title: string
  id: string
  titleClass?: string
  description?: ReactNode
  children: ReactNode
}

const ComponentContainerCard = ({ title, id, description, children, titleClass }: ContainerCardProps) => {
  return (
    <Card>
      <CardBody>
        <CardTitle as={'h5'} className={clsx('anchor mb-1', titleClass)} id={id}>
          {title}
          <a className="anchor-link" href={`#${id}`}>
            #
          </a>
        </CardTitle>
        {description && <p className="text-muted">{description}</p>}
        {children}
      </CardBody>
    </Card>
  )
}

export default ComponentContainerCard
