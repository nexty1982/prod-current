import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefactorScan, FileNode, Classification, FilterState, SortOption, TreeItem } from '@/types/refactorConsole';
import refactorConsoleClient from '../api/refactorConsoleClient';

interface UseRefactorScanReturn {
  scanData: RefactorScan | null;
  isLoading: boolean;
  error: string | null;
  
  // Filtering and search
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  
  // Sorting
  sortOption: SortOption;
  setSortOption: React.Dispatch<React.SetStateAction<SortOption>>;
  
  // Tree structure
  treeItems: TreeItem[];
  expandedPaths: Set<string>;
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Actions
  loadScanData: (rebuild?: boolean) => Promise<void>;
  refreshScan: () => Promise<void>;
  
  // Utilities
  toggleExpanded: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Statistics
  filteredCount: number;
  visibleNodes: FileNode[];
}

export const useRefactorScan = (): UseRefactorScanReturn => {
  const [scanData, setScanData] = useState<RefactorScan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterState, setFilterState] = useState<FilterState>({
    classifications: ['green', 'orange', 'yellow', 'red'],
    searchQuery: '',
    fileType: '',
    modifiedDays: 0,
    showDuplicates: false,
  });
  
  const [sortOption, setSortOption] = useState<SortOption>({
    key: 'score',
    direction: 'desc',
    label: 'Usage Score (High to Low)',
  });
  
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Load scan data
  const loadScanData = useCallback(async (rebuild: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await refactorConsoleClient.scan(rebuild);
      setScanData(data);
      
      // Auto-expand first level directories
      const autoExpandPaths = new Set<string>();
      if (data.nodes) {
        data.nodes
          .filter(node => node.type === 'dir')
          .slice(0, 5)  // Expand first 5 directories
          .forEach(node => autoExpandPaths.add(node.path));
      }
      setExpandedPaths(autoExpandPaths);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan data');
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshScan = useCallback(() => {
    return loadScanData(true);
  }, [loadScanData]);

  // Apply filters and sorting
  const filteredAndSortedNodes = useMemo(() => {
    if (!scanData?.nodes) return [];
    
    let filtered = scanData.nodes;
    
    // Apply classification filter
    filtered = filtered.filter(node => 
      filterState.classifications.includes(node.classification)
    );
    
    // Apply search query
    if (filterState.searchQuery.trim()) {
      const query = filterState.searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.relPath.toLowerCase().includes(query) ||
        node.reasons.some(reason => reason.toLowerCase().includes(query))
      );
    }
    
    // Apply file type filter
    if (filterState.fileType) {
      filtered = filtered.filter(node => 
        node.type === 'file' && 
        node.relPath.toLowerCase().endsWith(filterState.fileType.toLowerCase())
      );
    }
    
    // Apply modification date filter
    if (filterState.modifiedDays > 0) {
      const cutoffDate = Date.now() - (filterState.modifiedDays * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(node => node.mtimeMs >= cutoffDate);
    }
    
    // Apply duplicates filter
    if (filterState.showDuplicates) {
      filtered = filtered.filter(node => 
        node.similarity?.duplicates.length || node.similarity?.nearMatches.length
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption.key) {
        case 'score':
          comparison = a.usage.score - b.usage.score;
          break;
        case 'name':
          comparison = a.relPath.localeCompare(b.relPath);
          break;
          case 'mtime':
            comparison = a.mtimeMs - b.mtimeMs;
            break;
            case 'classification':
              const classificationOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
              comparison = classificationOrder[a.classification] - classificationOrder[b.classification];
              break;
            default:
              comparison = 0;
          }
          
          return sortOption.direction === 'desc' ? -comparison : comparison;
        });
        
        return filtered;
      }, [scanData?.nodes, filterState, sortOption]);
      
      // Build tree structure
      const treeItems = useMemo(() => {
        if (!filteredAndSortedNodes.length) return [];
        
        const treeMap = new Map<string, TreeItem>();
        const rootItems: TreeItem[] = [];
        
        // Create tree item for each node
        filteredAndSortedNodes.forEach(node => {
          const treeItem: TreeItem = {
            ...node,
            children: [],
            expanded: expandedPaths.has(node.path),
            visible: true,
            parentPath: undefined,
          };
          treeMap.set(node.path, treeItem);
        });
        
        // Build hierarchy
        filteredAndSortedNodes.forEach(node => {
          const treeItem = treeMap.get(node.path)!;
          
          // Find the closest parent directory
          const pathParts = node.path.split('/');
          let parentPath = '';
          
          for (let i = pathParts.length - 1; i > 0; i--) {
            parentPath = pathParts.slice(0, i).join('/');
            const parentItem = treeMap.get(parentPath + '/'); // Directory paths end with '/'
            
            if (parentItem) {
              parentItem.children!.push(treeItem);
              treeItem.parentPath = parentPath;
              break;
            }
            
            parentPath = pathParts.slice(0, i).join('/');
            const parentDirItem = treeMap.get(parentPath);
            
            if (parentDirItem && parentDirItem.type === 'dir') {
              parentDirItem.children!.push(treeItem);
              treeItem.parentPath = parentPath;
              break;
            }
          }
          
          // If no parent found, it's a root item
          if (!treeItem.parentPath) {
            rootItems.push(treeItem);
          }
        });
        
        return rootItems;
      }, [filteredAndSortedNodes, expandedPaths]);
      
      // Utility functions
      const toggleExpanded = useCallback((path: string) => {
        setExpandedPaths(prev => {
          const newSet = new Set(prev);
          if (newSet.has(path)) {
            newSet.delete(path);
          } else {
            newSet.add(path);
          }
          return newSet;
        });
      }, []);
      
      const expandAll = useCallback(() => {
        const allDirPaths = scanData?.nodes
          ?.filter(node => node.type === 'dir')
          .map(node => node.path) || [];
        setExpandedPaths(new Set(allDirPaths));
      }, [scanData?.nodes]);
      
      const collapseAll = useCallback(() => {
        setExpandedPaths(new Set());
      }, []);
      
      // Auto-load on mount
      useEffect(() => {
        loadScanData();
      }, [loadScanData]);
      
      return {
        scanData,
        isLoading,
        error,
        filterState,
        setFilterState,
        sortOption,
        setSortOption,
        treeItems,
        expandedPaths,
        setExpandedPaths,
        loadScanData,
        refreshScan,
        toggleExpanded,
        expandAll,
        collapseAll,
        filteredCount: filteredAndSortedNodes.length,
        visibleNodes: filteredAndSortedNodes,
      };
    };
