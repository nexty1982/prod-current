import { useState, useEffect, useRef } from 'react';

// Types
interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'tsx' | 'api' | 'db' | 'shared';
  path: string;
  children?: FileNode[];
  isOpen?: boolean;
}

interface DependencyNode {
  id: string;
  name: string;
  type: 'frontend' | 'api' | 'db' | 'shared';
  x: number;
  y: number;
  connections: string[];
}

interface Connection {
  from: string;
  to: string;
  type: 'imports' | 'api_call' | 'db_write' | 'db_read';
}

interface NodeDetail {
  lines: number;
  lastModified: string;
  routes: string[];
  dbTables: string[];
  dependencies: string[];
  methods: string[];
  type?: string;
}

interface OMDepsData {
  fileTree: FileNode[];
  dependencyNodes: DependencyNode[];
  connections: Connection[];
  nodeDetails: Record<string, NodeDetail>;
  metadata?: {
    scanTime?: string;
    totalFiles?: number;
    totalDependencies?: number;
    version?: string;
    skippedEdges?: any[];
  };
  lastScan?: string;
}

// Icon components (SVG)
const FolderIcon = ({ isOpen = false }: { isOpen?: boolean }) => (
  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
    {isOpen ? (
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    ) : (
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 0v8h12V8H8.414l-2-2H4z" clipRule="evenodd" />
    )}
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4 text-[var(--om-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const ApiIcon = () => (
  <svg className="w-4 h-4 text-[var(--om-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const SharedIcon = () => (
  <svg className="w-4 h-4 text-[var(--om-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RefreshIcon = ({ className = "" }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// Utility functions
const getFileIcon = (type: string, isOpen?: boolean) => {
  switch (type) {
    case 'folder':
      return <FolderIcon isOpen={isOpen} />;
    case 'tsx':
      return <CodeIcon />;
    case 'api':
      return <ApiIcon />;
    case 'db':
      return <DatabaseIcon />;
    case 'shared':
      return <SharedIcon />;
    default:
      return <CodeIcon />;
  }
};

const getNodeColor = (type: string) => {
  switch (type) {
    case 'frontend': return 'var(--om-purple)';
    case 'api': return 'var(--om-gold)';
    case 'db': return 'var(--om-gray)';
    case 'shared': return 'var(--om-blue)';
    default: return '#9CA3AF';
  }
};

const getConnectionColor = (type: string) => {
  switch (type) {
    case 'imports': return '#8B5CF6';
    case 'api_call': return '#F59E0B';
    case 'db_read': return '#10B981';
    case 'db_write': return '#EF4444';
    default: return '#6B7280';
  }
};

const getItemIcon = (type: string) => {
  switch (type) {
    case 'tsx':
    case 'frontend':
      return <CodeIcon />;
    case 'api':
      return <ApiIcon />;
    case 'db':
      return <DatabaseIcon />;
    case 'shared':
      return <SharedIcon />;
    default:
      return <CodeIcon />;
  }
};

const getItemColor = (type: string) => {
  switch (type) {
    case 'tsx':
    case 'frontend':
      return 'var(--om-purple)';
    case 'api':
      return 'var(--om-gold)';
    case 'db':
      return '#6B7280';
    case 'shared':
      return 'var(--om-blue)';
    default:
      return '#9CA3AF';
  }
};

// Main component
export default function OMDeps() {
  const [data, setData] = useState<OMDepsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState('all');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['1', '2']));
  const [lastScanTime, setLastScanTime] = useState<string>('Never');
  const [scanningFull, setScanningFull] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string>('');
  const [showAllNodes, setShowAllNodes] = useState(false);
  const fileTreeRef = useRef<HTMLDivElement>(null);

  // Get focused nodes and connections
  const getFocusedData = () => {
    if (!focusedNodeId || showAllNodes) {
      return {
        nodes: data?.dependencyNodes || [],
        connections: data?.connections || []
      };
    }
    
    // Get focused node and its direct connections (1-hop distance)
    const focusedNode = data?.dependencyNodes.find(n => n.id === focusedNodeId);
    if (!focusedNode) return { nodes: [], connections: [] };
    
    const connectedIds = new Set<string>([focusedNodeId]);
    const focusedConnections = data?.connections.filter(conn => 
      conn.from === focusedNodeId || conn.to === focusedNodeId
    ) || [];
    
    // Add connected nodes
    focusedConnections.forEach(conn => {
      if (conn.from === focusedNodeId) connectedIds.add(conn.to);
      if (conn.to === focusedNodeId) connectedIds.add(conn.from);
    });
    
    const focusedNodes = data?.dependencyNodes.filter(n => connectedIds.has(n.id)) || [];
    
    return { nodes: focusedNodes, connections: focusedConnections };
  };

  // Get focused nodes and connections
  const [visibleNodes, setVisibleNodes] = useState<DependencyNode[]>([]);
  const [visibleConnections, setVisibleConnections] = useState<Connection[]>([]);

  // Update focused data when dependencies change
  useEffect(() => {
    const { nodes, connections } = getFocusedData();
    setVisibleNodes(nodes);
    setVisibleConnections(connections);
  }, [focusedNodeId, showAllNodes, data?.dependencyNodes, data?.connections]);

  // Fallback mock data - embedded directly in component
  const fallbackData: OMDepsData = {
    fileTree: [
      {
        id: '1',
        name: 'src',
        type: 'folder',
        path: 'src/',
        isOpen: true,
        children: [
          {
            id: '2',
            name: 'components',
            type: 'folder',
            path: 'src/components/',
            isOpen: true,
            children: [
              { id: '3', name: 'Header.tsx', type: 'tsx', path: 'src/components/Header.tsx' },
              { id: '4', name: 'Dashboard.tsx', type: 'tsx', path: 'src/components/Dashboard.tsx' },
              { id: '5', name: 'UserProfile.tsx', type: 'tsx', path: 'src/components/UserProfile.tsx' }
            ]
          },
          {
            id: '6',
            name: 'pages',
            type: 'folder',
            path: 'src/pages/',
            children: [
              { id: '7', name: 'HomePage.tsx', type: 'tsx', path: 'src/pages/HomePage.tsx' },
              { id: '8', name: 'SettingsPage.tsx', type: 'tsx', path: 'src/pages/SettingsPage.tsx' }
            ]
          },
          {
            id: '9',
            name: 'utils',
            type: 'folder',
            path: 'src/utils/',
            children: [
              { id: '10', name: 'api.tsx', type: 'tsx', path: 'src/utils/api.tsx' },
              { id: '11', name: 'helpers.tsx', type: 'tsx', path: 'src/utils/helpers.tsx' }
            ]
          }
        ]
      },
      {
        id: '12',
        name: 'server',
        type: 'folder',
        path: 'server/',
        children: [
          {
            id: '13',
            name: 'routes',
            type: 'folder',
            path: 'server/routes/',
            children: [
              { id: '14', name: 'auth.api', type: 'api', path: 'server/routes/auth.api' },
              { id: '15', name: 'users.api', type: 'api', path: 'server/routes/users.api' },
              { id: '16', name: 'metrics.api', type: 'api', path: 'server/routes/metrics.api' }
            ]
          },
          {
            id: '17',
            name: 'db',
            type: 'folder',
            path: 'server/db/',
            children: [
              { id: '18', name: 'users.db', type: 'db', path: 'server/db/users.db' },
              { id: '19', name: 'metrics.db', type: 'db', path: 'server/db/metrics.db' }
            ]
          }
        ]
      },
      {
        id: '20',
        name: 'shared',
        type: 'folder',
        path: 'shared/',
        children: [
          { id: '21', name: 'types.tsx', type: 'tsx', path: 'shared/types.tsx' },
          { id: '22', name: 'constants.tsx', type: 'tsx', path: 'shared/constants.tsx' },
          { id: '23', name: 'utils.ts', type: 'shared', path: 'shared/utils.ts' },
          { id: '24', name: 'validators.ts', type: 'shared', path: 'shared/validators.ts' }
        ]
      }
    ],
    dependencyNodes: [
      { id: '1', name: 'Dashboard.tsx', type: 'frontend', x: 100, y: 150, connections: ['2', '3', '9'] },
      { id: '2', name: 'UserProfile.tsx', type: 'frontend', x: 100, y: 250, connections: ['4', '9'] },
      { id: '3', name: 'Header.tsx', type: 'frontend', x: 100, y: 50, connections: ['4', '9'] },
      { id: '4', name: '/api/users', type: 'api', x: 350, y: 150, connections: ['6'] },
      { id: '5', name: '/api/metrics', type: 'api', x: 350, y: 250, connections: ['7'] },
      { id: '6', name: 'users.db', type: 'db', x: 600, y: 150, connections: [] },
      { id: '7', name: 'metrics.db', type: 'db', x: 600, y: 250, connections: [] },
      { id: '8', name: 'SettingsPage.tsx', type: 'frontend', x: 100, y: 350, connections: ['4', '5'] },
      { id: '9', name: 'utils.ts', type: 'shared', x: 100, y: 450, connections: [] }
    ],
    connections: [
      { from: '1', to: '2', type: 'imports' },
      { from: '1', to: '3', type: 'imports' },
      { from: '1', to: '9', type: 'imports' },
      { from: '2', to: '4', type: 'api_call' },
      { from: '2', to: '9', type: 'imports' },
      { from: '3', to: '4', type: 'api_call' },
      { from: '3', to: '9', type: 'imports' },
      { from: '4', to: '6', type: 'db_read' },
      { from: '5', to: '7', type: 'db_write' },
      { from: '8', to: '4', type: 'api_call' },
      { from: '8', to: '5', type: 'api_call' }
    ],
    nodeDetails: {
      'Dashboard.tsx': {
        lines: 156,
        lastModified: '2 hours ago',
        routes: ['/dashboard', '/admin/dashboard'],
        dbTables: ['users', 'metrics'],
        dependencies: ['UserProfile.tsx', 'Header.tsx', 'api/users'],
        methods: ['useState', 'useEffect', 'fetch']
      },
      'UserProfile.tsx': {
        lines: 89,
        lastModified: '1 day ago',
        routes: ['/profile', '/user/:id'],
        dbTables: ['users', 'user_settings'],
        dependencies: ['api/users', 'shared/types'],
        methods: ['useState', 'useForm', 'validateUser']
      },
      '/api/users': {
        lines: 234,
        lastModified: '3 hours ago',
        routes: ['GET /api/users', 'POST /api/users', 'PUT /api/users/:id'],
        dbTables: ['users', 'user_sessions'],
        dependencies: ['users.db', 'auth middleware'],
        methods: ['authenticate', 'validate', 'sanitize']
      },
      'users.db': {
        lines: 0,
        lastModified: '30 minutes ago',
        routes: [],
        dbTables: ['users', 'user_profiles', 'user_sessions'],
        dependencies: [],
        methods: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      },
      'utils.ts': {
        lines: 67,
        lastModified: '4 hours ago',
        routes: [],
        dbTables: [],
        dependencies: [],
        methods: ['formatDate', 'validateEmail', 'debounce', 'throttle']
      }
    }
  };

  // Toast notification helper
  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), duration);
  };

  // Layout algorithm for focused view - center focused node and arrange connected nodes around it
  const layoutFocusedNodes = (nodes: DependencyNode[], connections: Connection[]): DependencyNode[] => {
    if (!nodes || nodes.length === 0) return [];
    
    if (!focusedNodeId || showAllNodes) {
      // Use original zone-based layout for all nodes
      return layoutNodes(nodes);
    }
    
    const focusedNode = nodes.find(n => n.id === focusedNodeId);
    if (!focusedNode) return layoutNodes(nodes);
    
    // Center the focused node
    const centerX = 800;
    const centerY = 300;
    
    const positionedNodes: DependencyNode[] = [];
    
    // Position focused node at center
    positionedNodes.push({
      ...focusedNode,
      x: centerX,
      y: centerY
    });
    
    // Get connected nodes
    const connectedNodes = nodes.filter(n => n.id !== focusedNodeId);
    const inboundNodes: DependencyNode[] = [];
    const outboundNodes: DependencyNode[] = [];
    
    // Separate inbound and outbound connections
    connections.forEach(conn => {
      if (conn.from === focusedNodeId) {
        const node = connectedNodes.find(n => n.id === conn.to);
        if (node) outboundNodes.push(node);
      } else if (conn.to === focusedNodeId) {
        const node = connectedNodes.find(n => n.id === conn.from);
        if (node) inboundNodes.push(node);
      }
    });
    
    // Position inbound nodes to the left
    const leftSpacing = 200;
    inboundNodes.forEach((node, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      positionedNodes.push({
        ...node,
        x: centerX - leftSpacing - (col * 160),
        y: centerY - 100 + (row * 80)
      });
    });
    
    // Position outbound nodes to the right
    const rightSpacing = 200;
    outboundNodes.forEach((node, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      positionedNodes.push({
        ...node,
        x: centerX + rightSpacing + (col * 160),
        y: centerY - 100 + (row * 80)
      });
    });
    
    return positionedNodes;
  };

  // Original zone-based layout algorithm
  const layoutNodes = (nodes: DependencyNode[]): DependencyNode[] => {
    if (!nodes || nodes.length === 0) return [];
    
    // Group nodes by type
    const grouped = {
      frontend: nodes.filter(n => n.type === 'frontend'),
      api: nodes.filter(n => n.type === 'api'),
      db: nodes.filter(n => n.type === 'db'),
      shared: nodes.filter(n => n.type === 'shared')
    };
    
    console.log('Grouped nodes:', grouped);
    
    // Define layout zones with proper spacing
    const layoutZones = {
      frontend: { x: 100, y: 100, maxWidth: 400, maxHeight: 300 },
      api: { x: 600, y: 100, maxWidth: 400, maxHeight: 300 },
      db: { x: 1100, y: 100, maxWidth: 400, maxHeight: 300 },
      shared: { x: 100, y: 600, maxWidth: 400, maxHeight: 300 }
    };
    
    // Node dimensions and spacing
    const nodeWidth = 140;
    const nodeHeight = 50;
    const nodeSpacing = 20;
    const zonePadding = 40;
    
    console.log('Layout zones:', layoutZones);
    
    const positionedNodes: DependencyNode[] = [];
    
    Object.entries(grouped).forEach(([type, typeNodes]) => {
      if (typeNodes.length === 0) return;
      
      const zone = layoutZones[type as keyof typeof layoutZones];
      const zoneStartX = zone.x + zonePadding;
      const zoneStartY = zone.y + zonePadding;
      const zoneWidth = zone.maxWidth - (zonePadding * 2);
      const zoneHeight = zone.maxHeight - (zonePadding * 2);
      
      // Calculate grid layout for this zone
      const maxCols = Math.floor(zoneWidth / (nodeWidth + nodeSpacing));
      const cols = Math.min(maxCols, typeNodes.length);
      const rows = Math.ceil(typeNodes.length / cols);
      
      console.log(`Layout for ${type}:`, { cols, rows, maxCols, typeNodes: typeNodes.length });
      
      typeNodes.forEach((node, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const positionedNode = {
          ...node,
          x: zoneStartX + (col * (nodeWidth + nodeSpacing)),
          y: zoneStartY + (row * (nodeHeight + nodeSpacing))
        };
        
        console.log(`Positioned ${node.name} in ${type} zone:`, positionedNode);
        positionedNodes.push(positionedNode);
      });
    });
    
    console.log('Final positioned nodes:', positionedNodes);
    return positionedNodes;
  };

  // Load data from API endpoint with fallback
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load from API endpoint first
        const response = await fetch('/api/deps/scan');
        
        if (response.ok) {
          const jsonData = await response.json();
          console.log('Successfully loaded data from API:', jsonData);
          
          // Apply focused layout to nodes
          const layoutedNodes = layoutFocusedNodes(jsonData.dependencyNodes || [], jsonData.connections || []);
          console.log('Focused layout applied to API data:', layoutedNodes);
          
          const improvedData = {
            ...jsonData,
            dependencyNodes: layoutedNodes
          };
          
          setData(improvedData);
          setLastScanTime(jsonData.lastScan || new Date().toISOString());
          
          // Auto-expand ALL folders by default for better visibility
          const allFolderIds = new Set<string>();
          const collectFolderIds = (nodes: FileNode[]) => {
            nodes.forEach((node: FileNode) => {
              if (node.type === 'folder') {
                allFolderIds.add(node.id);
                if (node.children) {
                  collectFolderIds(node.children);
                }
            }
          });
        };
        
        collectFolderIds(jsonData.fileTree || []);
        setOpenFolders(allFolderIds);
      } else {
        // Fallback to embedded data if API fails
        console.log('API not available, using embedded fallback data');
        
        // Apply focused layout to fallback data as well
        const layoutedNodes = layoutFocusedNodes(fallbackData.dependencyNodes, fallbackData.connections);
        console.log('Focused layout applied to fallback data:', layoutedNodes);
        
        const improvedFallbackData = {
          ...fallbackData,
          dependencyNodes: layoutedNodes
        };
        
        setData(improvedFallbackData);
        
        // Also expand all folders in fallback data
        const allFolderIds = new Set<string>();
        const collectFolderIds = (nodes: FileNode[]) => {
          nodes.forEach((node: FileNode) => {
            if (node.type === 'folder') {
              allFolderIds.add(node.id);
              if (node.children) {
                collectFolderIds(node.children);
              }
            }
          });
        };
        
        collectFolderIds(fallbackData.fileTree);
        setOpenFolders(allFolderIds);
      }
    } catch (error) {
      console.error('Error loading OM deps data, using fallback:', error);
      
      // Apply layout to fallback data
      const layoutedNodes = layoutNodes(fallbackData.dependencyNodes);
      console.log('Layout applied to fallback data (error case):', layoutedNodes);
      
      const improvedFallbackData = {
        ...fallbackData,
        dependencyNodes: layoutedNodes
      };
      
      setData(improvedFallbackData);
      
      // Expand all folders in fallback data
      const allFolderIds = new Set<string>();
      const collectFolderIds = (nodes: FileNode[]) => {
        nodes.forEach((node: FileNode) => {
          if (node.type === 'folder') {
            allFolderIds.add(node.id);
            if (node.children) {
              collectFolderIds(node.children);
            }
          }
        });
      };
      
      collectFolderIds(fallbackData.fileTree);
      setOpenFolders(allFolderIds);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []);

  // Auto-center and zoom the graph when data loads
  useEffect(() => {
    if (data?.dependencyNodes && data.dependencyNodes.length > 0) {
      // Calculate the bounding box of all nodes
      const minX = Math.min(...data.dependencyNodes.map(n => n.x || 0));
      const maxX = Math.max(...data.dependencyNodes.map(n => (n.x || 0) + 140)); // 140 is node width
      const minY = Math.min(...data.dependencyNodes.map(n => n.y || 0));
      const maxY = Math.max(...data.dependencyNodes.map(n => (n.y || 0) + 50)); // 50 is node height
      
      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;
      
      // Calculate center offset to center the graph
      const containerWidth = 1600;
      const containerHeight = 1000;
      const centerX = containerWidth / 2 - (minX + graphWidth / 2);
      const centerY = containerHeight / 2 - (minY + graphHeight / 2);
      
      console.log('Auto-centering graph:', { 
        minX, maxX, minY, maxY, 
        graphWidth, graphHeight, 
        centerX, centerY 
      });
      
      // Apply transform to center the view
      const graphContainer = document.querySelector('.dependency-graph-container');
      if (graphContainer) {
        const contentWrapper = graphContainer.querySelector('div > div') as HTMLElement;
        if (contentWrapper) {
          contentWrapper.style.transform = `translate(${centerX}px, ${centerY}px) scale(0.7)`;
          contentWrapper.style.transformOrigin = 'center center';
        }
      }
    }
  }, [data?.dependencyNodes]);

// Simple auto-centering when data loads
useEffect(() => {
  if (data && data.dependencyNodes.length > 0) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const graphContainer = document.querySelector('.dependency-graph-container');
      if (graphContainer) {
        // Scroll to show the graph area
        graphContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}, [data?.dependencyNodes.length]);

// Handle ?focus= URL parameter
useEffect(() => {
  if (!data || loading) return;
  
  const params = new URLSearchParams(window.location.search);
  const focusFile = params.get('focus');
  
  if (focusFile) {
    // Find and select the file
    const findFileNode = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.name === focusFile || node.path?.includes(focusFile)) {
          return node;
        }
        if (node.children) {
          const found = findFileNode(node.children);
          if (found) {
            // Open parent folders
            setOpenFolders(prev => new Set([...prev, node.id]));
            return found;
          }
        }
      }
      return null;
    };
    
    const targetFile = findFileNode(data.fileTree);
    if (targetFile) {
      setSelectedFile(targetFile);
      setSelectedFileId(targetFile.id);
      
      // Scroll to the file in the tree
      setTimeout(() => {
        const element = document.getElementById(`file-node-${targetFile.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-[var(--om-gold)]');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-[var(--om-gold)]');
          }, 2000);
        }
      }, 100);
      
      // Also find and highlight in dependency graph
      const graphNode = data.dependencyNodes.find(n => 
        n.name === targetFile.name || n.name.includes(focusFile)
      );
      if (graphNode) {
        setSelectedNode(graphNode);
        setSelectedNodeId(graphNode.id);
        setFocusedNodeId(graphNode.id);
      }
    }
  }
}, [data, loading]);

// Update URL when focus changes
useEffect(() => {
  if (!focusedNodeId) {
    // Remove focus parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('focus');
    window.history.replaceState({}, '', url.toString());
  } else {
    // Add focus parameter to URL
    const focusedNode = data?.dependencyNodes.find(n => n.id === focusedNodeId);
    if (focusedNode) {
      const url = new URL(window.location.href);
      url.searchParams.set('focus', focusedNode.name);
      window.history.replaceState({}, '', url.toString());
    }
  }
}, [focusedNodeId, data?.dependencyNodes]);

if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--om-parchment)]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--om-purple)] border-t-transparent"></div>
        <div className="text-[var(--om-purple)]">Loading OM File Deps...</div>
      </div>
    </div>
  );
}

if (!data) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--om-parchment)]">
      <div className="text-red-600">Error loading dependency data</div>
    </div>
  );
}

// File Tree Node Component
const FileTreeNode = ({ 
  node, 
  depth = 0 
}: { 
  node: FileNode; 
  depth?: number; 
}) => {
  const isOpen = openFolders.has(node.id);
  
  const handleClick = () => {
    if (node.type === 'folder') {
      const newOpenFolders = new Set(openFolders);
      if (isOpen) {
        newOpenFolders.delete(node.id);
      } else {
        newOpenFolders.add(node.id);
      }
      setOpenFolders(newOpenFolders);
    } else {
      setSelectedFile(node);
      setSelectedFileId(node.id);
      setSelectedNode(null);
      setSelectedNodeId('');
      
      // Find and focus the corresponding dependency node
      const graphNode = data?.dependencyNodes.find(n => 
        n.name === node.name || n.name.includes(node.name) || node.name.includes(n.name)
      );
      if (graphNode) {
        setFocusedNodeId(graphNode.id);
        // Relayout with focus
        const layoutedNodes = layoutFocusedNodes(data?.dependencyNodes || [], data?.connections || []);
        setData(prev => prev ? { ...prev, dependencyNodes: layoutedNodes } : null);
      }
    }
  };

  return (
    <div>
      <div 
        id={`file-node-${node.id}`}
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[var(--om-gold)]/10 rounded-sm transition-all ${
          selectedFileId === node.id ? 'bg-[var(--om-gold)]/20' : ''
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
      >
        {getFileIcon(node.type, isOpen)}
        <span className="text-sm">{node.name}</span>
      </div>
      
      {node.children && isOpen && (
        <div>
          {node.children.map(child => (
            <FileTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// File Tree Pane
const FileTreePane = () => {
  const filteredFiles = data.fileTree.filter(node => {
    // Handle directory filtering
    if (selectedDirectory !== 'all') {
      if (selectedDirectory === 'frontend' || selectedDirectory === 'src') {
        if (node.name !== 'src' && !node.path?.includes('front-end')) return false;
      } else if (selectedDirectory === 'api' || selectedDirectory === 'server') {
        if (node.name !== 'server' && !node.path?.includes('api')) return false;
      } else if (selectedDirectory === 'database') {
        if (!node.name.includes('db') && !node.path?.includes('database')) return false;
      } else if (selectedDirectory === 'shared') {
        if (node.name !== 'shared' && !node.path?.includes('shared')) return false;
      } else if (selectedDirectory === 'utils') {
        if (node.name !== 'utils' && !node.path?.includes('utils')) return false;
      } else if (node.name !== selectedDirectory) {
        return false;
      }
    }
    return node.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full h-full bg-white border-r border-[var(--om-border)] p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-[var(--om-purple)] mb-3">File Explorer</h3>
          
          <div className="relative mb-3">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <SearchIcon />
            </div>
            <input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-[var(--om-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--om-purple)] focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedDirectory}
            onChange={(e) => setSelectedDirectory(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--om-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--om-purple)]"
          >
            <option value="all">All Directories</option>
            <option value="frontend">Frontend</option>
            <option value="api">API</option>
            <option value="database">Database</option>
            <option value="shared">Shared</option>
            <option value="src">src/</option>
            <option value="server">server/</option>
            <option value="utils">utils/</option>
          </select>
        </div>
        
        <div className="border rounded-md border-[var(--om-border)] bg-gray-50/50 p-2 max-h-[600px] overflow-y-auto">
          {filteredFiles.map(node => (
            <FileTreeNode key={node.id} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Dependency Graph
const DependencyGraph = () => {
  const handleNodeClick = (node: DependencyNode) => {
    setSelectedNode(node);
    setSelectedNodeId(node.id);
    setSelectedFile(null);
    setSelectedFileId('');
  };

  const isConnected = (nodeId: string) => {
    if (!selectedNodeId) return false;
    return visibleConnections.some(conn => 
      (conn.from === selectedNodeId && conn.to === nodeId) ||
      (conn.to === selectedNodeId && conn.from === nodeId)
    );
  };

  // Debug logging
  console.log('DependencyGraph render:', {
    hasData: !!data,
    dependencyNodesCount: data?.dependencyNodes?.length || 0,
    connectionsCount: data?.connections?.length || 0,
    dependencyNodes: data?.dependencyNodes || [],
    connections: data?.connections || []
  });

  return (
    <div className="w-full h-full bg-white border-r border-[var(--om-border)] p-4">
      <div className="mb-4">
        <h3 className="font-medium text-[var(--om-purple)] mb-2">Integration Map</h3>
        
        {/* Focus and filtering controls */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-gray-300">
              <div className="w-2 h-2 bg-[var(--om-purple)] rounded-full mr-2"></div>
              Frontend
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-gray-300">
              <div className="w-2 h-2 bg-[var(--om-gold)] rounded-full mr-2"></div>
              API
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-gray-300">
              <div className="w-2 h-2 bg-gray-600 rounded-full mr-2"></div>
              Database
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-gray-300">
              <div className="w-2 h-2 bg-[var(--om-blue)] rounded-full mr-2"></div>
              Shared
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showInfrastructure}
                onChange={(e) => setShowInfrastructure(e.target.checked)}
                className="w-3 h-3"
              />
              Show Infrastructure Imports
            </label>
            
            <button
              onClick={() => {
                if (showAllNodes) {
                  setShowAllNodes(false);
                  setFocusedNodeId('');
                } else {
                  setShowAllNodes(true);
                  setFocusedNodeId('');
                }
                // Relayout
                const layoutedNodes = showAllNodes 
                  ? layoutNodes(data?.dependencyNodes || [])
                  : layoutFocusedNodes(data?.dependencyNodes || [], data?.connections || []);
                setData(prev => prev ? { ...prev, dependencyNodes: layoutedNodes } : null);
              }}
              className={`px-3 py-1 text-xs rounded-md border ${
                showAllNodes 
                  ? 'bg-[var(--om-gold)] text-[var(--om-purple)] border-[var(--om-gold)]' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {showAllNodes ? 'Show Focused' : 'Show All'}
            </button>
          </div>
        </div>
        
        {/* Connection warning */}
        {data?.metadata?.skippedEdges && data.metadata.skippedEdges.length > 0 && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <strong>📊 Graph Clarity Mode:</strong> {data.metadata.skippedEdges.length} connections were filtered out for readability. 
            {!showInfrastructure && ' Enable "Show Infrastructure Imports" to see all connections.'}
          </div>
        )}
      </div>
      
      {/* Focus status and statistics */}
      {data && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          {focusedNodeId && !showAllNodes ? (
            <div>
              <strong>🎯 Focused View:</strong> {data.dependencyNodes.find(n => n.id === focusedNodeId)?.name}<br/>
              <div className="mt-2 text-xs text-gray-600">
                Showing focused node + {visibleNodes.length - 1} connected nodes ({visibleConnections.length} connections)
              </div>
            </div>
          ) : (
            <div>
              <strong>📊 Zone Distribution:</strong><br/>
              <div className="grid grid-cols-4 gap-4 mt-2">
                <div className="text-center">
                  <div className="text-red-600 font-bold">{visibleNodes.filter(n => n.type === 'frontend').length}</div>
                  <div className="text-xs text-gray-600">Frontend</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-600 font-bold">{visibleNodes.filter(n => n.type === 'api').length}</div>
                  <div className="text-xs text-gray-600">API</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 font-bold">{visibleNodes.filter(n => n.type === 'db').length}</div>
                  <div className="text-xs text-gray-600">Database</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-bold">{visibleNodes.filter(n => n.type === 'shared').length}</div>
                  <div className="text-xs text-gray-600">Shared</div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-600">
            Total: {visibleNodes?.length || 0} nodes, {visibleConnections?.length || 0} connections
            {data.metadata?.skippedEdges && data.metadata.skippedEdges.length > 0 && (
              <span className="ml-2">• {data.metadata.skippedEdges.length} filtered for clarity</span>
            )}
          </div>
        </div>
      )}
      
      <div className="border rounded-lg border-[var(--om-border)] bg-gray-50/30 h-[600px] relative overflow-auto dependency-graph-container" style={{ minHeight: '600px', height: '100%' }}>
        {/* Graph content wrapper with proper dimensions for zones */}
        <div className="relative w-full h-full min-w-[1600px] min-h-[1000px]" style={{ transform: 'scale(0.7)', transformOrigin: 'top left' }}>
          {/* Zone labels - only show when not focused */}
          {(!focusedNodeId || showAllNodes) && (
            <>
              <div className="absolute top-[50px] left-[100px] text-lg font-bold text-red-600 bg-red-50/80 px-3 py-1 rounded border border-red-200">
                Frontend Zone
              </div>
              <div className="absolute top-[50px] left-[600px] text-lg font-bold text-yellow-600 bg-yellow-50/80 px-3 py-1 rounded border border-yellow-200">
                API Zone
              </div>
              <div className="absolute top-[50px] left-[1100px] text-lg font-bold text-gray-600 bg-gray-50/80 px-3 py-1 rounded border border-gray-200">
                Database Zone
              </div>
              <div className="absolute top-[550px] left-[100px] text-lg font-bold text-blue-600 bg-blue-50/80 px-3 py-1 rounded border border-blue-200">
                Shared Zone
              </div>
              
              {/* Debug overlay - show layout zones */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[100px] left-[100px] w-[400px] h-[300px] border-2 border-red-300 bg-red-50/20">
                  <div className="text-xs text-red-600 p-1">Frontend Zone</div>
                </div>
                <div className="absolute top-[100px] left-[600px] w-[400px] h-[300px] border-2 border-yellow-300 bg-yellow-50/20">
                  <div className="text-xs text-yellow-600 p-1">API Zone</div>
                </div>
                <div className="absolute top-[100px] left-[1100px] w-[400px] h-[300px] border-2 border-gray-300 bg-gray-50/20">
                  <div className="text-xs text-gray-600 p-1">Database Zone</div>
                </div>
                <div className="absolute top-[600px] left-[100px] w-[400px] h-[300px] border-2 border-blue-300 bg-blue-50/20">
                  <div className="text-xs text-blue-600 p-1">Shared Zone</div>
                </div>
              </div>
            </>
          )}
          
          {/* Focus indicator when in focused mode */}
          {focusedNodeId && !showAllNodes && (
            <div className="absolute top-[50px] left-[50px] text-lg font-bold text-[var(--om-purple)] bg-[var(--om-purple)]/10 px-3 py-1 rounded border border-[var(--om-purple)]">
              🎯 Focused: {data?.dependencyNodes.find(n => n.id === focusedNodeId)?.name}
            </div>
          )}
          
          <svg 
            width="100%" 
            height="100%" 
            className="absolute inset-0"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 1600 1000"
          >
            {/* Render connections */}
            {visibleConnections?.map((connection, index) => {
              const fromNode = visibleNodes.find(n => n.id === connection.from);
              const toNode = visibleNodes.find(n => n.id === connection.to);
              
              if (!fromNode || !toNode) return null;
              
              const isHighlighted = selectedNodeId && (
                connection.from === selectedNodeId || 
                connection.to === selectedNodeId
              );
              
              const isFocused = focusedNodeId && (
                connection.from === focusedNodeId || 
                connection.to === focusedNodeId
              );
              
              return (
                <line
                  key={index}
                  x1={fromNode.x + 70}
                  y1={fromNode.y + 25}
                  x2={toNode.x + 70}
                  y2={toNode.y + 25}
                  stroke={isHighlighted ? getConnectionColor(connection.type) : 
                          isFocused ? getConnectionColor(connection.type) : '#E5E7EB'}
                  strokeWidth={isHighlighted ? 3 : isFocused ? 2.5 : 1.5}
                  strokeDasharray={connection.type === 'imports' ? '5,5' : '0'}
                  className="transition-all duration-200"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6B7280"
                />
              </marker>
            </defs>
          </svg>
          
          {/* Render nodes */}
          {visibleNodes?.map((node, index) => {
            console.log(`Rendering node ${index}:`, node);
            
            // Simple fallback node if complex styling fails
            const nodeColor = getNodeColor(node.type);
            const isFocused = node.id === focusedNodeId;
            const isConnected = focusedNodeId && (
              visibleConnections.some(conn => 
                (conn.from === focusedNodeId && conn.to === node.id) ||
                (conn.to === focusedNodeId && conn.from === node.id)
              )
            );
            
            return (
              <div
                key={node.id}
                className={`absolute cursor-pointer border-2 rounded-lg shadow-md transition-all duration-200 ${
                  isFocused ? 'ring-4 ring-[var(--om-gold)] ring-opacity-50' : ''
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: '140px',
                  height: '50px',
                  borderColor: nodeColor,
                  backgroundColor: isFocused ? `${nodeColor}30` : 
                                 selectedNodeId === node.id ? nodeColor : 
                                 isConnected ? `${nodeColor}20` : 'white',
                  color: selectedNodeId === node.id ? 'white' : 'inherit',
                  zIndex: isFocused ? 20 : selectedNodeId === node.id ? 15 : 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isFocused ? 'scale(1.05)' : 'scale(1)'
                }}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId('')}
              >
                <div className="flex items-center gap-2 w-full px-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedNodeId === node.id ? 'white' : nodeColor }}
                  />
                  <span className="text-sm font-medium truncate text-center" title={node.name}>
                    {node.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {selectedNodeId && (
        <div className="mt-4 p-3 bg-[var(--om-gold)]/10 border border-[var(--om-gold)]/20 rounded-lg">
          <div className="text-sm">
            <strong>Selected:</strong> {visibleNodes.find(n => n.id === selectedNodeId)?.name}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Click on connected nodes to explore dependencies
          </div>
          
          {/* Connection count warning */}
          {(() => {
            const selectedNode = visibleNodes.find(n => n.id === selectedNodeId);
            if (selectedNode && selectedNode.connections.length >= 8) {
              return (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  <strong>⚠️ Connections trimmed:</strong> This node has {selectedNode.connections.length} connections. 
                  Some may have been filtered for graph clarity.
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
      
      {focusedNodeId && !showAllNodes && (
        <div className="mt-4 p-3 bg-[var(--om-purple)]/10 border border-[var(--om-purple)]/20 rounded-lg">
          <div className="text-sm">
            <strong>🎯 Focused:</strong> {visibleNodes.find(n => n.id === focusedNodeId)?.name}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Showing focused node and its direct connections ({visibleNodes.length - 1} connected nodes)
          </div>
          <div className="mt-2">
            <button
              onClick={() => {
                setFocusedNodeId('');
                setShowAllNodes(true);
                const layoutedNodes = layoutNodes(data?.dependencyNodes || []);
                setData(prev => prev ? { ...prev, dependencyNodes: layoutedNodes } : null);
              }}
              className="px-3 py-1 text-xs bg-[var(--om-purple)] text-white rounded hover:bg-[var(--om-purple)]/90"
            >
              Show All Nodes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Details Pane
const DetailsPane = () => {
  const selectedItem = selectedNode || selectedFile;
  
  if (!selectedItem) {
    return (
      <div className="w-full h-full bg-white p-4 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <CodeIcon />
          <p className="mt-2">Select a file or node to view details</p>
          <p className="text-xs mt-1">Click on any file in the tree or node in the graph</p>
        </div>
      </div>
    );
  }

  // Get real details from nodeDetails
  const details = data.nodeDetails[selectedItem.name] || {};
  
  // Format lastModified date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      return 'Recently';
    } catch {
      return dateStr;
    }
  };
  
  const itemType = 'type' in selectedItem ? selectedItem.type : details.type || 'shared';
  const itemPath = 'path' in selectedItem ? selectedItem.path : `/${selectedItem.name}`;

  return (
    <div className="w-full h-full bg-white p-4 space-y-4">
      <div>
        <h3 className="font-medium text-[var(--om-purple)] mb-3">Details Panel</h3>
        
        <div className="border rounded-lg border-[var(--om-border)] p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-lg font-medium mb-2">
              {getItemIcon(itemType)}
              <span className="truncate">{selectedItem.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border"
                style={{ 
                  borderColor: getItemColor(itemType),
                  color: getItemColor(itemType)
                }}
              >
                {itemType.toUpperCase()}
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ClockIcon />
                {formatDate(details.lastModified)}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Path</div>
              <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded break-all">
                {itemPath}
              </div>
            </div>
            
            {details.lines && details.lines > 0 ? (
              <div>
                <div className="text-sm font-medium mb-1">Lines of Code</div>
                <div className="text-sm text-gray-600">{details.lines}</div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium mb-1">Lines of Code</div>
                <div className="text-sm text-gray-400 italic">Not available</div>
              </div>
            )}
            
            {details.routes && details.routes.length > 0 ? (
              <div>
                <div className="text-sm font-medium mb-2">Routes Touched</div>
                <div className="flex flex-wrap gap-1">
                  {details.routes.map((route, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-gray-300">
                      {route}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium mb-2">Routes Touched</div>
                <div className="text-sm text-gray-400 italic">No routes defined</div>
              </div>
            )}
            
            {details.dbTables && details.dbTables.length > 0 ? (
              <div>
                <div className="text-sm font-medium mb-2">DB Tables Affected</div>
                <div className="flex flex-wrap gap-1">
                  {details.dbTables.map((table, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-gray-300">
                      <DatabaseIcon />
                      <span className="ml-1">{table}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium mb-2">DB Tables Affected</div>
                <div className="text-sm text-gray-400 italic">No database tables</div>
              </div>
            )}
            
            {details.dependencies && details.dependencies.length > 0 ? (
              <div>
                <div className="text-sm font-medium mb-2">Dependencies</div>
                <div className="space-y-1">
                  {details.dependencies.map((dep, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      <span className="font-mono">{dep}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium mb-2">Dependencies</div>
                <div className="text-sm text-gray-400 italic">No dependencies listed</div>
              </div>
            )}
            
            {details.methods && details.methods.length > 0 ? (
              <div>
                <div className="text-sm font-medium mb-2">
                  {itemType === 'db' ? 'Operations' : 'Methods Used'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {details.methods.map((method, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium mb-2">
                  {itemType === 'db' ? 'Operations' : 'Methods Used'}
                </div>
                <div className="text-sm text-gray-400 italic">No methods listed</div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--om-purple)] hover:bg-[var(--om-purple)]/90 text-white rounded-md text-sm">
                <ExternalLinkIcon />
                Open in Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Legend Panel
const LegendPanel = () => {
  if (!isLegendOpen) return null;

  const legendItems = [
    { symbol: '🟪', type: 'TSX Component', color: '#5E2B97', notes: 'Frontend files' },
    { symbol: '🟨', type: 'API Route', color: '#E5C07B', notes: 'Express route handler' },
    { symbol: '⚫', type: 'DB Table', color: '#4C4C4C', notes: 'SQL/MariaDB table' },
    { symbol: '🟦', type: 'Shared Util', color: '#7FB3FF', notes: 'Used in multiple places' }
  ];

  const connectionTypes = [
    { type: 'imports', label: 'Imports', color: '#8B5CF6', style: 'dashed', description: 'Direct file imports' },
    { type: 'api_call', label: 'API Calls', color: '#F59E0B', style: 'solid', description: 'HTTP requests to APIs' },
    { type: 'db_read', label: 'DB Reads', color: '#10B981', style: 'solid', description: 'Database SELECT queries' },
    { type: 'db_write', label: 'DB Writes', color: '#EF4444', style: 'solid', description: 'Database INSERT/UPDATE/DELETE' }
  ];

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-[var(--om-border)] shadow-lg z-50 overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookIcon />
            <h3 className="font-medium text-[var(--om-purple)]">Legend & Key</h3>
          </div>
          <button 
            onClick={() => setIsLegendOpen(false)}
            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-md flex items-center justify-center"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Node Types */}
        <div className="mb-4 border border-[var(--om-border)] rounded-lg">
          <div className="p-4 border-b border-[var(--om-border)]">
            <h4 className="font-medium">Node Types</h4>
          </div>
          <div className="p-4 space-y-3">
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-lg">{item.symbol}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{item.type}</div>
                    <div className="text-xs text-gray-500">{item.notes}</div>
                  </div>
                </div>
                <div 
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Connection Types */}
        <div className="border border-[var(--om-border)] rounded-lg">
          <div className="p-4 border-b border-[var(--om-border)]">
            <h4 className="font-medium">Connection Types</h4>
          </div>
          <div className="p-4 space-y-3">
            {connectionTypes.map((connection, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex flex-col items-center">
                      <svg width="24" height="12" className="mb-1">
                        <line
                          x1="2"
                          y1="6"
                          x2="22"
                          y2="6"
                          stroke={connection.color}
                          strokeWidth="2"
                          strokeDasharray={connection.style === 'dashed' ? '3,3' : '0'}
                        />
                        <polygon
                          points="18,3 22,6 18,9"
                          fill={connection.color}
                          stroke="none"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{connection.label}</div>
                      <div className="text-xs text-gray-500">{connection.description}</div>
                    </div>
                  </div>
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border"
                    style={{ 
                      borderColor: connection.color,
                      color: connection.color
                    }}
                  >
                    {connection.style}
                  </span>
                </div>
                {index < connectionTypes.length - 1 && <div className="border-t border-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-4 border border-[var(--om-border)] rounded-lg bg-[var(--om-gold)]/5">
          <div className="p-4 border-b border-[var(--om-border)]">
            <h4 className="font-medium flex items-center gap-2">
              <span className="text-[var(--om-gold)]">💡</span>
              Usage Tips
            </h4>
          </div>
          <div className="p-4 text-sm text-gray-600 space-y-2">
            <p>• Click on any node to see its dependencies highlighted</p>
            <p>• Hover over connections to see relationship details</p>
            <p>• Use the file tree to quickly locate specific components</p>
            <p>• Connected nodes remain visible when one is selected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

return (
  <div className="min-h-screen flex flex-col bg-[var(--om-parchment)] relative">
    {/* Header */}
    <header className="w-full border-b border-[var(--om-border)] bg-[var(--om-parchment)] px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--om-purple)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            OM File Deps
            {focusedNodeId && !showAllNodes && (
              <span className="text-lg text-[var(--om-gold)] ml-3">
                🎯 {data?.dependencyNodes.find(n => n.id === focusedNodeId)?.name}
              </span>
            )}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              isLegendOpen 
                ? 'bg-[var(--om-gold)]/20 border-[var(--om-gold)] text-[var(--om-purple)]' 
                : 'border-[var(--om-border)] hover:bg-[var(--om-gold)]/10'
            }`}
          >
            <BookIcon />
            Legend
          </button>
          
          <button 
            onClick={async () => {
              setScanningFull(true);
              try {
                const response = await fetch('/api/deps/scan/trigger', { method: 'POST' });
                if (response.ok) {
                  showToast("Full scan triggered. This may take a minute.");
                  // Reload data after a delay
                  setTimeout(async () => {
                    const dataResponse = await fetch('/api/deps/scan');
                    if (dataResponse.ok) {
                      const newData = await dataResponse.json();
                      setData(newData);
                      setLastScanTime(new Date().toISOString());
                    }
                  }, 5000);
                } else {
                  showToast("Failed to trigger scan. Please try again.");
                }
              } catch (error) {
                showToast("Error triggering scan. Please try again.");
              } finally {
                setScanningFull(false);
              }
            }}
            disabled={scanningFull}
            className="px-4 py-2 bg-[var(--om-gold)] hover:bg-[var(--om-gold)]/90 text-[var(--om-purple)] rounded-md shadow-md text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshIcon className={scanningFull ? 'animate-spin' : ''} />
            {scanningFull ? 'Scanning...' : 'Run Full Scan'}
          </button>
          
          <button 
            onClick={() => {
              if (!data) return;
              
              let exportData: any = {
                timestamp: new Date().toISOString(),
                selectedNode: selectedNode || selectedFile,
                nodes: [],
                connections: []
              };
              
              if (selectedNodeId || selectedFileId) {
                // Export selected node and 1-hop connections
                const nodeId = selectedNodeId || selectedFileId;
                const connectedIds = new Set<string>([nodeId]);
                
                // Find all connected nodes (1-hop)
                data.connections.forEach(conn => {
                  if (conn.from === nodeId) connectedIds.add(conn.to);
                  if (conn.to === nodeId) connectedIds.add(conn.from);
                });
                
                // Add nodes
                exportData.nodes = data.dependencyNodes.filter(n => connectedIds.has(n.id));
                
                // Add connections
                exportData.connections = data.connections.filter(conn => 
                  connectedIds.has(conn.from) && connectedIds.has(conn.to)
                );
                
                // Add node details
                exportData.nodeDetails = {};
                exportData.nodes.forEach((node: DependencyNode) => {
                  if (data.nodeDetails[node.name]) {
                    exportData.nodeDetails[node.name] = data.nodeDetails[node.name];
                  }
                });
              } else {
                // Export all data
                exportData = data;
              }
              
              // Download JSON
              const fileName = selectedNode 
                ? `om-deps-${selectedNode.name.replace(/[^a-z0-9]/gi, '_')}.json`
                : selectedFile
                ? `om-deps-${selectedFile.name.replace(/[^a-z0-9]/gi, '_')}.json`
                : 'om-deps-full.json';
              
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              showToast(`Exported ${fileName}`);
            }}
            className="px-4 py-2 border border-[var(--om-border)] hover:bg-[var(--om-gold)]/10 rounded-md text-sm font-medium flex items-center gap-2"
          >
            <DownloadIcon />
            Export JSON
          </button>
        </div>
      </div>
    </header>
    
    <main className="flex-1 max-w-7xl mx-auto w-full flex relative">
      {/* Left Panel - File Input (20%) */}
      <div className="w-1/5 min-h-[calc(100vh-140px)]">
        <FileTreePane />
      </div>
      
      {/* Middle Panel - Integration Map (60%) */}
      <div className="w-3/5 min-h-[calc(100vh-140px)]">
        <DependencyGraph />
      </div>
      
      {/* Right Panel - Details (20%) */}
      <div className="w-1/5 min-h-[calc(100vh-140px)]">
        <DetailsPane />
      </div>
      
      {/* Legend Panel Overlay */}
      <LegendPanel />
      
      {/* Backdrop for legend panel */}
      {isLegendOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsLegendOpen(false)}
        />
      )}
    </main>
    
    {/* Footer */}
    <footer className="w-full border-t border-[var(--om-border)] bg-[var(--om-parchment)] px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
        <div>
          <span>OrthodoxMetrics File Dependencies v1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Last scan: {lastScanTime === 'Never' ? 'Never' : new Date(lastScanTime).toLocaleString()}</span>
          <span>•</span>
          <span>Files analyzed: {visibleNodes.length}</span>
          {focusedNodeId && !showAllNodes && (
            <>
              <span>•</span>
              <span>🎯 Focused view</span>
            </>
          )}
        </div>
      </div>
    </footer>
    
    {/* Toast Notification */}
    {toastMessage && (
      <div className="fixed bottom-4 right-4 bg-[var(--om-purple)] text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
        {toastMessage}
      </div>
    )}
  </div>
);
}