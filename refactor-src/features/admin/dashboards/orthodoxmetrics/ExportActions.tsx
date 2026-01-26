// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Stack,
    Divider
} from '@mui/material';
import {
    IconDownload,
    IconFileText,
    IconTableExport,
    IconFileSpreadsheet
} from '@tabler/icons-react';

const ExportActions = () => {
    const handleExport = (type: string) => {
        console.log(`Exporting ${type}...`);
        // Add export logic here
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" mb={3}>
                    Quick Export
                </Typography>

                <Stack spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<IconFileSpreadsheet />}
                        onClick={() => handleExport('csv')}
                        fullWidth
                        sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                        <Box>
                            <Typography variant="body1" fontWeight={600}>
                                Export to CSV
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                All records in spreadsheet format
                            </Typography>
                        </Box>
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<IconFileText />}
                        onClick={() => handleExport('pdf')}
                        fullWidth
                        sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                        <Box>
                            <Typography variant="body1" fontWeight={600}>
                                Generate PDF Report
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Formatted administrative report
                            </Typography>
                        </Box>
                    </Button>

                    <Divider />

                    <Button
                        variant="contained"
                        startIcon={<IconTableExport />}
                        onClick={() => handleExport('backup')}
                        fullWidth
                        sx={{ py: 1.5 }}
                        color="primary"
                    >
                        <Box>
                            <Typography variant="body1" fontWeight={600}>
                                Create Data Backup
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                Complete system backup
                            </Typography>
                        </Box>
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default ExportActions;
