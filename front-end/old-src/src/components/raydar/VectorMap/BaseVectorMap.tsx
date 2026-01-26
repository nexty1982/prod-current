import { useEffect, useState } from 'react';

interface BaseVectorMapProps {
  width?: string;
  height?: string;
  options?: any;
  type: string;
  className?: string;
}

const BaseVectorMap = ({ width = '100%', height = '400px', options, type, className }: BaseVectorMapProps) => {
  const selectorId = `vector-map-${type}-${new Date().getTime()}`;
  const [map, setMap] = useState<any>();

  useEffect(() => {
    // Load jsVectorMap library dynamically if not already loaded
    const loadVectorMap = async () => {
      if (!(window as any)['jsVectorMap']) {
        try {
          // You would need to install jsvectormap package
          console.warn('jsVectorMap library not loaded. Please install and import jsvectormap.');
          return;
        } catch (error) {
          console.error('Failed to load jsVectorMap:', error);
          return;
        }
      }

      if (!map) {
        try {
          const vectorMap = new (window as any)['jsVectorMap']({
            selector: '#' + selectorId,
            map: type,
            ...options,
          });
          setMap(vectorMap);
        } catch (error) {
          console.error('Failed to create vector map:', error);
        }
      }
    };

    loadVectorMap();
    
    return () => {
      if (map && map.destroy) {
        map.destroy();
      }
    };
  }, [selectorId, map, options, type]);

  return (
    <div 
      id={selectorId} 
      className={className}
      style={{ width: width, height: height, minHeight: '300px' }}
    >
      {/* Fallback content while map loads */}
      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
        <div>
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          Loading {type} map...
        </div>
      </div>
    </div>
  );
};

export default BaseVectorMap;