import CodeDialog from '@/shared/ui/CodeDialog';

const DefaultLabelSwitchCode = () => {
  return (
    <>
      <CodeDialog>
        {`
"use client";

import { Box, Switch, FormGroup, FormControlLabel } from '@mui/material';

<Box textAlign="center">
    <FormGroup>
        <FormControlLabel control={<Switch defaultChecked />} label="Label" />
        <FormControlLabel disabled control={<Switch />} label="Disabled" />
    </FormGroup>
</Box>
`}
      </CodeDialog>
    </>
  );
};

export default DefaultLabelSwitchCode;
