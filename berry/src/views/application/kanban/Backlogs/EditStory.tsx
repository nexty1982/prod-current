import { useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';

// third party
import * as yup from 'yup';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useFormik } from 'formik';

// project imports
import UploadMultiFile from 'ui-component/third-party/dropzone/MultiFile';
import AddStoryComment from './AddStoryComment';
import StoryComment from './StoryComment';
import AlertStoryDelete from './AlertStoryDelete';

import { DropzopType } from 'config';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { openSnackbar } from 'store/slices/snackbar';
import { useDispatch, useSelector } from 'store';
import { editStory, deleteStory } from 'store/slices/kanban';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

// types
import { DefaultRootStateProps } from 'types';
import { KanbanColumn, KanbanProfile, KanbanUserStory } from 'types/kanban';

interface Props {
  story: KanbanUserStory;
  open: boolean;
  handleDrawerOpen: () => void;
}

const validationSchema = yup.object({
  title: yup.string().required('User story title is required'),
  dueDate: yup.date()
});

// ==============================|| KANBAN BACKLOGS - EDIT STORY ||============================== //

export default function EditStory({ story, open, handleDrawerOpen }: Props) {
  const dispatch = useDispatch();
  const kanban = useSelector((state: DefaultRootStateProps) => state.kanban);
  const { profiles, columns, comments, userStory, userStoryOrder } = kanban;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: story.id,
      title: story.title,
      assign: story.assign,
      columnId: story.columnId,
      priority: story.priority,
      dueDate: story.dueDate ? new Date(story.dueDate) : new Date(),
      acceptance: story.acceptance,
      description: story.description,
      commentIds: story.commentIds,
      image: false,
      itemIds: story.itemIds,
      files: []
    },
    validationSchema,
    onSubmit: (values) => {
      dispatch(editStory(values, userStory));
      dispatch(
        openSnackbar({
          open: true,
          message: 'Submit Success',
          variant: 'alert',
          alert: {
            color: 'success'
          },
          close: false
        })
      );
      handleDrawerOpen();
    }
  });

  const [openModal, setOpenModal] = useState(false);
  const handleModalClose = (status: boolean) => {
    setOpenModal(false);
    if (status) {
      handleDrawerOpen();
      dispatch(deleteStory(story.id, userStory, userStoryOrder));
      dispatch(
        openSnackbar({
          open: true,
          message: 'Story Deleted successfully',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          variant: 'alert',
          alert: {
            color: 'success'
          },
          close: false
        })
      );
    }
  };

  return (
    <Drawer
      sx={{
        ml: open ? 3 : 0,
        flexShrink: 0,
        zIndex: 1200,
        overflowX: 'hidden',
        width: { xs: 320, md: 450 },
        '& .MuiDrawer-paper': {
          height: '100vh',
          width: { xs: 320, md: 450 },
          position: 'fixed',
          border: 'none',
          borderRadius: '0px'
        }
      }}
      variant="temporary"
      anchor="right"
      open={open}
      ModalProps={{ keepMounted: true }}
      onClose={() => {
        handleDrawerOpen();
        formik.resetForm();
      }}
    >
      {open && (
        <>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid sx={{ width: 'calc(100% - 50px)' }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Button
                    variant="text"
                    color="error"
                    sx={{ p: 0.5, minWidth: 32, display: { xs: 'block', md: 'none' } }}
                    onClick={handleDrawerOpen}
                  >
                    <HighlightOffIcon />
                  </Button>
                  <Typography
                    variant="h4"
                    sx={{
                      display: 'inline-block',
                      width: 'calc(100% - 34px)',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      verticalAlign: 'middle'
                    }}
                  >
                    {story.title}
                  </Typography>
                </Stack>
              </Grid>

              <Grid>
                <Button variant="text" color="error" sx={{ p: 0.5, minWidth: 32 }} onClick={() => setOpenModal(true)}>
                  <DeleteTwoToneIcon />
                </Button>
                {openModal && <AlertStoryDelete title={story.title} open={openModal} handleClose={handleModalClose} />}
              </Grid>
            </Grid>
          </Box>
          <Divider />
          <PerfectScrollbar>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <form onSubmit={formik.handleSubmit}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <Grid container spacing={3}>
                        <Grid size={12}>
                          <TextField
                            fullWidth
                            id="title"
                            name="title"
                            label="Title"
                            value={formik.values.title}
                            onChange={formik.handleChange}
                            error={formik.touched.title && Boolean(formik.errors.title)}
                            helperText={formik.touched.title && formik.errors.title}
                          />
                        </Grid>
                        <Grid size={12}>
                          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Typography variant="subtitle1">Assign to:</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <Grid container sx={{ justifyContent: 'flex-start' }}>
                                <Autocomplete
                                  id="assign"
                                  value={profiles.find((profile: KanbanProfile) => profile.id === formik.values.assign) || null}
                                  onChange={(event, value) => {
                                    formik.setFieldValue('assign', value?.id);
                                  }}
                                  options={profiles}
                                  fullWidth
                                  autoHighlight
                                  getOptionLabel={(option) => option.name}
                                  isOptionEqualToValue={(option) => option.id === formik.values.assign}
                                  renderOption={(props, option) => (
                                    <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                      <CardMedia
                                        component="img"
                                        sx={{ width: 20 }}
                                        loading="lazy"
                                        src={getImageUrl(`${option.avatar}`, ImagePath.USERS)}
                                        alt=""
                                      />
                                      {option.name}
                                    </Box>
                                  )}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Choose a assignee"
                                      slotProps={{
                                        htmlInput: {
                                          ...params.inputProps,
                                          autoComplete: 'new-password' // disable autocomplete and autofill
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid size={12}>
                          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Typography variant="subtitle1">Prioritize:</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <FormControl>
                                <RadioGroup
                                  row
                                  aria-label="color"
                                  value={formik.values.priority}
                                  onChange={formik.handleChange}
                                  name="priority"
                                  id="priority"
                                >
                                  <FormControlLabel
                                    value="low"
                                    control={<Radio color="primary" sx={{ color: 'primary.main' }} />}
                                    label="Low"
                                  />
                                  <FormControlLabel
                                    value="medium"
                                    control={<Radio color="warning" sx={{ color: 'warning.main' }} />}
                                    label="Medium"
                                  />
                                  <FormControlLabel
                                    value="high"
                                    control={<Radio color="error" sx={{ color: 'error.main' }} />}
                                    label="High"
                                  />
                                </RadioGroup>
                              </FormControl>
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid size={12}>
                          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Typography variant="subtitle1">Due date:</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <DesktopDatePicker
                                label="Due Date"
                                value={formik.values.dueDate}
                                format="dd/MM/yyyy"
                                onChange={(date) => {
                                  formik.setFieldValue('dueDate', date);
                                }}
                                slotProps={{ textField: { fullWidth: true } }}
                              />
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid size={12}>
                          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Typography variant="subtitle1">Acceptance:</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <TextField
                                fullWidth
                                id="acceptance"
                                name="acceptance"
                                multiline
                                rows={3}
                                value={formik.values.acceptance}
                                onChange={formik.handleChange}
                                error={formik.touched.acceptance && Boolean(formik.errors.acceptance)}
                                helperText={formik.touched.acceptance && formik.errors.acceptance}
                              />
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid size={12}>
                          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Typography variant="subtitle1">Description:</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <TextField
                                fullWidth
                                id="description"
                                name="description"
                                multiline
                                rows={3}
                                value={formik.values.description}
                                onChange={formik.handleChange}
                                error={formik.touched.description && Boolean(formik.errors.description)}
                                helperText={formik.touched.description && formik.errors.description}
                              />
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid size={12}>
                          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Typography variant="subtitle1">State:</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                              <FormControl fullWidth>
                                <Select
                                  id="columnId"
                                  name="columnId"
                                  displayEmpty
                                  value={formik.values.columnId}
                                  onChange={formik.handleChange}
                                  slotProps={{ input: { 'aria-label': 'Without label' } }}
                                >
                                  {columns.map((column: KanbanColumn, index: number) => (
                                    <MenuItem key={index} value={column.id}>
                                      {column.title}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid size={12}>
                          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                            <Grid size={12}>
                              <Typography variant="subtitle1">Attachments:</Typography>
                            </Grid>
                            <Grid size={12}>
                              <UploadMultiFile
                                type={DropzopType.standard}
                                showList={true}
                                setFieldValue={formik.setFieldValue}
                                files={formik.values.files}
                                error={formik.touched.files && !!formik.errors.files}
                              />
                            </Grid>
                          </Grid>
                        </Grid>

                        <Grid size={12}>
                          <AnimateButton>
                            <Button fullWidth variant="contained" type="submit">
                              Save
                            </Button>
                          </AnimateButton>
                        </Grid>
                      </Grid>
                    </LocalizationProvider>
                  </form>
                </Grid>
                <Grid size={12}>
                  {story?.commentIds &&
                    [...story?.commentIds].reverse().map((commentId, index) => {
                      const commentData = comments.filter((comment) => comment.id === commentId)[0];
                      const profile = profiles.filter((item) => item.id === commentData.profileId)[0];
                      return <StoryComment key={index} comment={commentData} profile={profile} />;
                    })}
                </Grid>
                <Grid size={12}>
                  <AddStoryComment storyId={story.id} />
                </Grid>
              </Grid>
            </Box>
          </PerfectScrollbar>
        </>
      )}
    </Drawer>
  );
}
