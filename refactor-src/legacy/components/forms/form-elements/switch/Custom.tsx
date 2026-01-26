
import { Box } from '@mui/material';

import CustomSwitch from '../../theme-elements/CustomSwitch.tsx';


const CustomExSwitch = () => (
    <Box textAlign="center">
        <CustomSwitch checked />
        <CustomSwitch />
        <CustomSwitch disabled defaultChecked />
        <CustomSwitch disabled />
    </Box>
);
export default CustomExSwitch;
