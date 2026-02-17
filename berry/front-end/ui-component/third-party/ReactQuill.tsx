// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// third party
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// project imports
import { ThemeDirection, ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';

interface ReactQuillProps {
  value?: string;
  editorMinHeight?: number;
  onChange?: (value: string) => void;
}

// ==============================|| QUILL EDITOR ||============================== //

export default function ReactQuillDemo({ value, editorMinHeight = 125, onChange }: ReactQuillProps) {
  const { fontFamily, mode } = useConfig();
  const theme = useTheme();

  return (
    <Box
      sx={{
        '& .quill': {
          bgcolor: mode === ThemeMode.DARK ? 'dark.main' : 'grey.50',
          borderRadius: '12px',
          '& .ql-toolbar': {
            bgcolor: mode === ThemeMode.DARK ? 'dark.light' : 'grey.100',
            borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.dark.light, 0.2) : 'primary.light',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          },
          '& .ql-container': {
            fontFamily,
            borderColor: mode === ThemeMode.DARK ? `${alpha(theme.palette.dark.light, 0.2)} !important` : 'primary.light',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            '& .ql-editor': { minHeight: editorMinHeight }
          }
        },
        ...(theme.direction === ThemeDirection.RTL && { '& .ql-snow .ql-picker-label::before ': { ml: 2 } })
      }}
    >
      <ReactQuill {...(value && { value })} {...(onChange && { onChange })} />
    </Box>
  );
}
