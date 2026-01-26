import React from 'react';

const ColorPickerPopover = ({ color, onChange }: any) => {
  return (
    <div>
      <input 
        type="color" 
        value={color || '#000000'} 
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default ColorPickerPopover;
