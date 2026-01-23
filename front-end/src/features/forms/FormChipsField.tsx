import React, { useState, KeyboardEvent } from 'react';
import { Box, Chip, TextField } from '@mui/material';
import { useField } from 'formik';

interface FormChipsFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  showError?: boolean;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  // Serialization format for backend (default: join with "; ")
  serializeFormat?: (chips: string[]) => string;
}

export const FormChipsField: React.FC<FormChipsFieldProps> = ({
  name,
  label,
  placeholder = 'Type a name and press Enter or comma',
  showError = true,
  required = false,
  disabled = false,
  helperText,
  serializeFormat = (chips) => chips.join('; '),
}) => {
  const [field, meta, helpers] = useField(name);
  const { touched, errors } = meta;
  const { setValue, setTouched } = helpers;
  const [inputValue, setInputValue] = useState('');

  // Parse the current value - could be a string (from backend) or array
  const getChipsArray = React.useCallback((): string[] => {
    if (!field.value) return [];
    if (Array.isArray(field.value)) return field.value;
    // If it's a string, split by common delimiters
    if (typeof field.value === 'string') {
      return field.value
        .split(/[;,]/)
        .map((chip) => chip.trim())
        .filter((chip) => chip.length > 0);
    }
    return [];
  }, [field.value]);

  const [chips, setChips] = useState<string[]>(getChipsArray());

  // Update chips when field value changes externally
  React.useEffect(() => {
    const newChips = getChipsArray();
    if (JSON.stringify(newChips) !== JSON.stringify(chips)) {
      setChips(newChips);
    }
  }, [field.value, getChipsArray, chips]);

  const handleAddChip = (chipValue: string) => {
    const trimmed = chipValue.trim();
    if (trimmed && !chips.includes(trimmed)) {
      const newChips = [...chips, trimmed];
      setChips(newChips);
      // Serialize for backend
      setValue(serializeFormat(newChips));
      setInputValue('');
      setTouched(true);
    }
  };

  const handleDeleteChip = (chipToDelete: string) => {
    const newChips = chips.filter((chip) => chip !== chipToDelete);
    setChips(newChips);
    setValue(serializeFormat(newChips));
    setTouched(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (inputValue.trim()) {
        handleAddChip(inputValue);
      }
    } else if (event.key === 'Backspace' && inputValue === '' && chips.length > 0) {
      // Remove last chip on backspace when input is empty
      handleDeleteChip(chips[chips.length - 1]);
    }
  };

  const handleBlur = () => {
    // Add chip if there's input value on blur
    if (inputValue.trim()) {
      handleAddChip(inputValue);
    }
    setTouched(true);
    field.onBlur({ target: { name } } as any);
  };

  return (
    <Box>
      <TextField
        label={label}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        error={showError && touched && !!errors[name]}
        helperText={showError && touched && errors[name] ? errors[name] : helperText}
        fullWidth
        InputProps={{
          startAdornment: (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mr: 1 }}>
              {chips.map((chip, index) => (
                <Chip
                  key={index}
                  label={chip}
                  onDelete={disabled ? undefined : () => handleDeleteChip(chip)}
                  size="small"
                  sx={{ height: '28px' }}
                />
              ))}
            </Box>
          ),
        }}
      />
    </Box>
  );
};
