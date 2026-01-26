import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Skeleton 
} from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Loading skeleton for records table
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 10, 
  columns = 8 
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableCell key={index}>
                <Skeleton animation="wave" width="100%" height={24} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton 
                    animation="wave" 
                    width={colIndex === 0 ? 60 : colIndex === 1 ? 120 : 100} 
                    height={20} 
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TableSkeleton;
