import React from 'react';
import Grid, { GridProps } from '@mui/material/Grid';

// Grid2 compatibility wrapper
// Converts Grid2's `size` prop to Grid's `xs`, `sm`, `md`, `lg`, `xl` props
interface Grid2Props extends Omit<GridProps, 'xs' | 'sm' | 'md' | 'lg' | 'xl'> {
  size?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

const Grid2 = React.forwardRef<HTMLDivElement, Grid2Props>((props, ref) => {
  const { size, ...otherProps } = props;
  
  // Convert size prop to individual breakpoint props
  const gridProps: GridProps = {
    ...otherProps,
    ...(size || {}),
  };
  
  return <Grid ref={ref} {...gridProps} />;
});

Grid2.displayName = 'Grid2';

export default Grid2;
