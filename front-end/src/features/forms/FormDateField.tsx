import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useField } from 'formik';
import dayjs, { Dayjs } from 'dayjs';

interface FormDateFieldProps extends Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur'> {
  name: string;
  showError?: boolean;
}

export const FormDateField: React.FC<FormDateFieldProps> = ({
  name,
  showError = true,
  label,
  placeholder = 'MM/DD/YYYY',
  ...props
}) => {
  const [field, meta, helpers] = useField(name);
  const { touched, errors } = meta;
  const { setValue, setTouched } = helpers;

  // Parse the current value - could be a date string or null
  const getDateValue = (): Dayjs | null => {
    if (!field.value) return null;
    const parsed = dayjs(field.value);
    return parsed.isValid() ? parsed : null;
  };

  const handleDateChange = (newValue: Dayjs | null) => {
    if (newValue && newValue.isValid()) {
      // Store as ISO string (YYYY-MM-DD) for backend compatibility
      setValue(newValue.format('YYYY-MM-DD'));
    } else {
      setValue('');
    }
    setTouched(true);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={getDateValue()}
        onChange={handleDateChange}
        format="MM/DD/YYYY"
        slotProps={{
          textField: {
            ...props,
            fullWidth: true,
            error: showError && touched && !!errors[name],
            helperText: showError && touched && errors[name] ? errors[name] : props.helperText,
            placeholder: placeholder,
            onBlur: () => {
              setTouched(true);
              field.onBlur({ target: { name } } as any);
            },
          },
        }}
      />
    </LocalizationProvider>
  );
};
