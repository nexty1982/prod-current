import { useEffect, useState } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// project imports
import Colors from './Colors';
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import Accordion from 'ui-component/extended/Accordion';
import { gridSpacing } from 'store/constant';
import useConfig from 'hooks/useConfig';

// types
import { ProductsFilter } from 'types/e-commerce';

// ==============================|| PRODUCT GRID GENDER FILTER ||============================== //

function Gender({ gender, handelFilter }: { gender: string[]; handelFilter: (type: string, params: string) => void }) {
  const [isGenderLoading, setGenderLoading] = useState(true);
  useEffect(() => {
    setGenderLoading(false);
  }, []);

  return (
    <Stack direction="row" sx={{ alignItems: 'center' }}>
      {isGenderLoading ? (
        <Skeleton variant="rectangular" width="100%" height={42} />
      ) : (
        <>
          <FormControlLabel
            control={<Checkbox checked={gender.some((item) => item === 'male')} />}
            onChange={() => handelFilter('gender', 'male')}
            label="Male"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={gender.some((item) => item === 'female')}
                onChange={() => handelFilter('gender', 'female')}
                color="secondary"
              />
            }
            label="Female"
          />
          <FormControlLabel
            control={
              <Checkbox checked={gender.some((item) => item === 'kids')} onChange={() => handelFilter('gender', 'kids')} color="error" />
            }
            label="Kids"
          />
        </>
      )}
    </Stack>
  );
}

// ==============================|| PRODUCT GRID - CATEGORIES FILTER ||============================== //

function Categories({ categories, handelFilter }: { categories: string[]; handelFilter: (type: string, params: string) => void }) {
  const [isCategoriesLoading, setCategoriesLoading] = useState(true);
  useEffect(() => {
    setCategoriesLoading(false);
  }, []);

  return (
    <Grid container spacing={1}>
      {isCategoriesLoading ? (
        <Grid size={12}>
          <Skeleton variant="rectangular" width="100%" height={96} />
        </Grid>
      ) : (
        <>
          <Grid size={6}>
            <FormControlLabel
              control={<Checkbox checked={categories.some((item) => item === 'all')} />}
              onChange={() => handelFilter('categories', 'all')}
              label="All"
            />
            <FormControlLabel
              control={<Checkbox checked={categories.some((item) => item === 'electronics')} />}
              onChange={() => handelFilter('categories', 'electronics')}
              label="Electronics"
            />
            <FormControlLabel
              control={<Checkbox checked={categories.some((item) => item === 'fashion')} />}
              onChange={() => handelFilter('categories', 'fashion')}
              label="Fashion"
            />
          </Grid>
          <Grid size={6}>
            <FormControlLabel
              control={<Checkbox checked={categories.some((item) => item === 'kitchen')} />}
              onChange={() => handelFilter('categories', 'kitchen')}
              label="Kitchen"
            />
            <FormControlLabel
              control={<Checkbox checked={categories.some((item) => item === 'books')} />}
              onChange={() => handelFilter('categories', 'books')}
              label="Books"
            />
            <FormControlLabel
              control={<Checkbox checked={categories.some((item) => item === 'toys')} />}
              onChange={() => handelFilter('categories', 'toys')}
              label="Toys"
            />
          </Grid>
        </>
      )}
    </Grid>
  );
}

// ==============================|| PRODUCT GRID - PRICE FILTER ||============================== //

function Price({ price, handelFilter }: { price: string; handelFilter: (type: string, params: string) => void }) {
  const [isPriceLoading, setPriceLoading] = useState(true);
  useEffect(() => {
    setPriceLoading(false);
  }, []);

  return (
    <>
      {isPriceLoading ? (
        <Skeleton variant="rectangular" width="100%" height={172} />
      ) : (
        <FormControl component="fieldset">
          <RadioGroup
            row
            aria-label="product-filter"
            value={price}
            onChange={(e) => handelFilter('price', e.target.value)}
            name="row-radio-buttons-group"
          >
            <Grid container spacing={0.25}>
              <Grid size={6}>
                <FormControlLabel
                  value="0-10"
                  control={<Radio />}
                  label="Below $10"
                  sx={{
                    '& .MuiSvgIcon-root': { fontSize: 28 },
                    '& .MuiFormControlLabel-label': { color: 'grey.900' }
                  }}
                />
              </Grid>
              <Grid size={6}>
                <FormControlLabel
                  value="10-50"
                  control={<Radio />}
                  label="$10 - $50"
                  sx={{
                    '& .MuiSvgIcon-root': { fontSize: 28 },
                    '& .MuiFormControlLabel-label': { color: 'grey.900' }
                  }}
                />
              </Grid>
              <Grid size={6}>
                <FormControlLabel
                  value="50-100"
                  control={<Radio />}
                  label="$50 - $100"
                  sx={{
                    '& .MuiSvgIcon-root': { fontSize: 28 },
                    '& .MuiFormControlLabel-label': { color: 'grey.900' }
                  }}
                />
              </Grid>
              <Grid size={6}>
                <FormControlLabel
                  value="100-150"
                  control={<Radio />}
                  label="$100 - $150"
                  sx={{
                    '& .MuiSvgIcon-root': { fontSize: 28 },
                    '& .MuiFormControlLabel-label': { color: 'grey.900' }
                  }}
                />
              </Grid>
              <Grid size={6}>
                <FormControlLabel
                  value="150-200"
                  control={<Radio />}
                  label="$150 - $200"
                  sx={{
                    '& .MuiSvgIcon-root': { fontSize: 28 },
                    '& .MuiFormControlLabel-label': { color: 'grey.900' }
                  }}
                />
              </Grid>
              <Grid size={6}>
                <FormControlLabel
                  value="200-99999"
                  control={<Radio />}
                  label="Over $200"
                  sx={{
                    '& .MuiSvgIcon-root': { fontSize: 28 },
                    '& .MuiFormControlLabel-label': { color: 'grey.900' }
                  }}
                />
              </Grid>
            </Grid>
          </RadioGroup>
        </FormControl>
      )}
    </>
  );
}

// ==============================|| PRODUCT GRID - RATING FILTER ||============================== //

function RatingSection({ rating, handelFilter }: { rating: number; handelFilter: (type: string, params: string, rating: number) => void }) {
  const [isRatingLoading, setRatingLoading] = useState(true);
  useEffect(() => {
    setRatingLoading(false);
  }, []);

  return (
    <>
      {isRatingLoading ? (
        <Skeleton variant="rectangular" width="100%" height={172} />
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Rating
            precision={0.5}
            name="simple-controlled"
            value={rating}
            onChange={(event, newValue) => handelFilter('rating', '', newValue!)}
          />
          <Typography component="legend">({rating})</Typography>
        </Stack>
      )}
    </>
  );
}

// ==============================|| PRODUCT GRID - FILTER ||============================== //

export default function ProductFilter({
  filter,
  handelFilter
}: {
  filter: ProductsFilter;
  handelFilter: (type: string, params: string, rating?: number) => void;
}) {
  const matchDownLG = useMediaQuery((theme: Theme) => theme.breakpoints.down('xl'));
  const { mode } = useConfig();

  const filterData = [
    {
      id: 'gender',
      defaultExpand: true,
      title: 'Gender',
      content: <Gender gender={filter.gender} handelFilter={handelFilter} />
    },
    {
      id: 'categories',
      defaultExpand: true,
      title: 'Categories',
      content: <Categories categories={filter.categories} handelFilter={handelFilter} />
    },
    {
      id: 'colors',
      defaultExpand: true,
      title: 'Colors',
      content: <Colors colors={filter.colors} handelFilter={handelFilter} />
    },
    {
      id: 'price',
      defaultExpand: true,
      title: 'Price',
      content: <Price price={filter.price} handelFilter={handelFilter} />
    },
    {
      id: 'rating',
      defaultExpand: true,
      title: 'Rating',
      content: <RatingSection rating={filter.rating} handelFilter={handelFilter} />
    }
  ];

  return (
    <MainCard border={mode !== ThemeMode.DARK} content={false} sx={{ overflow: 'visible' }}>
      <CardContent sx={{ p: 1, height: matchDownLG ? '100vh' : 'auto' }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Accordion data={filterData} />
          </Grid>
          <Grid sx={{ m: 1 }} size={12}>
            <Stack direction="row" sx={{ justifyContent: 'center', alignItems: 'center' }}>
              <Button variant="contained" fullWidth color="error" onClick={() => handelFilter('reset', '')}>
                Clear All
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </MainCard>
  );
}
