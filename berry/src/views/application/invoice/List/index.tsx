import { useEffect, useState } from 'react';

// material-ui
import CardContent from '@mui/material/CardContent';

// project imports
import InvoiceFilter from './InvoiceFilter';
import InvoiceTable from './InvoiceTable';
import MainCard from 'ui-component/cards/MainCard';

import { dispatch, useSelector } from 'store';
import { getInvoice } from 'store/slices/customer';

// types
import { Invoice } from 'types/invoice';

// ==============================|| INVOICE LIST ||============================== //

export default function InvoiceList() {
  const { invoices } = useSelector((state) => state.customer);

  const [rows, setRows] = useState<Invoice[]>([]);

  useEffect(() => {
    dispatch(getInvoice());
  }, []);

  useEffect(() => {
    setRows(invoices);
  }, [invoices]);

  return (
    <MainCard content={false}>
      {/* filter section */}
      <CardContent>
        <InvoiceFilter {...{ rows: invoices, setRows }} />
      </CardContent>
      {/* table */}
      <InvoiceTable {...{ rows }} />
    </MainCard>
  );
}
