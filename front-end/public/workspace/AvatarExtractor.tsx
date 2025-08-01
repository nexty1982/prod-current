import React, { useState, useRef } from 'react';

interface ExtractedAvatar {
  id: number;
  blob: Blob;
  url: string;
}

const AvatarExtractor: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<ExtractedAvatar[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setAvatars([]);
    setError(null);

    // Create URL for the uploaded image
    const imageUrl = URL.createObjectURL(file);
    setSourceImage(imageUrl);
  };

  const extractAvatars = () => {
    if (!sourceImage) {
      setError('Please upload an image first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Canvas not available');

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Calculate avatar dimensions
        const avatarWidth = img.width / 3;
        const avatarHeight = img.height / 3;

        const extractedAvatars: ExtractedAvatar[] = [];

        // Extract each avatar
        let avatarCount = 1;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            // Set canvas size to 200x200
            canvas.width = 200;
            canvas.height = 200;
            
            // Calculate source coordinates
            const sx = col * avatarWidth;
            const sy = row * avatarHeight;
            
            // Draw the cropped section to the canvas, resizing to 200x200
            ctx.drawImage(
              img,
              sx, sy, avatarWidth, avatarHeight,
              0, 0, 200, 200
            );
            
            // Convert canvas to blob
            canvas.toBlob((blob) => {
              if (blob) {
                const avatarUrl = URL.createObjectURL(blob);
                extractedAvatars.push({
                  id: avatarCount,
                  blob,
                  url: avatarUrl
                });
                
                // When all avatars are processed
                if (extractedAvatars.length === 9) {
                  // Sort by ID to ensure correct order
                  extractedAvatars.sort((a, b) => a.id - b.id);
                  setAvatars(extractedAvatars);
                  setIsProcessing(false);
                }
              }
            }, 'image/png');
            
            avatarCount++;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setError('Failed to load the image');
      setIsProcessing(false);
    };

    img.src = sourceImage;
  };

  const downloadAvatar = (avatar: ExtractedAvatar) => {
    const link = document.createElement('a');
    link.href = avatar.url;
    link.download = `avatar_${avatar.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAvatars = () => {
    avatars.forEach(avatar => {
      downloadAvatar(avatar);
    });
  };

  return (
    <div className="avatar-extractor">
      <h1>Avatar Extractor</h1>
      <p>Upload a 3x3 grid image to extract individual 200x200 pixel avatars</p>
      
      <div className="upload-section">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          disabled={isProcessing}
        />
        <button 
          onClick={extractAvatars} 
          disabled={!sourceImage || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Extract Avatars'}
        </button>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {sourceImage && (
        <div className="source-image">
          <h2>Source Image</h2>
          <img src={sourceImage} alt="Source" style={{ maxWidth: '100%' }} />
        </div>
      )}
      
      {avatars.length > 0 && (
        <div className="results">
          <h2>Extracted Avatars</h2>
          <button onClick={downloadAllAvatars}>Download All Avatars</button>
          <div className="avatars-grid">
            {avatars.map(avatar => (
              <div key={avatar.id} className="avatar-item">
                <img src={avatar.url} alt={`Avatar ${avatar.id}`} width="200" height="200" />
                <div className="avatar-info">
                  <span>avatar_{avatar.id}.png</span>
                  <button onClick={() => downloadAvatar(avatar)}>Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Hidden canvas used for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <style jsx>{`
        .avatar-extractor {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .upload-section {
          margin: 20px 0;
          display: flex;
          gap: 10px;
        }
        
        button {
          padding: 8px 16px;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .error {
          color: #d32f2f;
          margin: 10px 0;
          padding: 10px;
          background-color: #ffebee;
          border-radius: 4px;
        }
        
        .source-image {
          margin: 20px 0;
        }
        
        .results {
          margin: 30px 0;
        }
        
        .avatars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .avatar-item {
          border: 1px solid #eaeaea;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .avatar-info {
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f9f9f9;
        }
      `}</style>
    </div>
  );
};

export default AvatarExtractor;