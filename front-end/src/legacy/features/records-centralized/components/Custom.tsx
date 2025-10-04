
import { Box } from '@mui/material';

import CustomSwitch from '@/features/misc-legacy/theme-elements/CustomSwitch';


const CustomExSwitch = () => (
    <Box textAlign="center">
        <CustomSwitch checked />
        <CustomSwitch />
        <CustomSwitch disabled defaultChecked />
        <CustomSwitch disabled />
    </Box>
);
export default CustomExSwitch;
