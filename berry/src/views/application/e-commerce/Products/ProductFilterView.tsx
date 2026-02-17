// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CardContent from '@mui/material/CardContent';
import Chip, { ChipProps } from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import Avatar from 'ui-component/extended/Avatar';
import ColorOptions from '../ColorOptions';
import { gridSpacing } from 'store/constant';

// assets
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

// types
import { ProductsFilter } from 'types/e-commerce';

function getColor(color: string) {
  return ColorOptions.filter((item) => item.value === color);
}

// ==============================|| PRODUCT GRID - FILTER VIEW ||============================== //

interface ProductFilterViewProps {
  filter: ProductsFilter;
  initialState: ProductsFilter;
  filterIsEqual: (initialState: ProductsFilter, filter: ProductsFilter) => boolean;
  handelFilter: (type: string, params: string, rating?: number) => void;
}

export default function ProductFilterView({ filter, filterIsEqual, handelFilter, initialState }: ProductFilterViewProps) {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));

  return (
    <>
      {!filterIsEqual(initialState, filter) && (
        <Grid container spacing={gridSpacing} sx={{ alignItems: 'center', pb: gridSpacing }}>
          {!(initialState.search === filter.search) && (
            <Grid>
              <SubCard content={false}>
                <CardContent sx={{ pb: '12px !important', p: 1.5 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Chip
                        size={downMD ? 'small' : undefined}
                        label={filter.search}
                        color="secondary"
                        onDelete={() => handelFilter('search', '')}
                        sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </SubCard>
            </Grid>
          )}
          {!(initialState.sort === filter.sort) && (
            <Grid>
              <SubCard content={false}>
                <CardContent sx={{ pb: '12px !important', p: 1.5 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Typography variant="subtitle1">Sort</Typography>
                    </Grid>
                    <Grid>
                      <Chip
                        size={downMD ? 'small' : undefined}
                        label={filter.sort}
                        color="secondary"
                        onDelete={() => handelFilter('sort', initialState.sort)}
                        sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </SubCard>
            </Grid>
          )}
          {!(JSON.stringify(initialState.gender) === JSON.stringify(filter.gender)) && (
            <Grid>
              <SubCard content={false}>
                <CardContent sx={{ pb: '12px !important', p: 1.5 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Typography variant="subtitle1">Gender</Typography>
                    </Grid>

                    {filter.gender.map((item: string, index: number) => {
                      let color: ChipProps['color'] = 'secondary';
                      if (item === 'male') color = 'primary';
                      if (item === 'kids') color = 'error';
                      return (
                        <Grid key={index}>
                          <Chip
                            size={downMD ? 'small' : undefined}
                            label={item}
                            onDelete={() => handelFilter('gender', item)}
                            color={color}
                            sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </SubCard>
            </Grid>
          )}
          {!(JSON.stringify(initialState.categories) === JSON.stringify(filter.categories)) && filter.categories.length > 0 && (
            <Grid>
              <SubCard content={false}>
                <CardContent sx={{ pb: '12px !important', p: 1.5 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Typography variant="subtitle1">Categories</Typography>
                    </Grid>
                    {filter.categories.map((item: string, index: number) => (
                      <Grid key={index}>
                        <Chip
                          size={downMD ? 'small' : undefined}
                          label={item}
                          onDelete={() => handelFilter('categories', item)}
                          color="secondary"
                          sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </SubCard>
            </Grid>
          )}
          {!(JSON.stringify(initialState.colors) === JSON.stringify(filter.colors)) && (
            <Grid>
              <SubCard content={false}>
                <CardContent sx={{ pb: '12px !important', p: 1.5 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Typography variant="subtitle1">Colors</Typography>
                    </Grid>
                    {filter.colors.map((item: string, index: number) => {
                      const colorsData = getColor(item);
                      return (
                        <Grid key={index}>
                          <Tooltip title={colorsData[0].label}>
                            <ButtonBase sx={{ borderRadius: '50%' }} onClick={() => handelFilter('colors', item)}>
                              <Avatar color="inherit" size="badge" sx={{ bgcolor: colorsData[0].bg, borderColor: 'divider' }}>
                                <CheckIcon sx={{ color: 'divider' }} fontSize="inherit" />
                              </Avatar>
                            </ButtonBase>
                          </Tooltip>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </SubCard>
            </Grid>
          )}
          {!(initialState.price === filter.price) && (
            <Grid>
              <SubCard content={false}>
                <CardContent sx={{ pb: '12px !important', p: 1.5 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Typography variant="subtitle1">Price</Typography>
                    </Grid>
                    <Grid>
                      <Chip
                        size={downMD ? 'small' : undefined}
                        label={filter.price}
                        color="primary"
                        sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </SubCard>
            </Grid>
          )}
          {!(initialState.rating === filter.rating) && (
            <Grid>
              <SubCard content={false}>
                <CardContent sx={{ pb: '12px !important', p: 1.5 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Typography variant="subtitle1">Rating</Typography>
                    </Grid>
                    <Grid>
                      <Chip
                        size={downMD ? 'small' : undefined}
                        label={String(filter.rating)}
                        color="warning"
                        onDelete={() => handelFilter('rating', '', 0)}
                        sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </SubCard>
            </Grid>
          )}
          <Grid>
            <Button variant="outlined" startIcon={<CloseIcon />} color="error" onClick={() => handelFilter('reset', '')}>
              Clear All
            </Button>
          </Grid>
        </Grid>
      )}
    </>
  );
}
