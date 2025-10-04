import React, { useState, useEffect } from 'react';
import { OMAIUltimateLogger } from './OMAIUltimateLogger';
import { SimpleLogViewer } from './SimpleLogViewer';

/**
 * Demo component showcasing the OMAI Ultimate Logger with error handling
 */
export const Demo: React.FC = () => {
  const [useSimpleViewer, setUseSimpleViewer] = useState(false); // Start with full logger
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Add a small delay to ensure component initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4 mx-auto"></div>
          Loading OMAI Ultimate Logger...
        </div>
      </div>
    );
  }

  // Use simple viewer for debugging
  if (useSimpleViewer || error) {
    return (
      <div className="w-full h-screen bg-slate-950">
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setUseSimpleViewer(!useSimpleViewer)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            {useSimpleViewer ? '🎨 Full Logger' : '🔍 Debug Mode'}
          </button>
        </div>
        <SimpleLogViewer />
      </div>
    );
  }

  try {
    return (
      <div className="w-full h-screen bg-slate-950">
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setUseSimpleViewer(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
          >
            🔍 Debug Mode
          </button>
        </div>
        <OMAIUltimateLogger
          autoScroll={true}
          defaultFilter={{
            // Basic filter to start with
          }}
          refreshInterval={30000}
        />
      </div>
    );
  } catch (err: any) {
    console.error('OMAI Logger Error:', err);
    setError(err.message || 'Unknown error occurred');
    setUseSimpleViewer(true);
    return null;
  }
};

/**
 * Example usage in a route or parent component:
 * 
 * import { Demo } from './components/OMAI/Logger/Demo';
 * 
 * function App() {
 *   return (
 *     <Routes>
 *       <Route path="/logs" element={<Demo />} />
 *     </Routes>
 *   );
 * }
 */

export default Demo;
