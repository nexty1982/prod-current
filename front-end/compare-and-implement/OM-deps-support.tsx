import { Button } from "./ui/button";
import { RotateCw, Download, BookOpen } from "lucide-react";

interface HeaderProps {
  onToggleLegend: () => void;
  isLegendOpen: boolean;
}

export function Header({ onToggleLegend, isLegendOpen }: HeaderProps) {
  return (
    <header className="w-full border-b border-[var(--om-border)] bg-[var(--om-parchment)] px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--om-purple)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            OM File Deps
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={onToggleLegend}
            className={`border-[var(--om-border)] ${
              isLegendOpen 
                ? 'bg-[var(--om-gold)]/20 border-[var(--om-gold)] text-[var(--om-purple)]' 
                : 'hover:bg-[var(--om-gold)]/10'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Legend
          </Button>
          
          <Button 
            className="bg-[var(--om-gold)] hover:bg-[var(--om-gold)]/90 text-[var(--om-purple)] shadow-md"
            size="sm"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Run Full Scan
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="border-[var(--om-border)] hover:bg-[var(--om-gold)]/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>
    </header>
  );
}

import { useState } from "react";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, FileText, Code, Database, Folder, FolderOpen, Wrench } from "lucide-react";

interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'tsx' | 'api' | 'db' | 'shared';
  path: string;
  children?: FileNode[];
  isOpen?: boolean;
}

const mockFileTree: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    path: 'src/',
    isOpen: true,
    children: [
      { id: '2', name: 'components', type: 'folder', path: 'src/components/', isOpen: true, children: [
        { id: '3', name: 'Header.tsx', type: 'tsx', path: 'src/components/Header.tsx' },
        { id: '4', name: 'Dashboard.tsx', type: 'tsx', path: 'src/components/Dashboard.tsx' },
        { id: '5', name: 'UserProfile.tsx', type: 'tsx', path: 'src/components/UserProfile.tsx' }
      ]},
      { id: '6', name: 'pages', type: 'folder', path: 'src/pages/', children: [
        { id: '7', name: 'HomePage.tsx', type: 'tsx', path: 'src/pages/HomePage.tsx' },
        { id: '8', name: 'SettingsPage.tsx', type: 'tsx', path: 'src/pages/SettingsPage.tsx' }
      ]},
      { id: '9', name: 'utils', type: 'folder', path: 'src/utils/', children: [
        { id: '10', name: 'api.tsx', type: 'tsx', path: 'src/utils/api.tsx' },
        { id: '11', name: 'helpers.tsx', type: 'tsx', path: 'src/utils/helpers.tsx' }
      ]}
    ]
  },
  {
    id: '12',
    name: 'server',
    type: 'folder',
    path: 'server/',
    children: [
      { id: '13', name: 'routes', type: 'folder', path: 'server/routes/', children: [
        { id: '14', name: 'auth.api', type: 'api', path: 'server/routes/auth.api' },
        { id: '15', name: 'users.api', type: 'api', path: 'server/routes/users.api' },
        { id: '16', name: 'metrics.api', type: 'api', path: 'server/routes/metrics.api' }
      ]},
      { id: '17', name: 'db', type: 'folder', path: 'server/db/', children: [
        { id: '18', name: 'users.db', type: 'db', path: 'server/db/users.db' },
        { id: '19', name: 'metrics.db', type: 'db', path: 'server/db/metrics.db' }
      ]}
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
];

const getFileIcon = (type: string, isOpen?: boolean) => {
  switch (type) {
    case 'folder':
      return isOpen ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-blue-500" />;
    case 'tsx':
      return <Code className="w-4 h-4 text-[var(--om-purple)]" />;
    case 'api':
      return <FileText className="w-4 h-4 text-[var(--om-gold)]" />;
    case 'db':
      return <Database className="w-4 h-4 text-gray-600" />;
    case 'shared':
      return <Wrench className="w-4 h-4 text-[var(--om-blue)]" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

interface FileTreeNodeProps {
  node: FileNode;
  onSelect: (node: FileNode) => void;
  selectedId?: string;
  depth?: number;
}

function FileTreeNode({ node, onSelect, selectedId, depth = 0 }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(node.isOpen || false);
  
  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    }
    onSelect(node);
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[var(--om-gold)]/10 rounded-sm ${
          selectedId === node.id ? 'bg-[var(--om-gold)]/20' : ''
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
            <FileTreeNode 
              key={child.id} 
              node={child} 
              onSelect={onSelect}
              selectedId={selectedId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileInputPanelProps {
  onFileSelect: (node: FileNode) => void;
}

export function FileInputPanel({ onFileSelect }: FileInputPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState('all');
  const [selectedFileId, setSelectedFileId] = useState<string>();

  const handleFileSelect = (node: FileNode) => {
    setSelectedFileId(node.id);
    onFileSelect(node);
  };

  const filteredFiles = mockFileTree.filter(node => {
    if (selectedDirectory !== 'all' && node.name !== selectedDirectory) {
      return false;
    }
    return node.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full h-full bg-white border-r border-[var(--om-border)] p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-[var(--om-purple)] mb-3">File Explorer</h3>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[var(--om-border)]"
            />
          </div>
          
          <Select value={selectedDirectory} onValueChange={setSelectedDirectory}>
            <SelectTrigger className="border-[var(--om-border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directories</SelectItem>
              <SelectItem value="src">src/</SelectItem>
              <SelectItem value="server">server/</SelectItem>
              <SelectItem value="shared">shared/</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="border rounded-md border-[var(--om-border)] bg-gray-50/50 p-2 max-h-[600px] overflow-y-auto">
          {filteredFiles.map(node => (
            <FileTreeNode 
              key={node.id} 
              node={node} 
              onSelect={handleFileSelect}
              selectedId={selectedFileId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Badge } from "./ui/badge";

interface DependencyNode {
  id: string;
  name: string;
  type: 'frontend' | 'api' | 'db' | 'shared';
  x: number;
  y: number;
  connections: string[];
}

interface DependencyConnection {
  from: string;
  to: string;
  type: 'imports' | 'api_call' | 'db_write' | 'db_read';
}

const mockNodes: DependencyNode[] = [
  { id: '1', name: 'Dashboard.tsx', type: 'frontend', x: 100, y: 150, connections: ['2', '3', '9'] },
  { id: '2', name: 'UserProfile.tsx', type: 'frontend', x: 100, y: 250, connections: ['4', '9'] },
  { id: '3', name: 'Header.tsx', type: 'frontend', x: 100, y: 50, connections: ['4', '9'] },
  { id: '4', name: '/api/users', type: 'api', x: 350, y: 150, connections: ['6'] },
  { id: '5', name: '/api/metrics', type: 'api', x: 350, y: 250, connections: ['7'] },
  { id: '6', name: 'users.db', type: 'db', x: 600, y: 150, connections: [] },
  { id: '7', name: 'metrics.db', type: 'db', x: 600, y: 250, connections: [] },
  { id: '8', name: 'SettingsPage.tsx', type: 'frontend', x: 100, y: 350, connections: ['4', '5'] },
  { id: '9', name: 'utils.ts', type: 'shared', x: 100, y: 450, connections: [] },
];

const mockConnections: DependencyConnection[] = [
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
  { from: '8', to: '5', type: 'api_call' },
];

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

interface IntegrationMapProps {
  onNodeSelect: (node: DependencyNode) => void;
}

export function IntegrationMap({ onNodeSelect }: IntegrationMapProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleNodeClick = (node: DependencyNode) => {
    setSelectedNode(node.id);
    onNodeSelect(node);
  };

  const isConnected = (nodeId: string) => {
    if (!selectedNode) return false;
    return mockConnections.some(conn => 
      (conn.from === selectedNode && conn.to === nodeId) ||
      (conn.to === selectedNode && conn.from === nodeId)
    );
  };

  return (
    <div className="w-full h-full bg-white border-r border-[var(--om-border)] p-4">
      <div className="mb-4">
        <h3 className="font-medium text-[var(--om-purple)] mb-2">Integration Map</h3>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 bg-[var(--om-purple)] rounded-full mr-2"></div>
            Frontend
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 bg-[var(--om-gold)] rounded-full mr-2"></div>
            API
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 bg-gray-600 rounded-full mr-2"></div>
            Database
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 bg-[var(--om-blue)] rounded-full mr-2"></div>
            Shared
          </Badge>
        </div>
      </div>
      
      <div className="border rounded-lg border-[var(--om-border)] bg-gray-50/30 h-[600px] relative overflow-hidden">
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          className="absolute inset-0"
        >
          {/* Render connections */}
          {mockConnections.map((connection, index) => {
            const fromNode = mockNodes.find(n => n.id === connection.from);
            const toNode = mockNodes.find(n => n.id === connection.to);
            
            if (!fromNode || !toNode) return null;
            
            const isHighlighted = selectedNode && (
              connection.from === selectedNode || 
              connection.to === selectedNode
            );
            
            return (
              <line
                key={index}
                x1={fromNode.x + 60}
                y1={fromNode.y + 15}
                x2={toNode.x}
                y2={toNode.y + 15}
                stroke={isHighlighted ? getConnectionColor(connection.type) : '#E5E7EB'}
                strokeWidth={isHighlighted ? 2 : 1}
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
        {mockNodes.map(node => (
          <div
            key={node.id}
            className={`absolute px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 shadow-sm border ${
              selectedNode === node.id 
                ? 'ring-2 ring-[var(--om-gold)] shadow-lg' 
                : hoveredNode === node.id
                ? 'shadow-md transform scale-105'
                : 'hover:shadow-md'
            } ${
              selectedNode && !isConnected(node.id) && selectedNode !== node.id
                ? 'opacity-30'
                : ''
            }`}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              backgroundColor: selectedNode === node.id ? getNodeColor(node.type) : 'white',
              borderColor: getNodeColor(node.type),
              color: selectedNode === node.id ? 'white' : 'inherit'
            }}
            onClick={() => handleNodeClick(node)}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedNode === node.id ? 'white' : getNodeColor(node.type) }}
              />
              <span className="text-sm font-medium whitespace-nowrap">
                {node.name}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {selectedNode && (
        <div className="mt-4 p-3 bg-[var(--om-gold)]/10 border border-[var(--om-gold)]/20 rounded-lg">
          <div className="text-sm">
            <strong>Selected:</strong> {mockNodes.find(n => n.id === selectedNode)?.name}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Click on connected nodes to explore dependencies
          </div>
        </div>
      )}
    </div>
  );
}

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { ExternalLink, Clock, Database, Route, FileText } from "lucide-react";

interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'tsx' | 'api' | 'db';
  path: string;
}

interface DependencyNode {
  id: string;
  name: string;
  type: 'frontend' | 'api' | 'db' | 'shared';
  x: number;
  y: number;
  connections: string[];
}

interface DetailsPanelProps {
  selectedFile?: FileNode;
  selectedNode?: DependencyNode;
}

const getMockDetails = (item: FileNode | DependencyNode) => {
  // Mock data based on the item
  const mockDetails = {
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
    }
  };

  return mockDetails[item.name as keyof typeof mockDetails] || {
    lines: 42,
    lastModified: '1 hour ago',
    routes: [],
    dbTables: [],
    dependencies: [],
    methods: []
  };
};

const getItemIcon = (type: string) => {
  switch (type) {
    case 'tsx':
    case 'frontend':
      return <FileText className="w-4 h-4 text-[var(--om-purple)]" />;
    case 'api':
      return <Route className="w-4 h-4 text-[var(--om-gold)]" />;
    case 'db':
      return <Database className="w-4 h-4 text-gray-600" />;
    case 'shared':
      return <FileText className="w-4 h-4 text-[var(--om-blue)]" />;
    default:
      return <FileText className="w-4 h-4" />;
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

export function DetailsPanel({ selectedFile, selectedNode }: DetailsPanelProps) {
  const selectedItem = selectedNode || selectedFile;
  
  if (!selectedItem) {
    return (
      <div className="w-full h-full bg-white p-4 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Select a file or node to view details</p>
        </div>
      </div>
    );
  }

  const details = getMockDetails(selectedItem);
  const itemType = 'type' in selectedItem ? selectedItem.type : selectedItem.type;

  return (
    <div className="w-full h-full bg-white p-4 space-y-4">
      <div>
        <h3 className="font-medium text-[var(--om-purple)] mb-3">Details Panel</h3>
        
        <Card className="border-[var(--om-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getItemIcon(itemType)}
              {selectedItem.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                style={{ 
                  borderColor: getItemColor(itemType),
                  color: getItemColor(itemType)
                }}
              >
                {itemType.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {details.lastModified}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Path</div>
              <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                {'path' in selectedItem ? selectedItem.path : `/${selectedItem.name}`}
              </div>
            </div>
            
            {details.lines > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Lines of Code</div>
                <div className="text-sm text-gray-600">{details.lines}</div>
              </div>
            )}
            
            {details.routes.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Routes Touched</div>
                <div className="space-y-1">
                  {details.routes.map((route, index) => (
                    <Badge key={index} variant="outline" className="text-xs mr-1 mb-1">
                      {route}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {details.dbTables.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">DB Tables Affected</div>
                <div className="space-y-1">
                  {details.dbTables.map((table, index) => (
                    <Badge key={index} variant="outline" className="text-xs mr-1 mb-1">
                      <Database className="w-3 h-3 mr-1" />
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {details.dependencies.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Dependencies</div>
                <div className="space-y-1">
                  {details.dependencies.map((dep, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded flex justify-between items-center">
                      <span className="font-mono">{dep}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {details.methods.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">
                  {itemType === 'db' ? 'Operations' : 'Methods Used'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {details.methods.map((method, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <Separator />
            
            <Button 
              size="sm" 
              className="w-full bg-[var(--om-purple)] hover:bg-[var(--om-purple)]/90"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Editor
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function Footer() {
  const currentTime = new Date().toLocaleString();
  
  return (
    <footer className="w-full border-t border-[var(--om-border)] bg-[var(--om-parchment)] px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="text-xs text-gray-600 text-center">
          <span className="font-medium">OrthodoxMetrics Internal Dev Tool</span>
          <span className="mx-2">•</span>
          <span>Last scan: {currentTime}</span>
        </div>
      </div>
    </footer>
  );
}