import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Card,
    CardContent,
    Button,
    Stack
} from '@mui/material';
import {
    Business as ChurchIcon,
    TableChart as RecordsIcon,
    Settings as SettingsIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

interface Church {
    id: number;
    church_id: number;
    name: string;
    database_name: string;
}

interface Column {
    column_name: string;
    ordinal_position: number;
    data_type: string;
    is_nullable: boolean;
    column_default: string;
    column_comment: string;
}

interface EnhancedRecordsResponse {
    success: boolean;
    data: {
        columns: Column[];
        mapping: Record<string, string>;
        rows: Record<string, any>[];
    };
    meta: {
        churchId: number;
        database: string;
        table: string;
        rowCount: number;
        columnCount: number;
    };
    timestamp: string;
}

const RecordsAgGrid: React.FC = () => {
    const { user, hasRole } = useAuth();

    // State management
    const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
    const [availableChurches, setAvailableChurches] = useState<Church[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [availableTables, setAvailableTables] = useState<string[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [recordsData, setRecordsData] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper function to get column display name
    const getColumnDisplayName = (columnName: string): string => {
        return mapping[columnName] || columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Fetch available tables when church changes
    useEffect(() => {
        if (!selectedChurch?.database_name) return;

        const fetchTables = async () => {
            try {
                const response = await fetch(`/api/records/tables?db=${selectedChurch.database_name}`, {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch tables: ${response.status} ${response.statusText}`);
                }

                const tables = await response.json();
                setAvailableTables(Array.isArray(tables) ? tables : []);

                // Auto-select first table if available
                if (tables.length > 0 && !selectedTable) {
                    setSelectedTable(tables[0]);
                }
            } catch (err) {
                console.error('Error fetching tables:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch tables');
            }
        };

        fetchTables();
    }, [selectedChurch]);

    // Fetch records data when church and table are selected
    useEffect(() => {
        if (!selectedChurch?.database_name || !selectedTable) return;

        const fetchRecordsData = async () => {
            setDataLoading(true);
            setError(null);

            try {
                const churchId = selectedChurch.id || selectedChurch.church_id;
                const response = await fetch(
                    `/api/records/enhanced?db=${selectedChurch.database_name}&table=${selectedTable}&churchId=${churchId}`, 
                    {
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' },
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch records data: ${response.status} ${response.statusText}`);
                }

                const result: EnhancedRecordsResponse = await response.json();
                console.log('Enhanced Records API response:', result);

                if (!result.success) {
                    throw new Error('API request failed');
                }

                setColumns(result.data.columns || []);
                setMapping(result.data.mapping || {});
                setRecordsData(result.data.rows || []);

            } catch (err) {
                console.error('Error fetching records data:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch records data');
                setColumns([]);
                setMapping({});
                setRecordsData([]);
            } finally {
                setDataLoading(false);
            }
        };

        fetchRecordsData();
    }, [selectedChurch, selectedTable]);

    // Listen for field mapping updates from child windows
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'FIELD_MAPPING_SAVED' && 
                event.data.table === selectedTable &&
                event.data.churchId === String(selectedChurch?.id || selectedChurch?.church_id)) {
                console.log('Field mapping updated, refreshing records...');
                
                // Re-fetch records data to get updated mappings
                if (selectedChurch?.database_name && selectedTable) {
                    const churchId = selectedChurch.id || selectedChurch.church_id;
                    fetch(`/api/records/enhanced?db=${selectedChurch.database_name}&table=${selectedTable}&churchId=${churchId}`, {
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' },
                    })
                    .then(response => response.json())
                    .then((result: EnhancedRecordsResponse) => {
                        if (result.success) {
                            setColumns(result.data.columns || []);
                            setMapping(result.data.mapping || {});
                            setRecordsData(result.data.rows || []);
                        }
                    })
                    .catch(err => console.error('Error refreshing records after mapping update:', err));
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [selectedChurch, selectedTable]);

    // Open field mapper
    const openFieldMapper = () => {
        if (selectedChurch && selectedTable) {
            const churchId = selectedChurch.id || selectedChurch.church_id;
            const mapperUrl = `/apps/church-management/${churchId}/field-mapper`;
            window.open(mapperUrl, "_blank", "noopener,noreferrer,width=1200,height=800");
        }
    };

    // Manual refresh
    const handleRefresh = () => {
        if (selectedChurch?.database_name && selectedTable) {
            const churchId = selectedChurch.id || selectedChurch.church_id;
            setDataLoading(true);
            fetch(`/api/records/enhanced?db=${selectedChurch.database_name}&table=${selectedTable}&churchId=${churchId}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' },
            })
            .then(response => response.json())
            .then((result: EnhancedRecordsResponse) => {
                if (result.success) {
                    setColumns(result.data.columns || []);
                    setMapping(result.data.mapping || {});
                    setRecordsData(result.data.rows || []);
                }
            })
            .catch(err => {
                console.error('Error refreshing records:', err);
                setError(err instanceof Error ? err.message : 'Failed to refresh records');
            })
            .finally(() => setDataLoading(false));
        }
    };

    // Fetch available churches
    useEffect(() => {
        const fetchChurches = async () => {
            try {
                // Try admin endpoint first (for super admins)
                let response = await fetch('/api/admin/churches?is_active=1', {
                    credentials: 'include'
                });

                // If admin endpoint fails, try regular churches endpoint
                if (!response.ok && response.status === 403) {
                    console.log('Admin endpoint not accessible, trying regular churches endpoint');
                    response = await fetch('/api/churches', {
                        credentials: 'include'
                    });
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch churches: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Churches API response:', data);

                // Extract churches from response - handle different formats
                let churches: Church[] = [];
                if (data.churches && Array.isArray(data.churches)) {
                    churches = data.churches;
                } else if (Array.isArray(data)) {
                    churches = data;
                } else {
                    console.warn('Expected churches array, got:', typeof data, data);
                    throw new Error('Invalid churches data format received');
                }

                setAvailableChurches(churches);

            } catch (err) {
                console.error('Error fetching churches:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch churches');
                setAvailableChurches([]); // Ensure it's always an array
            } finally {
                setLoading(false);
            }
        };

        fetchChurches();
    }, []);

    // Handle church selection
    const handleChurchChange = (churchId: number) => {
        const church = availableChurches.find((c) => c.id === churchId || c.church_id === churchId);
        setSelectedChurch(church || null);
        setSelectedTable('');
        setColumns([]);
        setMapping({});
        setRecordsData([]);
    };

    // Handle table selection
    const handleTableChange = (tableName: string) => {
        setSelectedTable(tableName);
    };

    // Format cell value for display
    const formatCellValue = (value: any): string => {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (value instanceof Date) {
            return value.toLocaleDateString();
        }
        return String(value);
    };

    // Render church selector
    const renderChurchSelector = () => (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <FormControl fullWidth>
                    <InputLabel>Select Church</InputLabel>
                    <Select
                        value={selectedChurch?.id || selectedChurch?.church_id || ''}
                        onChange={(e) => handleChurchChange(e.target.value as number)}
                        label="Select Church"
                    >
                        {availableChurches.map((church) => (
                            <MenuItem key={church.id || church.church_id} value={church.id || church.church_id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <ChurchIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography sx={{ flexGrow: 1 }}>
                                        {church.name}
                                    </Typography>
                                    <Chip
                                        label={church.database_name}
                                        size="small"
                                        variant="outlined"
                                        sx={{ ml: 'auto' }}
                                    />
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </CardContent>
        </Card>
    );

    // Render table selector and controls
    const renderTableSelector = () => {
        if (availableTables.length === 0) return null;

        return (
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl sx={{ minWidth: 200, flexGrow: 1 }}>
                            <InputLabel>Select Table</InputLabel>
                            <Select
                                value={selectedTable}
                                onChange={(e) => handleTableChange(e.target.value)}
                                label="Select Table"
                            >
                                {availableTables.map((tableName) => (
                                    <MenuItem key={tableName} value={tableName}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                            <RecordsIcon sx={{ mr: 1, color: 'primary.main' }} />
                                            <Typography sx={{ flexGrow: 1 }}>
                                                {tableName}
                                            </Typography>
                                            <Chip
                                                label={`${recordsData.length || 0} records`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ ml: 'auto' }}
                                            />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={dataLoading || !selectedTable}
                        >
                            Refresh
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<SettingsIcon />}
                            onClick={openFieldMapper}
                            disabled={!selectedChurch || !selectedTable}
                        >
                            Open Field Mapper
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        );
    };

    // Render table data
    const renderTableData = () => {
        if (!selectedTable || recordsData.length === 0) {
            if (!selectedTable) {
                return (
                    <Alert severity="info">
                        Please select a table to view its data.
                    </Alert>
                );
            } else if (dataLoading) {
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                );
            } else {
                return (
                    <Alert severity="info">
                        No records found in table {selectedTable}.
                    </Alert>
                );
            }
        }

        if (columns.length === 0) {
            return (
                <Alert severity="warning">
                    Table {selectedTable} appears to have no columns.
                </Alert>
            );
        }

        return (
            <Paper>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6">
                        {selectedTable}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {recordsData.length} records • {columns.length} columns
                    </Typography>
                </Box>

                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell 
                                        key={column.column_name} 
                                        sx={{ fontWeight: 'bold' }}
                                        title={`${column.column_name} (${column.data_type})`}
                                    >
                                        {getColumnDisplayName(column.column_name)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dataLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center">
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recordsData.map((row, rowIndex) => (
                                    <TableRow key={rowIndex} hover>
                                        {columns.map((column) => (
                                            <TableCell key={column.column_name}>
                                                {formatCellValue(row[column.column_name])}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    // Main render
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Church Records with Field Mapping
            </Typography>

            <Typography variant="body1" color="text.secondary" gutterBottom>
                Enhanced records browser with custom field mappings. Column headers reflect your custom mappings from the Field Mapper.
            </Typography>

            {renderChurchSelector()}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : selectedChurch ? (
                <>
                    {renderTableSelector()}
                    {renderTableData()}
                </>
            ) : (
                <Alert severity="info">
                    Please select a church to view its records.
                </Alert>
            )}
        </Box>
    );
};

export default RecordsAgGrid;
