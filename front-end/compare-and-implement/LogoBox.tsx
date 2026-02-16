import clsx from 'clsx'

import type { LogoBoxProps } from '@/types/component-props'

import logoDark from '@/assets/images/logo-dark.png'
import logoLight from '@/assets/images/logo-light.png'
import logoSm from '@/assets/images/logo-sm.png'
import { Link } from 'react-router-dom'

const LogoBox = ({ className, smLogo, largeLogo }: LogoBoxProps) => {
  return (
    <div className={clsx('logo-box', className)}>
      <Link to="/" className="logo-dark">
        <img src={logoSm} height={smLogo?.height ?? 24} width={smLogo?.width ?? 24} className={clsx('logo-sm', smLogo?.className)} alt="logo sm" />
        <img src={logoDark} width={largeLogo?.width ?? 96} height={largeLogo?.height ?? 22} className={largeLogo?.className} alt="logo dark" />
      </Link>
      <Link to="/" className="logo-light">
        <img src={logoSm} height={smLogo?.height ?? 24} width={smLogo?.width ?? 24} className={clsx('logo-sm', smLogo?.className)} alt="logo sm" />
        <img src={logoLight} width={largeLogo?.width ?? 96} height={largeLogo?.height ?? 22} className={largeLogo?.className} alt="logo light" />
      </Link>
    </div>
  )
}

export default LogoBox
