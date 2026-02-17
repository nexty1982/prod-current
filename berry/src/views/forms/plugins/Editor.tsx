import { useState } from 'react';

// material-ui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import ReactQuill from 'ui-component/third-party/ReactQuill';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// assets
import LinkIcon from '@mui/icons-material/Link';

// ==============================|| PLUGIN - EDITORS ||============================== //

export default function Editor() {
  const [text, setText] = useState(
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
  );

  const handleChange = (value: string) => {
    setText(value);
  };

  return (
    <MainCard
      title="Editor"
      secondary={
        <SecondaryAction icon={<LinkIcon sx={{ fontSize: 'small' }} />} link="https://www.npmjs.com/package/react-draft-wysiwyg" />
      }
    >
      <Stack spacing={gridSpacing}>
        <Typography variant="subtitle1">React Quill</Typography>
        <ReactQuill value={text} onChange={handleChange} />
      </Stack>
    </MainCard>
  );
}
