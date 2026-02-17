import { FormikValues } from 'formik';

export interface CalendarStateProps {
  events: FormikValues[];
  error: object | string | null;
}
