import { useEffect, useRef, useState, SyntheticEvent } from 'react';

// material-ui
import { useTheme, Theme, styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import Grid from '@mui/material/Grid';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Slide, { SlideProps } from '@mui/material/Slide';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import { gridSpacing } from 'store/constant';
import AnimateButton from 'ui-component/extended/AnimateButton';

// assets
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';

import Product1 from 'assets/images/widget/prod1.jpg';
import Product2 from 'assets/images/widget/prod2.jpg';
import Product3 from 'assets/images/widget/prod3.jpg';
import Product4 from 'assets/images/widget/prod4.jpg';

// styles
const ImageWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '4px',
  cursor: 'pointer',
  width: 55,
  height: 55,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.palette.background.default,
  '& > svg': {
    verticalAlign: 'sub',
    marginRight: 6
  }
}));

// product category options
const categories = [
  {
    value: '1',
    label: 'Iphone 12 Pro Max'
  },
  {
    value: '2',
    label: 'Iphone 11 Pro Max'
  },
  {
    value: '3',
    label: 'Nokia'
  },
  {
    value: '4',
    label: 'Samsung'
  }
];

// animation
function Transition(props: SlideProps) {
  return <Slide direction="left" {...props} />;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  },
  chip: {
    margin: 2
  }
};

// tags list & style
const tagNames = ['Html', 'Scss', 'Js', 'React', 'Ionic', 'Angular', 'css', 'Php', 'View'];

function getStyles(name: string, personName: string, theme: Theme) {
  return {
    fontWeight: personName.indexOf(name) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium
  };
}

// ==============================|| PRODUCT ADD DIALOG ||============================== //

interface ProductAddProps {
  open: boolean;
  handleCloseDialog: (e: SyntheticEvent) => void;
}

export default function ProductAdd({ open, handleCloseDialog }: ProductAddProps) {
  const theme = useTheme();

  // handle category change dropdown
  const [currency, setCurrency] = useState('2');
  const handleSelectChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | undefined) => {
    event?.target.value && setCurrency(event?.target.value);
  };
  // set image upload progress
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(() => {});
  useEffect(() => {
    progressRef.current = () => {
      if (progress > 100) {
        setProgress(0);
      } else {
        const diff = Math.random() * 10;
        setProgress(progress + diff);
      }
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      progressRef.current();
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // handle tag select
  const [personName, setPersonName] = useState<string[] | string>([]);
  const handleTagSelectChange = (event: SelectChangeEvent<string | string[]>) => {
    setPersonName(event?.target.value);
  };

  return (
    <Dialog
      open={open}
      slots={{ transition: Transition }}
      onClose={handleCloseDialog}
      sx={{
        ' .MuiDialog-container': {
          transitionDuration: 'unset !important'
        },
        '&>div:nth-of-type(3)': {
          justifyContent: 'flex-end',
          '&>div': {
            m: 0,
            borderRadius: '0px',
            maxWidth: 450,
            maxHeight: '100%'
          }
        }
      }}
    >
      {open && (
        <>
          <DialogTitle>Add Product</DialogTitle>
          <DialogContent>
            <Grid container spacing={gridSpacing}>
              <Grid size={12} sx={{ mt: 1.25 }}>
                <TextField id="outlined-basic1" fullWidth label="Enter Product Name*" defaultValue="Iphone 11 Pro Max" />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="outlined-basic2"
                  fullWidth
                  multiline
                  rows={3}
                  label="Enter Product Name"
                  defaultValue="Fundamentally redesigned and engineered The Apple Watch display yet."
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="standard-select-currency"
                  select
                  label="Select Category*"
                  value={currency}
                  fullWidth
                  onChange={handleSelectChange}
                  helperText="Please select Category"
                >
                  {categories.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField id="outlined-basic3" fullWidth label="Barcode*" defaultValue="8390590339828" />
              </Grid>
              <Grid size={12}>
                <TextField id="outlined-basic4" fullWidth label="SKU*" defaultValue="H8J702729P" />
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <TextField
                  label="Price*"
                  id="filled-start-adornment1"
                  value="399"
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <TextField
                  label="Discount"
                  id="filled-start-adornment2"
                  value="10"
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">%</InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <TextField type="number" id="outlined-basic5" fullWidth label="Quantity*" defaultValue="0" />
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <TextField id="outlined-basic6" fullWidth label="Brand*" defaultValue="Samsung" />
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <TextField
                  label="Weight"
                  value="0"
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ md: 6, xs: 12 }}>
                <TextField type="number" id="outlined-basic7" fullWidth label="Extra Shipping Free" defaultValue="0" />
              </Grid>
              <Grid size={12}>
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">Product Images*</Typography>
                  </Grid>
                  <Grid size={12}>
                    <div>
                      <TextField type="file" id="file-upload" fullWidth label="Enter SKU" sx={{ display: 'none' }} />
                      <InputLabel
                        htmlFor="file-upload"
                        sx={{
                          bgcolor: 'background.default',
                          py: 3.75,
                          px: 0,
                          textAlign: 'center',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          mb: 3,
                          '& > svg': {
                            verticalAlign: 'sub',
                            mr: 0.5
                          }
                        }}
                      >
                        <CloudUploadIcon /> Drop file here to upload
                      </InputLabel>
                    </div>
                    <Grid container spacing={1}>
                      <Grid>
                        <ImageWrapper>
                          <CardMedia component="img" image={Product1} title="Product" />
                        </ImageWrapper>
                      </Grid>
                      <Grid>
                        <ImageWrapper>
                          <CardMedia component="img" image={Product2} title="Product" />
                        </ImageWrapper>
                      </Grid>
                      <Grid>
                        <ImageWrapper>
                          <CardMedia component="img" image={Product3} title="Product" />
                        </ImageWrapper>
                      </Grid>
                      <Grid>
                        <ImageWrapper>
                          <CardMedia component="img" image={Product4} title="Product" />
                          <CircularProgress
                            variant="determinate"
                            value={progress}
                            color="secondary"
                            sx={{
                              position: 'absolute',
                              left: '0',
                              top: '0',
                              bgcolor: 'rgba(255, 255, 255, .8)',
                              width: '100% !important',
                              height: '100% !important',
                              p: 1.5
                            }}
                          />
                        </ImageWrapper>
                      </Grid>
                      <Grid>
                        <ImageWrapper>
                          <Fab color="secondary" size="small">
                            <CloseIcon />
                          </Fab>
                        </ImageWrapper>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">Tags</Typography>
                  </Grid>
                  <Grid size={12}>
                    <div>
                      <Select
                        id="demo-multiple-chip"
                        multiple
                        fullWidth
                        value={personName}
                        onChange={handleTagSelectChange}
                        input={<Input id="select-multiple-chip" />}
                        renderValue={(selected) => (
                          <div>
                            {typeof selected !== 'string' &&
                              selected.map((value) => <Chip key={value} label={value} color="default" sx={{ ml: 0.5 }} />)}
                          </div>
                        )}
                        MenuProps={MenuProps}
                      >
                        {tagNames.map((name) => (
                          <MenuItem key={name} value={name} style={getStyles(name, personName as string, theme)}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <AnimateButton>
              <Button variant="contained">Create</Button>
            </AnimateButton>
            <Button variant="text" color="error" onClick={handleCloseDialog}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
