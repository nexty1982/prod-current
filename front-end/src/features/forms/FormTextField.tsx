import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useField } from 'formik';

interface FormTextFieldProps extends Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur'> {
  name: string;
  showError?: boolean;
}

export const FormTextField: React.FC<FormTextFieldProps> = ({
  name,
  showError = true,
  ...props
}) => {
  const [field, meta] = useField(name);
  const { touched, errors } = meta;

  return (
    <TextField
      {...field}
      {...props}
      error={showError && touched && !!errors[name]}
      helperText={showError && touched && errors[name] ? errors[name] : props.helperText}
      fullWidth
    />
  );
};
