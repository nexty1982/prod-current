import { X, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface LegendItem {
  symbol: string;
  type: string;
  color: string;
  notes: string;
}

const legendItems: LegendItem[] = [
  {
    symbol: '🟪',
    type: 'TSX Component',
    color: '#5E2B97',
    notes: 'Frontend files'
  },
  {
    symbol: '🟨',
    type: 'API Route',
    color: '#E5C07B',
    notes: 'Express route handler'
  },
  {
    symbol: '⚫',
    type: 'DB Table',
    color: '#4C4C4C',
    notes: 'SQL/MariaDB table'
  },
  {
    symbol: '🟦',
    type: 'Shared Util',
    color: '#7FB3FF',
    notes: 'Used in multiple places'
  }
];

const connectionTypes = [
  {
    type: 'imports',
    label: 'Imports',
    color: '#8B5CF6',
    style: 'dashed',
    description: 'Direct file imports'
  },
  {
    type: 'api_call',
    label: 'API Calls',
    color: '#F59E0B',
    style: 'solid',
    description: 'HTTP requests to APIs'
  },
  {
    type: 'db_read',
    label: 'DB Reads',
    color: '#10B981',
    style: 'solid',
    description: 'Database SELECT queries'
  },
  {
    type: 'db_write',
    label: 'DB Writes',
    color: '#EF4444',
    style: 'solid',
    description: 'Database INSERT/UPDATE/DELETE'
  }
];

interface LegendPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LegendPanel({ isOpen, onClose }: LegendPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-[var(--om-border)] shadow-lg z-50 overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--om-purple)]" />
            <h3 className="font-medium text-[var(--om-purple)]">Legend & Key</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Node Types */}
        <Card className="mb-4 border-[var(--om-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Node Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Connection Types */}
        <Card className="border-[var(--om-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connection Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: connection.color,
                      color: connection.color
                    }}
                  >
                    {connection.style}
                  </Badge>
                </div>
                {index < connectionTypes.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Usage Tips */}
        <Card className="mt-4 border-[var(--om-border)] bg-[var(--om-gold)]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-[var(--om-gold)]">💡</span>
              Usage Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>• Click on any node to see its dependencies highlighted</p>
            <p>• Hover over connections to see relationship details</p>
            <p>• Use the file tree to quickly locate specific components</p>
            <p>• Connected nodes remain visible when one is selected</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}