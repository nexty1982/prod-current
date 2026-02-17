// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import CardMedia from '@mui/material/CardMedia';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';

// project imports
import { DropzopType, ThemeMode } from 'config';
import getDropzoneData from 'utils/getDropzoneData';
import useConfig from 'hooks/useConfig';

// assets
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

// types
import { FilePreviewProps } from 'types/dropzone';

// ==============================|| MULTI UPLOAD - PREVIEW ||============================== //

export default function FilesPreview({ showList = false, files, onRemove, type }: FilePreviewProps) {
  const { borderRadius, mode } = useConfig();
  const theme = useTheme();

  const hasFile = files.length > 0;
  const layoutType = type;

  return (
    <List
      disablePadding
      sx={{
        ...(hasFile && type !== DropzopType.standard && { my: 3 }),
        ...(type === DropzopType.standard && { width: 'calc(100% - 84px)' })
      }}
    >
      {files.map((file, index) => {
        const { key, name, size, preview, type } = getDropzoneData(file, index);

        if (showList) {
          return (
            <ListItem
              key={key}
              sx={{
                p: 0,
                m: 0.5,
                width: layoutType === DropzopType.standard ? 64 : 80,
                height: layoutType === DropzopType.standard ? 64 : 80,
                borderRadius: `${borderRadius}px`,
                position: 'relative',
                display: 'inline-flex',
                verticalAlign: 'text-top',
                border: 'solid 1px',
                borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.grey[200], 0.2) : 'grey.400'
              }}
            >
              {type?.includes('image') && <CardMedia component="img" alt="preview" src={preview} sx={{ width: 1 }} />}
              {!type?.includes('image') && <InsertDriveFileOutlinedIcon style={{ width: '100%', fontSize: '1.5rem' }} />}

              {onRemove && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onRemove(file)}
                  sx={{
                    fontSize: '0.875rem',
                    bgcolor: 'background.paper',
                    p: 0,
                    width: 'auto',
                    height: 'auto',
                    top: -8,
                    right: -8,
                    position: 'absolute',
                    ...(mode === ThemeMode.DARK && { '& .MuiSvgIcon-root': { backgroundColor: 'dark.dark' } })
                  }}
                >
                  <HighlightOffIcon style={{ fontSize: '1rem' }} />
                </IconButton>
              )}
            </ListItem>
          );
        }

        return (
          <ListItem
            key={key}
            sx={{
              my: 1,
              px: 2,
              py: 0.75,
              borderRadius: `${borderRadius}px`,
              border: 'solid 1px',
              borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.grey[200], 0.2) : 'grey.400'
            }}
          >
            <InsertDriveFileOutlinedIcon sx={{ color: 'secondary.main', width: 30, height: 30, fontSize: '1.15rem', mr: 0.5 }} />
            <ListItemText
              primary={typeof file === 'string' ? file : name}
              secondary={typeof file === 'string' ? '' : size}
              slotProps={{ primary: { variant: 'subtitle2' }, secondary: { variant: 'caption' } }}
            />

            {onRemove && (
              <IconButton edge="end" size="small" onClick={() => onRemove(file)} color="error">
                <HighlightOffIcon style={{ fontSize: '1.15rem' }} />
              </IconButton>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}
