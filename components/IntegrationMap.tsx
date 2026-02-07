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