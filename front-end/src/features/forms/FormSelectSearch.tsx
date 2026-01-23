import React, { useState, useMemo } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useField } from 'formik';

interface FormSelectSearchProps {
  name: string;
  label: string;
  options: Array<{ id: number | string; name: string } | string>;
  showError?: boolean;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
  defaultValue?: string;
}

export const FormSelectSearch: React.FC<FormSelectSearchProps> = ({
  name,
  label,
  options,
  showError = true,
  required = false,
  placeholder,
  disabled = false,
  helperText,
  defaultValue,
}) => {
  const [field, meta, helpers] = useField(name);
  const { touched, errors } = meta;
  const { setValue, setTouched } = helpers;
  const [inputValue, setInputValue] = useState('');

  // Normalize options to always be objects with id and name
  const normalizedOptions = useMemo(() => {
    return options.map((option) => {
      if (typeof option === 'string') {
        return { id: option, name: option };
      }
      return option;
    });
  }, [options]);

  // Find the selected option
  const selectedOption = useMemo(() => {
    if (!field.value) {
      // If defaultValue is provided and no field value, use it
      if (defaultValue) {
        return normalizedOptions.find(
          (opt) => opt.id === defaultValue || opt.name === defaultValue
        ) || null;
      }
      return null;
    }
    return normalizedOptions.find(
      (opt) => opt.id === field.value || opt.name === field.value
    ) || null;
  }, [field.value, normalizedOptions, defaultValue]);

  const handleChange = (_event: React.SyntheticEvent, newValue: { id: number | string; name: string } | string | null) => {
    if (newValue === null) {
      setValue('');
      return;
    }
    
    if (typeof newValue === 'string') {
      setValue(newValue);
    } else {
      // Use the name for the value (backend expects name string)
      setValue(newValue.name);
    }
    setTouched(true);
  };

  // Initialize with defaultValue if provided and field is empty
  React.useEffect(() => {
    if (defaultValue && !field.value) {
      setValue(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  const handleInputChange = (_event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
  };

  return (
    <Autocomplete
      options={normalizedOptions}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
      value={selectedOption}
      onChange={handleChange}
      onInputChange={handleInputChange}
      inputValue={inputValue}
      disabled={disabled}
      freeSolo
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder}
          error={showError && touched && !!errors[name]}
          helperText={showError && touched && errors[name] ? errors[name] : helperText}
          fullWidth
        />
      )}
      isOptionEqualToValue={(option, value) => {
        if (typeof option === 'string' || typeof value === 'string') {
          return option === value;
        }
        return option.id === value.id || option.name === value.name;
      }}
    />
  );
};
