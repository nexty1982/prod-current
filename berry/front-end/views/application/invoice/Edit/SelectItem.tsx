import { useEffect, useState } from 'react';
import { useLoaderData } from 'react-router-dom';

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

// types
import { Products } from 'types/e-commerce';
import { AddInvoice } from 'types/invoice';

// ==============================|| EDIT INVOICE - SELECT ITEM ||============================== //

interface Props {
  handleAddItem: (item: AddInvoice) => void;
  setAddItemClicked: (item: boolean) => void;
}

export default function SelectItem({ handleAddItem, setAddItemClicked }: Props) {
  const products = useLoaderData() as Products[];

  const [selectedItem, setSelectedItem] = useState<AddInvoice>();
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [amount, setAmount] = useState(0);
  const [rows, setRows] = useState<Products[]>([]);
  const [errors, setErrors] = useState({
    quantityError: ''
  });

  useEffect(() => {
    setRows(products);
  }, [products]);

  useEffect(() => {
    if (selectedItem?.id) {
      setAmount(selectedItem?.offerPrice! * selectedQuantity);
    }
  }, [selectedItem?.id, selectedItem?.offerPrice, selectedQuantity]);

  const handleEditInvoiceItem = (event: any) => {
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
      const selectedOption = rows.find((item) => item.id === value);
      setSelectedItem(selectedOption as AddInvoice | undefined);
    }
  };

  const handleOnAddItem = () => {
    const data = {
      ...selectedItem,
      totalAmount: amount,
      selectedQuantity
    };

    handleAddItem(data as AddInvoice);
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={1}>
          <Typography sx={{ color: 'grey.500', fontWeight: '400' }}>Item Name</Typography>
          <FormControl>
            <Select
              fullWidth
              displayEmpty
              value={selectedItem?.id || ''}
              onChange={handleEditInvoiceItem}
              input={<OutlinedInput />}
              slotProps={{ input: { 'aria-label': 'Without label' } }}
            >
              <MenuItem disabled value="">
                <Typography color="textSecondary">Select Item</Typography>
              </MenuItem>
              {rows.map((item, i) => (
                <MenuItem key={i} value={item.id}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography variant="subtitle1">{item.name}</Typography>
                    <Typography>Rate : {item.offerPrice}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={1}>
          <Typography sx={{ color: 'grey.500', fontWeight: '400' }}>Quantity</Typography>
          <TextField
            fullWidth
            type="number"
            name="quantity"
            value={selectedQuantity}
            onChange={handleEditInvoiceItem}
            error={Boolean(errors.quantityError)}
            helperText={errors.quantityError}
            disabled={!selectedItem?.id}
          />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={1}>
          <Typography sx={{ color: 'grey.500', fontWeight: '400' }}>Amount</Typography>
          <TextField fullWidth name="amount" value={Math.round(amount * 100) / 100} disabled />
        </Stack>
      </Grid>
      <Grid size={12}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button color="error" onClick={() => setAddItemClicked(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedItem?.id || !selectedQuantity} variant="contained" size="small" onClick={handleOnAddItem}>
            Add
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}
