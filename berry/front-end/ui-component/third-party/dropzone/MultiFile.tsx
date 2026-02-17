// material-ui
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// third party
import { useDropzone } from 'react-dropzone';

// project imports
import FilesPreview from './FilePreview';
import PlaceholderContent from './PlaceHolderContent';
import RejectionFiles from './RejectionFile';
import { DropzopType } from 'config';

// types
import { CustomFile, UploadMultiFileProps } from 'types/dropzone';

const DropzoneWrapper = styled('div')(({ theme }) => ({
  outline: 'none',
  padding: theme.spacing(5, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: `1px dashed ${theme.palette.secondary.main}`,
  '&:hover': { opacity: 0.72, cursor: 'pointer' }
}));

// ==============================|| UPLOAD - MULTIPLE FILE ||============================== //

export default function MultiFileUpload({ error, showList = false, files, type, setFieldValue, sx, onUpload }: UploadMultiFileProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    multiple: true,
    onDrop: (acceptedFiles: CustomFile[]) => {
      if (files) {
        setFieldValue('files', [
          ...files,
          ...acceptedFiles.map((file: CustomFile) =>
            Object.assign(file, {
              preview: URL.createObjectURL(file)
            })
          )
        ]);
      } else {
        setFieldValue(
          'files',
          acceptedFiles.map((file: CustomFile) =>
            Object.assign(file, {
              preview: URL.createObjectURL(file)
            })
          )
        );
      }
    }
  });

  const onRemoveAll = () => {
    setFieldValue('files', null);
  };

  const onRemove = (file: File | string) => {
    const filteredItems = files && files.filter((_file) => _file !== file);
    setFieldValue('files', filteredItems);
  };

  return (
    <>
      <Box
        sx={{
          width: '100%',
          ...(type === DropzopType.standard && { width: 'auto', display: 'flex' }),
          ...sx
        }}
      >
        <Stack {...(type === DropzopType.standard && { alignItems: 'center' })}>
          <DropzoneWrapper
            {...getRootProps()}
            sx={{
              ...(type === DropzopType.standard && {
                p: 0,
                m: 1,
                width: 64,
                height: 64
              }),
              ...(isDragActive && { opacity: 0.72 }),
              ...((isDragReject || error) && {
                color: 'error.main',
                borderColor: 'error.light',
                bgcolor: 'error.lighter'
              })
            }}
          >
            <input {...getInputProps()} />
            <PlaceholderContent type={type} />
          </DropzoneWrapper>
          {type === DropzopType.standard && files && files.length > 1 && (
            <Button variant="contained" size="small" color="error" onClick={onRemoveAll} sx={{ px: 0.75 }}>
              Remove all
            </Button>
          )}
        </Stack>
        {fileRejections.length > 0 && <RejectionFiles fileRejections={fileRejections} />}
        {files && files.length > 0 && <FilesPreview files={files} showList={showList} onRemove={onRemove} type={type} />}
      </Box>
      {type !== DropzopType.standard && files && files.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', mt: 2 }}>
          <Button color="error" onClick={onRemoveAll}>
            Remove all
          </Button>
          <Button variant="contained" onClick={onUpload}>
            Upload files
          </Button>
        </Stack>
      )}
    </>
  );
}
