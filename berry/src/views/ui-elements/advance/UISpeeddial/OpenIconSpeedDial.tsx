import React from 'react';

// material-ui
import Button from '@mui/material/Button';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import Box from '@mui/material/Box';

// assets
import FileCopyIcon from '@mui/icons-material/FileCopyTwoTone';
import SaveIcon from '@mui/icons-material/SaveTwoTone';
import PrintIcon from '@mui/icons-material/PrintTwoTone';
import ShareIcon from '@mui/icons-material/ShareTwoTone';
import FavoriteIcon from '@mui/icons-material/FavoriteTwoTone';
import EditIcon from '@mui/icons-material/EditTwoTone';

// =============================|| UI SPEEDDIAL - CUSTOM CLOSE ICON ||============================= //

export default function OpenIconSpeedDial() {
  // fab action options
  const actions = [
    { icon: <FileCopyIcon sx={{ color: 'grey.700' }} />, name: 'Copy' },
    { icon: <SaveIcon sx={{ color: 'grey.700' }} />, name: 'Save' },
    { icon: <PrintIcon sx={{ color: 'grey.700' }} />, name: 'Print' },
    { icon: <ShareIcon sx={{ color: 'grey.700' }} />, name: 'Share' },
    { icon: <FavoriteIcon sx={{ color: 'grey.700' }} />, name: 'Like' }
  ];

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const [hidden, setHidden] = React.useState(false);
  const handleVisibility = () => {
    setHidden((prevHidden) => !prevHidden);
  };

  return (
    <Box sx={{ height: 380, transform: 'translateZ(0px)', flexGrow: 1 }}>
      <Button onClick={handleVisibility}>Toggle Speed Dial</Button>
      <SpeedDial
        ariaLabel="SpeedDial openIcon example"
        hidden={hidden}
        icon={<SpeedDialIcon openIcon={<EditIcon />} />}
        onClose={handleClose}
        onOpen={handleOpen}
        open={open}
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
      >
        {actions.map((action) => (
          <SpeedDialAction key={action.name} icon={action.icon} slotProps={{ tooltip: { title: action.name } }} onClick={handleClose} />
        ))}
      </SpeedDial>
    </Box>
  );
}
