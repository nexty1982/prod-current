import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, Container, Paper, Chip } from '@mui/material';

interface NameField {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'child' | 'father' | 'mother' | 'sponsor' | 'priest';
}

const BaptismRecordViewer: React.FC = () => {
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const nameFields: NameField[] = [
    { id: '1-child', text: 'Scott Christopher Fielding', x: 220, y: 290, width: 180, height: 30, type: 'child' },
    { id: '1-father', text: 'Harvey George Fielding', x: 400, y: 290, width: 150, height: 30, type: 'father' },
    { id: '1-mother', text: 'Carol Ann Mock', x: 550, y: 290, width: 120, height: 30, type: 'mother' },
    { id: '1-sponsor1', text: 'William Fielding', x: 680, y: 290, width: 120, height: 20, type: 'sponsor' },
    { id: '1-sponsor2', text: 'Kristina Mock', x: 800, y: 290, width: 120, height: 20, type: 'sponsor' },
    { id: '1-priest', text: 'Rev. Robert A. George Lewis', x: 950, y: 290, width: 180, height: 30, type: 'priest' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'child': return '#2196f3';
      case 'father': return '#4caf50';
      case 'mother': return '#e91e63';
      case 'sponsor': return '#9c27b0';
      case 'priest': return '#ff9800';
      default: return '#757575';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'child': return 'Child';
      case 'father': return 'Father';
      case 'mother': return 'Mother';
      case 'sponsor': return 'Sponsor';
      case 'priest': return 'Priest';
      default: return 'Unknown';
    }
  };

  // Create a sample baptism record image using SVG
  const sampleRecordSVG = `
    <svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#fefefe;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="400" fill="url(#paperGrad)" stroke="#ddd" stroke-width="2"/>
      
      <!-- Header -->
      <rect x="50" y="30" width="1100" height="80" fill="#4169E1" opacity="0.1"/>
      <text x="600" y="60" text-anchor="middle" font-family="serif" font-size="24" font-weight="bold" fill="#4169E1">
        ST. NICHOLAS ORTHODOX CHURCH
      </text>
      <text x="600" y="90" text-anchor="middle" font-family="serif" font-size="18" fill="#666">
        BAPTISM RECORD
      </text>
      
      <!-- Orthodox Cross -->
      <g transform="translate(100, 150)" stroke="#DAA520" stroke-width="3" fill="none">
        <line x1="0" y1="0" x2="0" y2="60"/>
        <line x1="-20" y1="20" x2="20" y2="20"/>
        <line x1="-15" y1="35" x2="15" y2="35"/>
      </g>
      
      <!-- Table Headers -->
      <rect x="200" y="200" width="1000" height="40" fill="#f0f0f0" stroke="#ccc"/>
      <text x="280" y="225" font-family="Arial" font-size="14" font-weight="bold" fill="#333">Child Name</text>
      <text x="470" y="225" font-family="Arial" font-size="14" font-weight="bold" fill="#333">Father</text>
      <text x="610" y="225" font-family="Arial" font-size="14" font-weight="bold" fill="#333">Mother</text>
      <text x="740" y="225" font-family="Arial" font-size="14" font-weight="bold" fill="#333">Sponsors</text>
      <text x="1040" y="225" font-family="Arial" font-size="14" font-weight="bold" fill="#333">Priest</text>
      
      <!-- Record Lines -->
      <line x1="200" y1="250" x2="1200" y2="250" stroke="#ddd"/>
      <line x1="200" y1="280" x2="1200" y2="280" stroke="#ddd"/>
      <line x1="200" y1="310" x2="1200" y2="310" stroke="#ddd"/>
      <line x1="200" y1="340" x2="1200" y2="340" stroke="#ddd"/>
      
      <!-- Vertical Lines -->
      <line x1="200" y1="200" x2="200" y2="350" stroke="#ccc"/>
      <line x1="450" y1="200" x2="450" y2="350" stroke="#ccc"/>
      <line x1="590" y1="200" x2="590" y2="350" stroke="#ccc"/>
      <line x1="720" y1="200" x2="720" y2="350" stroke="#ccc"/>
      <line x1="1020" y1="200" x2="1020" y2="350" stroke="#ccc"/>
      <line x1="1200" y1="200" x2="1200" y2="350" stroke="#ccc"/>
      
      <!-- Sample Data -->
      <text x="210" y="275" font-family="Arial" font-size="12" fill="#333">1.</text>
      <text x="230" y="275" font-family="Arial" font-size="12" fill="#333">Jan 15, 2024</text>
      
      <!-- Date column -->
      <text x="210" y="305" font-family="Arial" font-size="12" fill="#333">2.</text>
      <text x="230" y="305" font-family="Arial" font-size="12" fill="#333">Feb 12, 2024</text>
      
      <!-- Footer -->
      <text x="600" y="380" text-anchor="middle" font-family="serif" font-size="12" fill="#666">
        Preserving Orthodox Tradition Through Digital Excellence
      </text>
    </svg>
  `;

  // Use encodeURIComponent instead of btoa for better Unicode support
  const sampleRecordDataURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sampleRecordSVG)}`;

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box textAlign="center" mb={6}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Typography 
            variant="h3" 
            component="h2" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              background: 'linear-gradient(45deg, #4169E1 30%, #DAA520 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 2
            }}
          >
            Interactive Baptism Records
          </Typography>
          <Typography variant="h6" color="text.secondary" maxWidth="600px" mx="auto">
            Hover over the highlighted areas to see detailed information about each person in the baptism record. 
            Experience the precision of our digital record management system.
          </Typography>
        </motion.div>
      </Box>

      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
      >
        <Box display="flex" flexWrap="wrap" justifyContent="center" mb={3} gap={1}>
          {['child', 'father', 'mother', 'sponsor', 'priest'].map((type) => (
            <Chip
              key={type}
              label={getTypeLabel(type)}
              sx={{
                backgroundColor: getTypeColor(type),
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: getTypeColor(type),
                  opacity: 0.8
                }
              }}
              size="small"
            />
          ))}
        </Box>

        <Box position="relative" display="inline-block" width="100%" textAlign="center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            style={{ display: 'inline-block' }}
          >
            <img
              src={sampleRecordDataURL}
              alt="Interactive Baptism Record"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
            />
          </motion.div>

          {nameFields.map((field) => (
            <motion.div
              key={field.id}
              style={{
                position: 'absolute',
                left: `${(field.x / 1200) * 100}%`,
                top: `${(field.y / 400) * 100}%`,
                width: `${(field.width / 1200) * 100}%`,
                height: `${(field.height / 400) * 100}%`,
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.3s ease'
              }}
              whileHover={{
                backgroundColor: `${getTypeColor(field.type)}20`,
                scale: 1.05,
              }}
              onHoverStart={() => setHoveredField(field.id)}
              onHoverEnd={() => setHoveredField(null)}
              onMouseMove={(e: any) => {
                setMousePos({ 
                  x: e.clientX, 
                  y: e.clientY 
                });
              }}
            />
          ))}

          <AnimatePresence>
            {hoveredField && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  top: mousePos.y + 20,
                  left: mousePos.x + 20,
                  zIndex: 1000,
                  pointerEvents: 'none',
                  backgroundColor: getTypeColor(nameFields.find((f) => f.id === hoveredField)?.type || ''),
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  maxWidth: '200px',
                  textAlign: 'center'
                }}
              >
                <Typography variant="caption" display="block" sx={{ fontSize: '12px', opacity: 0.9 }}>
                  {getTypeLabel(nameFields.find((f) => f.id === hoveredField)?.type || '')}
                </Typography>
                {nameFields.find((f) => f.id === hoveredField)?.text}
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        <Box mt={4} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            This interactive demo showcases how our system makes Orthodox church records more accessible and manageable.
            Each field is precisely mapped and categorized for easy data entry and retrieval.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default BaptismRecordViewer;
