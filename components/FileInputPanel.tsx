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