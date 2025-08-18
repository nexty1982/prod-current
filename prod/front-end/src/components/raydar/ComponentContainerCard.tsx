import clsx from 'clsx'
import { type ReactNode } from 'react'
import { Card, CardContent } from '@mui/material'

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
      <CardContent>
        <h5 className={clsx('anchor mb-1', titleClass)} id={id}>
          {title}
          <a className="anchor-link" href={`#${id}`}>
            #
          </a>
        </h5>
        {description && <p className="text-muted">{description}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

export default ComponentContainerCard