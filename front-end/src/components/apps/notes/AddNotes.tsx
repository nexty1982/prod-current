// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useState } from 'react';

import { NotesContext } from "@/context/NotesContext";

import {
  Button,
  Dialog,
  Fab,
  DialogContent,
  TextField,
  DialogActions,
  DialogContentText,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
} from '@mui/material';

import { IconCheck } from '@tabler/icons-react';

interface Props {
  colors: any[];
}

const AddNotes = ({ colors }: Props) => {
  const { addNote, categories }: any = useContext(NotesContext);

  const [open, setOpen] = React.useState(false);
  const [scolor, setScolor] = React.useState<string>('#ffffff');

  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [category, setCategory] = React.useState('General');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');

  const setColor = (e: string) => {
    setScolor(e);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form
    setTitle('');
    setContent('');
    setCategory('General');
    setTags([]);
    setTagInput('');
    setScolor('#ffffff');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    try {
      await addNote({
        title,
        content,
        category,
        tags,
        color: scolor,
        is_pinned: false,
        is_archived: false,
      });
      handleClose();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  return (
    <>
      <Button variant="contained" disableElevation color="primary" onClick={handleClickOpen}>
        Add Note
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <Typography variant="h5" mb={2} fontWeight={700}>
            Add New Note
          </Typography>
          <DialogContentText>
            Create a new note with title, content, category, and tags.
          </DialogContentText>

          <TextField
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            id="title"
            label="Note Title"
            type="text"
            fullWidth
            size="small"
            variant="outlined"
            required
          />

          <TextField
            multiline
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            margin="normal"
            id="content"
            label="Note Content"
            type="text"
            fullWidth
            size="small"
            variant="outlined"
            required
          />

          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Meeting">Meeting</MenuItem>
              <MenuItem value="Church">Church</MenuItem>
              <MenuItem value="Personal">Personal</MenuItem>
              <MenuItem value="Important">Important</MenuItem>
              <MenuItem value="Ideas">Ideas</MenuItem>
              <MenuItem value="Tasks">Tasks</MenuItem>
              <MenuItem value="Scripture">Scripture</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <TextField
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              label="Add Tags"
              size="small"
              variant="outlined"
              fullWidth
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              helperText="Press Enter to add a tag"
            />
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          <Typography variant="h6" my={2}>
            Choose Color
          </Typography>
          {
            colors.map((color) => (
              <Fab
                sx={{
                  marginRight: '3px',
                  transition: '0.1s ease-in',
                  scale: scolor === color.lineColor ? '0.9' : '0.7',
                  backgroundColor: color.lineColor,
                }}
                size="small"
                key={color.id}
                onClick={() => setColor(color.lineColor)}
              >
                {scolor === color.lineColor ? <IconCheck style={{ color: 'white' }} /> : ''}
              </Fab>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            disabled={title === '' || content === ''}
            onClick={handleSubmit}
            variant="contained"
          >
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddNotes;
