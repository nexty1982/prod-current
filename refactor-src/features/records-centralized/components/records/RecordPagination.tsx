import React from 'react';
import { Pagination as BootstrapPagination } from 'react-bootstrap';

/**
 * Component for record pagination
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordPagination = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Calculate page range to display
  const getPageRange = () => {
    const delta = 2; // Number of pages to show before and after current page
    const range = [];
    const rangeWithDots = [];
    
    // Always include first page
    range.push(1);
    
    // Calculate range of pages to show
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }
    
    // Always include last page
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    // Add dots where needed
    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          // If there's only one page missing, show it instead of dots
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          // If there's more than one page missing, show dots
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    
    return rangeWithDots;
  };

  return (
    <BootstrapPagination size="sm" className="mb-0">
      <BootstrapPagination.First 
        onClick={() => onPageChange(1)} 
        disabled={currentPage === 1}
      />
      <BootstrapPagination.Prev 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
      />
      
      {getPageRange().map((page, index) => (
        page === '...' ? (
          <BootstrapPagination.Ellipsis key={`ellipsis-${index}`} disabled />
        ) : (
          <BootstrapPagination.Item
            key={page}
            active={page === currentPage}
            onClick={() => onPageChange(page)}
          >
            {page}
          </BootstrapPagination.Item>
        )
      ))}
      
      <BootstrapPagination.Next 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
      />
      <BootstrapPagination.Last 
        onClick={() => onPageChange(totalPages)} 
        disabled={currentPage === totalPages}
      />
    </BootstrapPagination>
  );
};

export default RecordPagination;