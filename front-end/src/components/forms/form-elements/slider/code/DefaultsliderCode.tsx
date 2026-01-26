import CodeDialog from "@/shared/ui/CodeDialog";


const DefaultsliderCode = () => {
    return (
        <>
            <CodeDialog>
                {`
"use client";
import * as React from 'react';
import { Slider } from '@mui/material';

<Slider defaultValue={30}  />
`}
            </CodeDialog>
        </>
    );
};

export default DefaultsliderCode;