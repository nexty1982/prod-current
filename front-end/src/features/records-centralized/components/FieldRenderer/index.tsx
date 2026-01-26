import React from 'react';

const FieldRenderer = ({ field, value, onChange }: any) => {
  return (
    <div>
      <label>{field.name}</label>
      <input 
        type="text" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default FieldRenderer;
