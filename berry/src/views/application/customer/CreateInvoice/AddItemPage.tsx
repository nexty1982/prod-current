import { useEffect, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import { gridSpacing } from 'store/constant';

// ==============================|| ADD ITEM PAGE ||============================== //

export default function AddItemPage({ handleAddItem, setAddItemClicked }: any) {
  const [selectedItem, setSelectedItem] = useState<any | null>({});
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [amount, setAmount] = useState(0);
  const [errors, setErrors] = useState({
    quantityError: ''
  });

  const itemList = [
    {
      id: 111,
      name: 'Product Name 1',
      amount: 260,
      desc: 'Product Description 1'
    },
    {
      id: 112,
      name: 'Product Name 2',
      amount: 200,
      desc: 'Product Description 2'
    },
    {
      id: 113,
      name: 'Product Name 3',
      amount: 300,
      desc: 'Product Description 3'
    }
  ];

  useEffect(() => {
    if (selectedItem.id) {
      setAmount(selectedItem.amount * selectedQuantity);
    }
  }, [selectedQuantity, selectedItem]);

  const handleChange = (event: any) => {
    const value = event.target.value;
    if (event.target.name === 'quantity') {
      if (Number(value) < 0) {
        setErrors({
          ...errors,
          quantityError: 'negative values not allowed'
        });
        setSelectedQuantity(value);
      } else if (Number(value) === 0) {
        setErrors({
          ...errors,
          quantityError: 'quantity can not be zero'
        });
        setSelectedQuantity(value);
      } else {
        setSelectedQuantity(value);
        setErrors({
          ...errors,
          quantityError: ''
        });
      }
    } else {
      const selectedOption: any = itemList.find((item) => item.id === value);
      setSelectedItem(selectedOption);
    }
  };

  const handleOk = () => {
    const data = {
      ...selectedItem,
      totalAmount: amount,
      selectedQuantity
    };

    handleAddItem(data);
  };

  return (
    <>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1">Product Name</Typography>
            <FormControl>
              <Select
                fullWidth
                displayEmpty
                value={selectedItem?.id || ''}
                onChange={handleChange}
                input={<OutlinedInput />}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return (
                      <Typography color="textSecondary" sx={{ lineHeight: '1.4375em' }}>
                        Select Product
                      </Typography>
                    );
                  }

                  const selectedData = itemList.filter((item) => item.id === selected)[0];

                  return (
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography variant="subtitle1" sx={{ lineHeight: '1.4375em' }}>
                        {selectedData.name}
                      </Typography>
                      <Typography>Rate : {selectedData.amount}</Typography>
                    </Stack>
                  );
                }}
                slotProps={{ input: { 'aria-label': 'Without label' } }}
              >
                <MenuItem disabled value="">
                  <Typography color="textSecondary">Select Product</Typography>
                </MenuItem>
                {itemList.map((item, i) => (
                  <MenuItem key={i} value={item.id}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography variant="subtitle1">{item.name}</Typography>
                      <Typography>Rate : {item.amount}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1" id="itemQuantity">
              Quantity
            </Typography>
            <TextField
              fullWidth
              type="number"
              name="quantity"
              value={selectedQuantity}
              onChange={handleChange}
              error={Boolean(errors.quantityError)}
              helperText={errors.quantityError}
              disabled={!selectedItem.id}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1" id="itemAmount">
              Amount
            </Typography>
            <TextField fullWidth name="amount" value={amount} disabled />
          </Stack>
        </Grid>
        <Grid container sx={{ justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button color="error" onClick={() => setAddItemClicked(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedItem.id || !selectedQuantity || Boolean(errors.quantityError)}
              variant="contained"
              size="small"
              onClick={handleOk}
            >
              Add
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
