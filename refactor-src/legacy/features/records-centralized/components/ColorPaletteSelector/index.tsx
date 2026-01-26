import React from 'react';

interface ColorPaletteSelectorProps {
  selectedColor?: string;
  onColorChange?: (color: string) => void;
  colors?: string[];
}

const ColorPaletteSelector = ({ 
  selectedColor = '#000000', 
  onColorChange, 
  colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
}: ColorPaletteSelectorProps) => {
  return (
    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onColorChange?.(color)}
          style={{
            width: '30px',
            height: '30px',
            backgroundColor: color,
            border: selectedColor === color ? '2px solid #000' : '1px solid #ccc',
            cursor: 'pointer'
          }}
        />
      ))}
    </div>
  );
};

export default ColorPaletteSelector;
