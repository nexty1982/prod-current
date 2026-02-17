import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

// project imports
import DetailsTab from './DetailsTab';
import InvoiceTab from './InvoiceTab';
import StatusTab from './StatusTab';
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';

// assets
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import LocalShippingTwoToneIcon from '@mui/icons-material/LocalShippingTwoTone';
import ReceiptTwoToneIcon from '@mui/icons-material/ReceiptTwoTone';

// types
import { TabsProps } from 'types';

// tab content
function TabPanel({ children, value, index, ...other }: TabsProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// ==============================|| INVOICE DETAILS ||============================== //

export default function InvoiceDetails() {
  const theme = useTheme();

  // set selected tab
  const [value, setValue] = useState<number>(0);
  const handleChangeTabs = (event: React.SyntheticEvent<Element, Event>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <MainCard>
      <Tabs
        value={value}
        indicatorColor="primary"
        textColor="primary"
        onChange={handleChangeTabs}
        variant="scrollable"
        aria-label="simple tabs example"
        sx={{
          '& .MuiTab-root': {
            minHeight: 'auto',
            minWidth: 10,
            px: 1,
            py: 1.5,
            mr: 2.25,
            color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
          },
          '& .Mui-selected': {
            color: 'primary.main'
          },
          '& .MuiTab-root > svg': {
            marginBottom: '0px !important',
            marginRight: 1.25
          },
          mb: 3
        }}
      >
        <Tab icon={<DescriptionTwoToneIcon />} label="Details" iconPosition="start" {...a11yProps(0)} />
        <Tab icon={<ReceiptTwoToneIcon />} label="Invoice" iconPosition="start" {...a11yProps(1)} />
        <Tab icon={<LocalShippingTwoToneIcon />} label="Status" iconPosition="start" {...a11yProps(2)} />
      </Tabs>

      {/* tab - details */}
      <TabPanel value={value} index={0}>
        <DetailsTab />
      </TabPanel>

      {/* tab - invoice */}
      <TabPanel value={value} index={1}>
        <InvoiceTab />
      </TabPanel>

      {/* tab - status */}
      <TabPanel value={value} index={2}>
        <StatusTab />
      </TabPanel>
    </MainCard>
  );
}
