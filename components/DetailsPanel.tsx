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