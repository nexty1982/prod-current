import { ElementType, ReactNode } from 'react'

interface SpinnerProps {
  tag?: ElementType
  className?: string
  size?: 'lg' | 'md' | 'sm'
  type?: 'bordered' | 'grow'
  color?: string
  children?: ReactNode
}

const Spinner = ({ tag = 'div', type = 'bordered', className, color, size, children }: SpinnerProps) => {
  const Tag: ElementType = tag || 'div'

  return (
    <Tag
      role="status"
      className={`${type === 'bordered' ? 'spinner-border' : type === 'grow' ? 'spinner-grow' : ''} ${color ? `text-${color}` : 'text-primary'} ${size ? 'avatar-' + size : ''} ${className}`}>
      {children}
    </Tag>
  )
}

export default Spinner
