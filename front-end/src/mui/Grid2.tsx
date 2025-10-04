// front-end/src/mui/Grid2.tsx
// Grid2 shim for MUI v7 compatibility
// Re-exports the new Grid component as Grid2 to maintain existing code

import Grid, {
  gridClasses as muiGridClasses,
  type GridProps as MuiGridProps,
} from '@mui/material/Grid';

const Grid2 = Grid;
export default Grid2;

export type Grid2Props = MuiGridProps;
export const grid2Classes = muiGridClasses;
