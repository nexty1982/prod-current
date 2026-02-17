import { CSSProperties, useState } from 'react';

// material-ui
import { alpha, useTheme, Theme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// third party
import { Draggable, DraggingStyle, NotDraggingStyle } from '@hello-pangea/dnd';

// project imports
import EditStory from '../Backlogs/EditStory';
import AlertItemDelete from './AlertItemDelete';
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { openSnackbar } from 'store/slices/snackbar';
import { useDispatch, useSelector } from 'store';
import { selectItem, deleteItem } from 'store/slices/kanban';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import MoreVertTwoToneIcon from '@mui/icons-material/MoreVertTwoTone';
import MenuBookTwoToneIcon from '@mui/icons-material/MenuBookTwoTone';

// types
import { DefaultRootStateProps } from 'types';
import { KanbanItem } from 'types/kanban';

interface Props {
  item: KanbanItem;
  index: number;
}

// item drag wrapper
function getDragWrapper(
  isDragging: boolean,
  draggableStyle: DraggingStyle | NotDraggingStyle | undefined,
  theme: Theme,
  radius: string
): CSSProperties | undefined {
  const bgcolor = theme.palette.mode === ThemeMode.DARK ? alpha(theme.palette.background.paper, 0.9) : theme.palette.grey[50];
  return {
    userSelect: 'none',
    margin: `0 0 ${8}px 0`,
    padding: 16,
    border: '1px solid',
    borderColor: theme.palette.mode === ThemeMode.DARK ? theme.palette.background.default : alpha(theme.palette.primary[200], 0.75),
    backgroundColor: isDragging ? bgcolor : theme.palette.background.paper,
    borderRadius: radius,
    ...draggableStyle
  };
}

// ==============================|| KANBAN BOARD - ITEMS ||============================== //

export default function Items({ item, index }: Props) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const backProfile = item.image && getImageUrl(`${item.image}`, ImagePath.PROFILE);

  const { borderRadius } = useConfig();
  const kanban = useSelector((state: DefaultRootStateProps) => state.kanban);
  const { userStory, items, columns } = kanban;

  const itemStory = userStory.filter((story) => story?.itemIds?.filter((itemId) => itemId === item.id)[0])[0];

  const handlerDetails = (id: string) => {
    dispatch(selectItem(id));
  };

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const [open, setOpen] = useState(false);
  const handleModalClose = (status: boolean) => {
    setOpen(false);
    if (status) {
      dispatch(deleteItem(item.id, items, columns, userStory));
      dispatch(
        openSnackbar({
          open: true,
          message: 'Task Deleted successfully',
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

  const [openStoryDrawer, setOpenStoryDrawer] = useState<boolean>(false);
  const handleStoryDrawerOpen = () => {
    setOpenStoryDrawer((prevState) => !prevState);
  };

  const editStory = () => {
    setOpenStoryDrawer((prevState) => !prevState);
  };

  return (
    <Draggable key={item.id} draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={getDragWrapper(snapshot.isDragging, provided.draggableProps.style, theme, `${borderRadius}px`)}
        >
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: itemStory ? -0.75 : 0 }}>
            <Typography
              onClick={() => handlerDetails(item.id)}
              variant="subtitle1"
              sx={{
                display: 'inline-block',
                width: 'calc(100% - 34px)',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                verticalAlign: 'middle',
                cursor: 'pointer'
              }}
            >
              {item.title}
            </Typography>

            <ButtonBase sx={{ borderRadius: '12px' }} onClick={handleClick} aria-controls="menu-comment" aria-haspopup="true">
              <IconButton component="span" size="small" disableRipple aria-label="more options">
                <MoreVertTwoToneIcon fontSize="inherit" />
              </IconButton>
            </ButtonBase>
            <Menu
              id="menu-comment"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleClose}
              variant="selectedMenu"
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right'
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right'
              }}
            >
              <MenuItem
                onClick={() => {
                  handleClose();
                  handlerDetails(item.id);
                }}
              >
                Edit
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleClose();
                  setOpen(true);
                }}
              >
                Delete
              </MenuItem>
            </Menu>
            {open && <AlertItemDelete title={item.title} open={open} handleClose={handleModalClose} />}
          </Stack>
          {itemStory && (
            <>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Tooltip title="User Story">
                  <MenuBookTwoToneIcon color="secondary" sx={{ fontSize: '0.875rem' }} />
                </Tooltip>
                <Tooltip title={itemStory.title}>
                  <Link variant="caption" color="secondary" underline="hover" onClick={editStory} sx={{ cursor: 'pointer', pt: 0.5 }}>
                    User Story #{itemStory.id}
                  </Link>
                </Tooltip>
              </Stack>
              {openStoryDrawer && <EditStory story={itemStory} open={openStoryDrawer} handleDrawerOpen={handleStoryDrawerOpen} />}
            </>
          )}
          {backProfile && (
            <CardMedia component="img" image={backProfile} sx={{ width: '100%', borderRadius: 1, mt: 1.5 }} title="Slider5 image" />
          )}
        </div>
      )}
    </Draggable>
  );
}
