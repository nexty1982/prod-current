// material-ui
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import { PaymentOptionsProps } from 'types/e-commerce';

// ==============================|| CHECKOUT PAYMENT - OPTIONS ||============================== //

export default function PaymentSelect({ item }: { item: PaymentOptionsProps }) {
  return (
    <SubCard content={false}>
      <Box sx={{ p: 2 }}>
        <FormControlLabel
          value={item.value}
          control={<Radio />}
          label={
            <Stack spacing={1} direction="row" sx={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Stack spacing={0} sx={{ width: '100%' }}>
                <Typography variant="subtitle1">{item.title}</Typography>
                <Typography variant="caption">{item.caption}</Typography>
              </Stack>
              <Box
                sx={{
                  backgroundImage: `url(${item.image})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'right',
                  borderColor: 'error.light',
                  ...item.size
                }}
              />
            </Stack>
          }
          sx={{
            width: '100%',
            '& .MuiSvgIcon-root': { fontSize: 32 },
            '& .MuiFormControlLabel-label': { width: '100%' }
          }}
        />
      </Box>
    </SubCard>
  );
}
