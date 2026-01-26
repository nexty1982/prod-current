import React from 'react';

interface ThemedLayoutProps {
  children: React.ReactNode;
  theme?: any;
}

const ThemedLayout = ({ children, theme }: ThemedLayoutProps) => {
  return (
    <div style={{ backgroundColor: theme?.backgroundColor || '#ffffff' }}>
      {children}
    </div>
  );
};

export { ThemedLayout };
