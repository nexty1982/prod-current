import React from 'react';

interface RecordsSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export const RecordsSearch = ({ onSearch, placeholder = 'Search records...' }: RecordsSearchProps) => {
  return (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => onSearch?.(e.target.value)}
        style={{ padding: '8px', width: '200px' }}
      />
    </div>
  );
};
