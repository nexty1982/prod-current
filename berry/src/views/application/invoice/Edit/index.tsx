import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

// third party
import * as yup from 'yup';
import { useFormik } from 'formik';

// project imports
import ClientInfo from './ClientInfo';
import ItemList from './ItemList';
import AmountCard from './AmountCard';
import SelectItem from './SelectItem';
import InputLabel from 'ui-component/extended/Form/InputLabel';
import MainCard from 'ui-component/cards/MainCard';

import { useDispatch } from 'store';
import { gridSpacing } from 'store/constant';
import { openSnackbar } from 'store/slices/snackbar';

// types
import { UserProfile } from 'types/user-profile';
import { AddInvoice, InvoiceAmount, InvoiceItems } from 'types/invoice';

// yup validation-schema
const validationSchema = yup.object({
  invoiceNumber: yup.string().required('Invoice Number is Required'),
  customerName: yup.string().required('Client Name is Required'),
  customerEmail: yup.string().email('Enter a valid email').required('Client Email is Required'),
  customerPhone: yup.string().min(10, 'Phone number should be of minimum 10 characters').required('Client Phone is Required'),
  customerAddress: yup.string().required('Client Address is Required'),
  orderStatus: yup.string().required('Order Status is required')
});

const initialProducsData = [
  {
    id: 1,
    product: 'Canon EOS 1500D 24.1 Digital SLR',
    description: 'SLR Camera (Black) with EF S18-55...',
    quantity: 1,
    amount: 12.99,
    total: 12.99
  },
  {
    id: 2,
    product: 'Fitbit MX30 Smart Watch',
    description: '(MX30- waterproof) watch',
    quantity: 1,
    amount: 49.9,
    total: 49.9
  },
  {
    id: 3,
    product: 'Apple iPhone 13 Mini ',
    description: '13 cm (5.4-inch) Super',
    quantity: 1,
    amount: 86.99,
    total: 86.99
  }
];

// ==============================|| EDIT INVOICE ||============================== //

export default function EditInvoice() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [allAmounts, setAllAmounts] = useState<InvoiceAmount>({
    subTotal: 0,
    appliedTaxValue: 0.1,
    appliedDiscountValue: 0.05,
    taxesAmount: 0,
    discountAmount: 0,
    totalAmount: 0
  });
  const [productsData, setProductsData] = useState<InvoiceItems[]>(initialProducsData);
  const [addItemClicked, setAddItemClicked] = useState<boolean>(true);
  const [fieldValue, setFieldValue] = useState<UserProfile>();

  // to delete row in order details
  const deleteProductHandler = (id: number) => {
    setProductsData(productsData.filter((item) => item.id !== id));
  };

  const handleOnSelectValue = (value: UserProfile) => {
    setFieldValue(value);
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      client: 1,
      customerName: fieldValue?.name,
      customerEmail: fieldValue?.email,
      customerPhone: fieldValue?.contact,
      customerAddress: fieldValue?.location,
      orderStatus: 'pending'
    },

    validationSchema,
    onSubmit: (values) => {
      if (values) {
        navigate('/apps/invoice/invoice-list');
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
      }
    }
  });

  useEffect(() => {
    const amounts = {
      subTotal: 0,
      appliedTaxValue: 0.1,
      appliedDiscountValue: 0.05,
      taxesAmount: 0,
      discountAmount: 0,
      totalAmount: 0
    };
    productsData.forEach((item) => {
      amounts.subTotal += item.total as number;
    });
    amounts.taxesAmount = amounts.subTotal * amounts.appliedTaxValue;
    amounts.discountAmount = (amounts.subTotal + amounts.taxesAmount) * amounts.appliedDiscountValue;
    amounts.totalAmount = amounts.subTotal + amounts.taxesAmount - amounts.discountAmount;
    setAllAmounts(amounts);
  }, [productsData]);

  // add item handler
  const handleAddItem = (addingData: AddInvoice) => {
    setProductsData([
      ...productsData,
      {
        id: addingData.id,
        product: addingData.name,
        description: addingData.description,
        quantity: addingData.selectedQuantity,
        amount: addingData.offerPrice,
        total: addingData.totalAmount
      }
    ]);
    setAddItemClicked(false);
  };

  return (
    <MainCard>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={gridSpacing}>
          {/* client info */}
          <ClientInfo {...{ formik, handleOnSelectValue }} />

          <Grid size={12}>
            <Divider />
          </Grid>

          {/* item list page */}
          {productsData.length > 0 && (
            <Grid size={12}>
              <ItemList {...{ productsData, deleteProductHandler }} />
            </Grid>
          )}

          {addItemClicked ? (
            <Grid size={12}>
              {/* select item page */}
              <SelectItem {...{ handleAddItem, setAddItemClicked }} />
            </Grid>
          ) : (
            <Grid size={12}>
              <Button variant="text" onClick={() => setAddItemClicked(true)}>
                + Add Item
              </Button>
            </Grid>
          )}

          <Grid size={12}>
            <Divider />
          </Grid>

          {/* total card */}
          <Grid size={12}>
            <AmountCard {...{ allAmounts }} />
          </Grid>

          <Grid size={12}>
            <Divider />
          </Grid>

          <Grid size={12}>
            <Stack>
              <InputLabel required>Terms and Condition:</InputLabel>
              <TextField
                fullWidth
                id="customerAddress"
                name="customerAddress"
                defaultValue="I acknowledge terms and conditions."
                multiline
                placeholder="Enter Address"
              />
            </Stack>
          </Grid>

          <Grid size={12}>
            <Divider />
          </Grid>

          <Grid sx={{ display: 'flex', justifyContent: 'flex-end' }} size={12}>
            <Button variant="contained" type="submit">
              Submit
            </Button>
          </Grid>
        </Grid>
      </form>
    </MainCard>
  );
}
