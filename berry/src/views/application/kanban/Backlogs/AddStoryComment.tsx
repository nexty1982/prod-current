import { ChangeEvent, KeyboardEvent, useState } from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

// project imports
import { useDispatch, useSelector } from 'store';
import useConfig from 'hooks/useConfig';
import { addStoryComment } from 'store/slices/kanban';

// third party
import { Chance } from 'chance';

// assets
import AttachFileTwoToneIcon from '@mui/icons-material/AttachFileTwoTone';
import AddToDriveTwoToneIcon from '@mui/icons-material/AddToDriveTwoTone';
import AddPhotoAlternateTwoToneIcon from '@mui/icons-material/AddPhotoAlternateTwoTone';

// types
import { KanbanComment } from 'types/kanban';
import { openSnackbar } from 'store/slices/snackbar';

interface Props {
  storyId: string;
}

const chance = new Chance();

// ==============================|| KANBAN BACKLOGS - ADD STORY COMMENT ||============================== //

export default function AddStoryComment({ storyId }: Props) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { borderRadius } = useConfig();
  const { comments, userStory } = useSelector((state) => state.kanban);

  const [comment, setComment] = useState('');
  const [isComment, setIsComment] = useState(false);

  const handleAddStoryComment = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.keyCode === 13) {
      addNewStoryComment();
    }
  };

  const addNewStoryComment = () => {
    if (comment.length > 0) {
      const newComment: KanbanComment = {
        id: `${chance.integer({ min: 1000, max: 9999 })}`,
        comment,
        profileId: 'profile-1'
      };

      dispatch(addStoryComment(storyId, newComment, comments, userStory));
      dispatch(
        openSnackbar({
          open: true,
          message: 'Comment Add successfully',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          variant: 'alert',
          alert: {
            color: 'success'
          },
          close: false
        })
      );
      setComment('');
    } else {
      setIsComment(true);
    }
  };

  const handleStoryComment = (event: ChangeEvent<HTMLInputElement>) => {
    const newComment = event.target.value;
    setComment(newComment);
    if (newComment.length <= 0) {
      setIsComment(true);
    } else {
      setIsComment(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2.5,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary[200], 0.75),
        borderRadius: `${borderRadius}px`
      }}
    >
      <Grid container spacing={0.5} sx={{ alignItems: 'center' }}>
        <Grid size={12}>
          <TextField
            fullWidth
            placeholder="Add Comment"
            value={comment}
            onChange={handleStoryComment}
            sx={{
              mb: 2,
              '& input': { bgcolor: 'transparent', p: 0, borderRadius: '0px' },
              '& fieldset': { display: 'none' },
              '& .MuiFormHelperText-root': {
                ml: 0
              },
              '& .MuiOutlinedInput-root': {
                bgcolor: 'transparent'
              }
            }}
            onKeyUp={handleAddStoryComment}
            helperText={isComment ? 'Comment is required.' : ''}
            error={isComment}
          />
        </Grid>
        <Grid>
          <Button variant="text" color="primary" sx={{ p: 0.5, minWidth: 32 }} aria-label="add photo">
            <AddPhotoAlternateTwoToneIcon />
          </Button>
        </Grid>
        <Grid>
          <Button variant="text" color="primary" sx={{ p: 0.5, minWidth: 32 }} aria-label="add attachment">
            <AttachFileTwoToneIcon />
          </Button>
        </Grid>
        <Grid>
          <Button variant="text" color="primary" sx={{ p: 0.5, minWidth: 32 }} aria-label="add file by google drive">
            <AddToDriveTwoToneIcon />
          </Button>
        </Grid>
        <Grid size="grow" />
        <Grid>
          <Button variant="contained" color="primary" onClick={addNewStoryComment}>
            Comment
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
