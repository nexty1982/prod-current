import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Stack,
    Chip,
    Alert,
    CircularProgress,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Divider,
    Badge,
    Card,
    CardContent,
    Grid,
    Switch,
    FormControlLabel,
    Tabs,
    Tab,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    Search,
    Refresh,
    Download,
    FilterList,
    Info,
    Close,
    Visibility,
    VisibilityOff,
    ZoomIn,
    ZoomOut,
    CenterFocusStrong,
    AccountTree,
    Code,
    Route,
    Api,
    Extension,
    Dashboard,
    ExpandMore
} from '@mui/icons-material';

// Cytoscape imports
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import popper from 'cytoscape-popper';

// Register Cytoscape extensions
cytoscape.use(dagre);
cytoscape.use(popper);

interface FileNode {
    id: string;
    type: 'page' | 'component' | 'layout' | 'route' | 'api' | 'hook';
    label: string;
    path: string;
    content?: string;
    imports: string[];
    exports: string[];
    apiCalls: string[];
    routeDefinitions: RouteDefinition[];
}

interface RouteDefinition {
    path: string;
    component: string;
    layout?: string;
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: 'imports' | 'renders' | 'calls' | 'routes' | 'layout';
}

interface ProjectStructure {
    nodes: FileNode[];
    edges: GraphEdge[];
    stats: {
        pages: number;
        components: number;
        layouts: number;
        apis: number;
        hooks: number;
        routes: number;
    };
}

const SiteStructureVisualizer: React.FC = () => {
    const [structure, setStructure] = useState<ProjectStructure | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['page', 'component', 'layout', 'route', 'api', 'hook']);
    const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
    const [showNodeDetails, setShowNodeDetails] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [layoutName, setLayoutName] = useState('dagre');
    const [showLabels, setShowLabels] = useState(true);
    const [groupByType, setGroupByType] = useState(false);

    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstance = useRef<cytoscape.Core | null>(null);

    // File scanning and parsing utilities
    const scanProjectFiles = useCallback(async (): Promise<ProjectStructure> => {
        const nodes: FileNode[] = [];
        const edges: GraphEdge[] = [];
        const stats = { pages: 0, components: 0, layouts: 0, apis: 0, hooks: 0, routes: 0 };

        try {
            // In a real implementation, this would use Node.js fs module or a webpack context
            // For demo purposes, we'll simulate scanning common file patterns
            const simulatedFiles = await simulateFileScan();
            
            for (const file of simulatedFiles) {
                const node = await parseFile(file);
                if (node) {
                    nodes.push(node);
                    stats[node.type]++;
                }
            }

            // Generate edges based on relationships
            for (const node of nodes) {
                // Import relationships
                for (const importPath of node.imports) {
                    const targetNode = nodes.find(n => 
                        n.path.includes(importPath) || n.label === importPath
                    );
                    if (targetNode) {
                        edges.push({
                            id: `${node.id}-imports-${targetNode.id}`,
                            source: node.id,
                            target: targetNode.id,
                            type: 'imports'
                        });
                    }
                }

                // API call relationships
                for (const apiCall of node.apiCalls) {
                    const apiNode = nodes.find(n => n.type === 'api' && n.path.includes(apiCall));
                    if (apiNode) {
                        edges.push({
                            id: `${node.id}-calls-${apiNode.id}`,
                            source: node.id,
                            target: apiNode.id,
                            type: 'calls'
                        });
                    }
                }

                // Route relationships
                for (const route of node.routeDefinitions) {
                    const componentNode = nodes.find(n => n.label === route.component);
                    if (componentNode) {
                        edges.push({
                            id: `${node.id}-routes-${componentNode.id}`,
                            source: node.id,
                            target: componentNode.id,
                            type: 'routes'
                        });
                    }

                    if (route.layout) {
                        const layoutNode = nodes.find(n => n.label === route.layout);
                        if (layoutNode) {
                            edges.push({
                                id: `${componentNode?.id}-layout-${layoutNode.id}`,
                                source: componentNode?.id || node.id,
                                target: layoutNode.id,
                                type: 'layout'
                            });
                        }
                    }
                }
            }

            return { nodes, edges, stats };
        } catch (err) {
            throw new Error(`Failed to scan project: ${err}`);
        }
    }, []);

    // Simulate file scanning (in real implementation, this would scan actual files)
    const simulateFileScan = async (): Promise<any[]> => {
        return [
            // Pages
            { path: '/src/views/dashboard/Dashboard.tsx', type: 'page' },
            { path: '/src/views/apps/chat/ChatApp.tsx', type: 'page' },
            { path: '/src/views/apps/ecommerce/Shop.tsx', type: 'page' },
            { path: '/src/views/auth/Login.tsx', type: 'page' },
            { path: '/src/views/admin/UserManagement.tsx', type: 'page' },
            
            // Components
            { path: '/src/components/shared/RecordList.tsx', type: 'component' },
            { path: '/src/components/navigation/HeaderNav.tsx', type: 'component' },
            { path: '/src/components/forms/RecordForm.tsx', type: 'component' },
            { path: '/src/components/notifications/NotificationList.tsx', type: 'component' },
            
            // Layouts
            { path: '/src/layouts/MainLayout.tsx', type: 'layout' },
            { path: '/src/layouts/AuthLayout.tsx', type: 'layout' },
            { path: '/src/layouts/MinimalLayout.tsx', type: 'layout' },
            
            // Routes
            { path: '/src/routes/Router.tsx', type: 'route' },
            { path: '/src/routes/AuthRoutes.tsx', type: 'route' },
            
            // API endpoints
            { path: '/api/churches', type: 'api' },
            { path: '/api/records/baptism', type: 'api' },
            { path: '/api/users', type: 'api' },
            { path: '/api/social/notifications', type: 'api' },
            
            // Hooks
            { path: '/src/hooks/useRecords.ts', type: 'hook' },
            { path: '/src/hooks/useAuth.ts', type: 'hook' },
            { path: '/src/hooks/useNotifications.ts', type: 'hook' }
        ];
    };

    // Parse individual file content
    const parseFile = async (file: any): Promise<FileNode | null> => {
        const fileName = file.path.split('/').pop()?.replace(/\.(tsx|jsx|ts|js)$/, '') || '';
        const fileType = determineFileType(file.path, fileName);
        
        // Simulate parsing file content
        const mockContent = await simulateFileContent(file.path, fileType);
        
        return {
            id: `${fileType}-${fileName}`,
            type: fileType,
            label: fileName,
            path: file.path,
            content: mockContent.content,
            imports: mockContent.imports,
            exports: mockContent.exports,
            apiCalls: mockContent.apiCalls,
            routeDefinitions: mockContent.routes
        };
    };

    // Determine file type based on path and name
    const determineFileType = (path: string, fileName: string): FileNode['type'] => {
        if (path.includes('/views/') || path.includes('/pages/')) return 'page';
        if (path.includes('/layouts/')) return 'layout';
        if (path.includes('/routes/') || fileName.includes('Router')) return 'route';
        if (path.includes('/hooks/') || fileName.startsWith('use')) return 'hook';
        if (path.startsWith('/api/')) return 'api';
        return 'component';
    };

    // Simulate file content parsing
    const simulateFileContent = async (path: string, type: FileNode['type']) => {
        const mockData = {
            content: `// ${path}`,
            imports: [] as string[],
            exports: [] as string[],
            apiCalls: [] as string[],
            routes: [] as RouteDefinition[]
        };

        // Add realistic mock data based on file type
        switch (type) {
            case 'page':
                mockData.imports = ['React', 'MainLayout', 'RecordList'];
                mockData.apiCalls = ['/api/records', '/api/users'];
                break;
            case 'component':
                mockData.imports = ['React', 'MaterialUI'];
                break;
            case 'layout':
                mockData.imports = ['React', 'HeaderNav', 'Sidebar'];
                break;
            case 'route':
                mockData.routes = [
                    { path: '/dashboard', component: 'Dashboard', layout: 'MainLayout' },
                    { path: '/login', component: 'Login', layout: 'AuthLayout' }
                ];
                break;
            case 'hook':
                mockData.exports = ['useRecords', 'useAuth'];
                mockData.apiCalls = ['/api/records'];
                break;
        }

        return mockData;
    };

    // Initialize Cytoscape graph
    const initializeCytoscape = useCallback((projectStructure: ProjectStructure) => {
        if (!cyRef.current) return;

        const filteredNodes = projectStructure.nodes.filter(node => 
            selectedTypes.includes(node.type) &&
            (searchTerm === '' || 
             node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
             node.path.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const filteredEdges = projectStructure.edges.filter(edge =>
            filteredNodes.some(n => n.id === edge.source) &&
            filteredNodes.some(n => n.id === edge.target)
        );

        const elements = [
            ...filteredNodes.map(node => ({
                data: {
                    id: node.id,
                    label: showLabels ? node.label : '',
                    type: node.type,
                    path: node.path,
                    nodeData: node
                }
            })),
            ...filteredEdges.map(edge => ({
                data: {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    type: edge.type
                }
            }))
        ];

        const cy = cytoscape({
            container: cyRef.current,
            elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '12px',
                        'width': '60px',
                        'height': '60px',
                        'border-width': '2px',
                        'border-color': '#ffffff'
                    }
                },
                {
                    selector: 'node[type="page"]',
                    style: {
                        'background-color': '#2196F3',
                        'shape': 'round-rectangle'
                    }
                },
                {
                    selector: 'node[type="component"]',
                    style: {
                        'background-color': '#FF9800',
                        'shape': 'ellipse'
                    }
                },
                {
                    selector: 'node[type="layout"]',
                    style: {
                        'background-color': '#9C27B0',
                        'shape': 'diamond'
                    }
                },
                {
                    selector: 'node[type="route"]',
                    style: {
                        'background-color': '#4CAF50',
                        'shape': 'triangle'
                    }
                },
                {
                    selector: 'node[type="api"]',
                    style: {
                        'background-color': '#607D8B',
                        'shape': 'round-rectangle'
                    }
                },
                {
                    selector: 'node[type="hook"]',
                    style: {
                        'background-color': '#00BCD4',
                        'shape': 'hexagon'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': '2px',
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                },
                {
                    selector: 'edge[type="imports"]',
                    style: {
                        'line-color': '#2196F3',
                        'target-arrow-color': '#2196F3'
                    }
                },
                {
                    selector: 'edge[type="calls"]',
                    style: {
                        'line-color': '#FF5722',
                        'target-arrow-color': '#FF5722'
                    }
                },
                {
                    selector: 'edge[type="routes"]',
                    style: {
                        'line-color': '#4CAF50',
                        'target-arrow-color': '#4CAF50'
                    }
                },
                {
                    selector: 'edge[type="layout"]',
                    style: {
                        'line-color': '#9C27B0',
                        'target-arrow-color': '#9C27B0'
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'border-width': '4px',
                        'border-color': '#FF4444'
                    }
                }
            ],
            layout: {
                name: layoutName,
                directed: true,
                padding: 20,
                spacingFactor: 1.5,
                ...(layoutName === 'dagre' && {
                    rankDir: 'TB',
                    ranker: 'longest-path'
                })
            }
        });

        // Add event listeners
        cy.on('tap', 'node', (evt) => {
            const nodeData = evt.target.data('nodeData');
            setSelectedNode(nodeData);
            setShowNodeDetails(true);
        });

        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                cy.$(':selected').unselect();
            }
        });

        cyInstance.current = cy;

        return cy;
    }, [selectedTypes, searchTerm, showLabels, layoutName]);

    // Scan project structure
    const handleScan = async () => {
        setLoading(true);
        setError(null);
        try {
            const projectStructure = await scanProjectFiles();
            setStructure(projectStructure);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Export graph
    const handleExport = (format: 'png' | 'jpg' | 'json') => {
        if (!cyInstance.current) return;

        switch (format) {
            case 'png':
            case 'jpg':
                const blob = cyInstance.current.png({ 
                    output: 'blob',
                    bg: 'white',
                    full: true,
                    scale: 2
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `site-structure.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                break;
            case 'json':
                const data = {
                    structure,
                    elements: cyInstance.current.elements().jsons()
                };
                const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { 
                    type: 'application/json' 
                });
                const jsonUrl = URL.createObjectURL(jsonBlob);
                const jsonA = document.createElement('a');
                jsonA.href = jsonUrl;
                jsonA.download = 'site-structure.json';
                jsonA.click();
                URL.revokeObjectURL(jsonUrl);
                break;
        }
    };

    // Zoom controls
    const handleZoom = (direction: 'in' | 'out' | 'fit') => {
        if (!cyInstance.current) return;
        
        switch (direction) {
            case 'in':
                cyInstance.current.zoom(cyInstance.current.zoom() * 1.2);
                break;
            case 'out':
                cyInstance.current.zoom(cyInstance.current.zoom() * 0.8);
                break;
            case 'fit':
                cyInstance.current.fit();
                break;
        }
    };

    // Initialize on mount
    useEffect(() => {
        handleScan();
    }, []);

    // Update graph when structure or filters change
    useEffect(() => {
        if (structure) {
            initializeCytoscape(structure);
        }
    }, [structure, initializeCytoscape]);

    const nodeTypeColors = {
        page: '#2196F3',
        component: '#FF9800',
        layout: '#9C27B0',
        route: '#4CAF50',
        api: '#607D8B',
        hook: '#00BCD4'
    };

    const nodeTypeIcons = {
        page: <Dashboard />,
        component: <Extension />,
        layout: <AccountTree />,
        route: <Route />,
        api: <Api />,
        hook: <Code />
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper sx={{ p: 2, mb: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h5" sx={{ flexGrow: 1 }}>
                        Site Structure Visualizer
                    </Typography>
                    
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleScan}
                        disabled={loading}
                    >
                        {loading ? 'Scanning...' : 'Scan Project'}
                    </Button>
                </Stack>
            </Paper>

            <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
                {/* Controls Panel */}
                <Paper sx={{ width: 350, p: 2, mr: 1, overflow: 'auto' }}>
                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                        <Tab label="Filters" />
                        <Tab label="Stats" />
                        <Tab label="Export" />
                    </Tabs>

                    {activeTab === 0 && (
                        <Stack spacing={2}>
                            {/* Search */}
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search nodes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                                }}
                            />

                            {/* Node Type Filters */}
                            <FormControl fullWidth size="small">
                                <InputLabel>Node Types</InputLabel>
                                <Select
                                    multiple
                                    value={selectedTypes}
                                    onChange={(e) => setSelectedTypes(e.target.value as string[])}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {(selected as string[]).map((value) => (
                                                <Chip
                                                    key={value}
                                                    label={value}
                                                    size="small"
                                                    sx={{ 
                                                        backgroundColor: nodeTypeColors[value as keyof typeof nodeTypeColors],
                                                        color: 'white'
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    {Object.entries(nodeTypeColors).map(([type, color]) => (
                                        <MenuItem key={type} value={type}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {nodeTypeIcons[type as keyof typeof nodeTypeIcons]}
                                                <Typography sx={{ textTransform: 'capitalize' }}>
                                                    {type}s
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Layout */}
                            <FormControl fullWidth size="small">
                                <InputLabel>Layout</InputLabel>
                                <Select
                                    value={layoutName}
                                    onChange={(e) => setLayoutName(e.target.value)}
                                >
                                    <MenuItem value="dagre">Dagre (Hierarchical)</MenuItem>
                                    <MenuItem value="circle">Circle</MenuItem>
                                    <MenuItem value="grid">Grid</MenuItem>
                                    <MenuItem value="cose">Cose (Force-directed)</MenuItem>
                                </Select>
                            </FormControl>

                            {/* Display Options */}
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showLabels}
                                        onChange={(e) => setShowLabels(e.target.checked)}
                                    />
                                }
                                label="Show Labels"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={groupByType}
                                        onChange={(e) => setGroupByType(e.target.checked)}
                                    />
                                }
                                label="Group by Type"
                            />

                            {/* Zoom Controls */}
                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleZoom('in')}
                                    startIcon={<ZoomIn />}
                                >
                                    Zoom In
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleZoom('out')}
                                    startIcon={<ZoomOut />}
                                >
                                    Zoom Out
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleZoom('fit')}
                                    startIcon={<CenterFocusStrong />}
                                >
                                    Fit
                                </Button>
                            </Stack>
                        </Stack>
                    )}

                    {activeTab === 1 && structure && (
                        <Stack spacing={2}>
                            <Typography variant="h6">Project Statistics</Typography>
                            {Object.entries(structure.stats).map(([type, count]) => (
                                <Card key={type} variant="outlined">
                                    <CardContent sx={{ py: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            {nodeTypeIcons[type as keyof typeof nodeTypeIcons]}
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                                    {type}s
                                                </Typography>
                                            </Box>
                                            <Badge
                                                badgeContent={count}
                                                color="primary"
                                                sx={{
                                                    '& .MuiBadge-badge': {
                                                        backgroundColor: nodeTypeColors[type as keyof typeof nodeTypeColors]
                                                    }
                                                }}
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}

                    {activeTab === 2 && (
                        <Stack spacing={2}>
                            <Typography variant="h6">Export Options</Typography>
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<Download />}
                                onClick={() => handleExport('png')}
                            >
                                Export as PNG
                            </Button>
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<Download />}
                                onClick={() => handleExport('jpg')}
                            >
                                Export as JPG
                            </Button>
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<Download />}
                                onClick={() => handleExport('json')}
                            >
                                Export as JSON
                            </Button>
                        </Stack>
                    )}
                </Paper>

                {/* Graph Container */}
                <Paper sx={{ flex: 1, position: 'relative' }}>
                    {loading && (
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            zIndex: 1000
                        }}>
                            <CircularProgress />
                        </Box>
                    )}
                    
                    {error && (
                        <Alert severity="error" sx={{ m: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    <div
                        ref={cyRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            background: '#fafafa'
                        }}
                    />
                </Paper>
            </Box>

            {/* Node Details Dialog */}
            <Dialog
                open={showNodeDetails}
                onClose={() => setShowNodeDetails(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedNode && nodeTypeIcons[selectedNode.type]}
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {selectedNode?.label}
                    </Typography>
                    <IconButton onClick={() => setShowNodeDetails(false)}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedNode && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    File Path
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                                    {selectedNode.path}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Type
                                </Typography>
                                <Chip
                                    label={selectedNode.type}
                                    sx={{
                                        backgroundColor: nodeTypeColors[selectedNode.type],
                                        color: 'white',
                                        textTransform: 'capitalize'
                                    }}
                                />
                            </Box>

                            {selectedNode.imports.length > 0 && (
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle2">
                                            Imports ({selectedNode.imports.length})
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <List dense>
                                            {selectedNode.imports.map((imp, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText
                                                        primary={imp}
                                                        primaryTypographyProps={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
                            )}

                            {selectedNode.apiCalls.length > 0 && (
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle2">
                                            API Calls ({selectedNode.apiCalls.length})
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <List dense>
                                            {selectedNode.apiCalls.map((call, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText
                                                        primary={call}
                                                        primaryTypographyProps={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
                            )}

                            {selectedNode.routeDefinitions.length > 0 && (
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle2">
                                            Routes ({selectedNode.routeDefinitions.length})
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <List dense>
                                            {selectedNode.routeDefinitions.map((route, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText
                                                        primary={`${route.path} → ${route.component}`}
                                                        secondary={route.layout ? `Layout: ${route.layout}` : undefined}
                                                        primaryTypographyProps={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowNodeDetails(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SiteStructureVisualizer; 