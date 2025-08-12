import { Icon } from '@iconify/react';

interface IconifyIconProps {
  icon: string;
  height?: number | string;
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const IconifyIcon = ({ icon, height = 20, width = 20, className, style, onClick }: IconifyIconProps) => {
  return (
    <Icon 
      icon={icon} 
      height={height} 
      width={width} 
      className={className}
      style={style}
      onClick={onClick}
    />
  );
};

export default IconifyIcon;