import React from 'react';

interface TableControlPanelProps {
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onAdd?: () => void;
}

const TableControlPanel = ({ onRefresh, onExport, onImport, onAdd }: TableControlPanelProps) => {
  return (
    <div style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px' }}>
      <h4>Table Control Panel</h4>
      <div style={{ display: 'flex', gap: '10px' }}>
        {onRefresh && <button onClick={onRefresh}>Refresh</button>}
        {onExport && <button onClick={onExport}>Export</button>}
        {onImport && <button onClick={onImport}>Import</button>}
        {onAdd && <button onClick={onAdd}>Add Record</button>}
      </div>
    </div>
  );
};

export default TableControlPanel;
