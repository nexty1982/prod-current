import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert
} from '@mui/material';
import DynamicComponentRenderer from './DynamicComponentRenderer';

interface EditorBlock {
  id: string;
  type: string;
  data: any;
}

interface ContentRendererProps {
  content: string | EditorBlock[];
  className?: string;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ content, className }) => {
  // Parse content if it's a JSON string
  let blocks: EditorBlock[] = [];
  
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      blocks = parsed.blocks || [];
    } catch (error) {
      // If parsing fails, treat as plain text
      return (
        <Box className={className}>
          <Typography variant="body1" component="div">
            {content}
          </Typography>
        </Box>
      );
    }
  } else if (Array.isArray(content)) {
    blocks = content;
  }

  const renderBlock = (block: EditorBlock, index: number) => {
    const { type, data } = block;

    switch (type) {
      case 'paragraph':
        return (
          <Typography 
            key={index} 
            variant="body1" 
            component="div"
            sx={{ mb: 2 }}
            dangerouslySetInnerHTML={{ __html: data.text || '' }}
          />
        );

      case 'header':
        const headerLevel = data.level || 2;
        const headerVariant = `h${headerLevel}` as any;
        return (
          <Typography 
            key={index}
            variant={headerVariant}
            sx={{ mb: 2, mt: headerLevel === 1 ? 3 : 2 }}
          >
            {data.text}
          </Typography>
        );

      case 'list':
        const ListComponent = data.style === 'ordered' ? 'ol' : 'ul';
        return (
          <Box key={index} component={ListComponent} sx={{ mb: 2, pl: 2 }}>
            {data.items?.map((item: string, itemIndex: number) => (
              <Box 
                key={itemIndex} 
                component="li" 
                sx={{ mb: 0.5 }}
                dangerouslySetInnerHTML={{ __html: item }}
              />
            ))}
          </Box>
        );

      case 'checklist':
        return (
          <Box key={index} sx={{ mb: 2 }}>
            {data.items?.map((item: any, itemIndex: number) => (
              <Box key={itemIndex} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Checkbox 
                  checked={item.checked} 
                  disabled 
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography 
                  variant="body2"
                  sx={{ 
                    textDecoration: item.checked ? 'line-through' : 'none',
                    color: item.checked ? 'text.secondary' : 'text.primary'
                  }}
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              </Box>
            ))}
          </Box>
        );

      case 'quote':
        return (
          <Box key={index} sx={{ mb: 2 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                borderLeft: 4, 
                borderLeftColor: 'primary.main',
                pl: 2,
                py: 1,
                backgroundColor: 'grey.50',
                fontStyle: 'italic'
              }}
            >
              <Typography variant="body1" sx={{ mb: 1 }}>
                "{data.text}"
              </Typography>
              {data.caption && (
                <Typography variant="caption" color="text.secondary">
                  — {data.caption}
                </Typography>
              )}
            </Paper>
          </Box>
        );

      case 'warning':
        return (
          <Alert 
            key={index} 
            severity="warning" 
            sx={{ mb: 2 }}
            title={data.title}
          >
            {data.message}
          </Alert>
        );

      case 'code':
        return (
          <Box key={index} sx={{ mb: 2 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                backgroundColor: 'grey.100',
                p: 2,
                borderRadius: 1,
                overflow: 'auto'
              }}
            >
              <Typography 
                component="pre"
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  margin: 0
                }}
              >
                {data.code}
              </Typography>
            </Paper>
          </Box>
        );

      case 'image':
        return (
          <Box key={index} sx={{ mb: 2, textAlign: 'center' }}>
            <img 
              src={data.file?.url || data.url} 
              alt={data.caption || ''}
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                borderRadius: '4px'
              }}
            />
            {data.caption && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
              >
                {data.caption}
              </Typography>
            )}
          </Box>
        );

      case 'table':
        return (
          <TableContainer key={index} component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              {data.withHeadings && (
                <TableHead>
                  <TableRow>
                    {data.content?.[0]?.map((cell: string, cellIndex: number) => (
                      <TableCell key={cellIndex} sx={{ fontWeight: 'bold' }}>
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
              )}
              <TableBody>
                {data.content?.slice(data.withHeadings ? 1 : 0)?.map((row: string[], rowIndex: number) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell: string, cellIndex: number) => (
                      <TableCell key={cellIndex}>
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'delimiter':
        return (
          <Box key={index} sx={{ textAlign: 'center', my: 4 }}>
            <Typography variant="h4" color="primary.main">
              * * *
            </Typography>
          </Box>
        );

      case 'embed':
        return (
          <Box key={index} sx={{ mb: 2 }}>
            <Paper elevation={1} sx={{ p: 2 }}>
              {data.service === 'youtube' && (
                <Box sx={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={data.embed}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={data.caption || 'Embedded content'}
                  />
                </Box>
              )}
              {data.caption && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                >
                  {data.caption}
                </Typography>
              )}
            </Paper>
          </Box>
        );

      case 'component':
        return (
          <Box key={index} sx={{ mb: 2 }}>
            <DynamicComponentRenderer 
              shortcode={data.shortcode} 
              props={data.props || {}}
            />
          </Box>
        );

      case 'raw':
        return (
          <Box 
            key={index} 
            sx={{ mb: 2 }}
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        );

      default:
        return (
          <Box key={index} sx={{ mb: 2 }}>
            <Alert severity="info">
              Unsupported block type: {type}
            </Alert>
            <Typography variant="body2" component="pre" sx={{ mt: 1, fontSize: '0.75rem' }}>
              {JSON.stringify(data, null, 2)}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box className={className}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </Box>
  );
};

export default ContentRenderer;
