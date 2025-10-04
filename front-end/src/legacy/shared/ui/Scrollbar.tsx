import React from 'react';
export default function Scrollbar({ children, style, ...rest }: any) {
  return <div style={{ overflow: 'auto', maxHeight: '100%', ...style }} {...rest}>{children}</div>;
}
