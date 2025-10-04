import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  Divider,
  Chip
} from '@mui/material';
import { IconBuildingChurch, IconCross, IconHeart, IconCalendar } from '@tabler/icons-react';
import OrthodoxThemeToggle from '@/shared/OrthodoxThemeToggle';
import PageContainer from '@/container/PageContainer';

const OrthodoxThemeDemo: React.FC = () => {
  return (
    <PageContainer title="Orthodox Theme Demo" description="Demonstration of Orthodox Christian styling and theme toggles">
      <Box sx={{ p: 3 }}>
        {/* Header with Theme Controls */}
        <Card className="orthodox-card" sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography 
                  variant="h4" 
                  className="certificate-title medium"
                  sx={{ mb: 1 }}
                >
                  ☦ Orthodox Theme System ☦
                </Typography>
                <Typography variant="body1" className="ocr-preview-text">
                  Experience authentic Orthodox Christian typography and theming
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" className="record-header small">
                  Theme Controls:
                </Typography>
                <OrthodoxThemeToggle variant="icon" />
                <OrthodoxThemeToggle variant="switch" showText />
                <OrthodoxThemeToggle variant="menu" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Typography Showcase */}
          <Grid item xs={12} md={6}>
            <Card className="orthodox-card">
              <CardContent>
                <Typography variant="h6" className="record-header medium" gutterBottom>
                  Orthodox Typography
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" className="orthodox-badge confidence-high" component="span">
                      Certificate Title
                    </Typography>
                    <Typography className="certificate-title large" sx={{ mt: 1 }}>
                      Certificate of Baptism
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" className="orthodox-badge confidence-medium" component="span">
                      Record Header
                    </Typography>
                    <Typography className="record-header medium" sx={{ mt: 1 }}>
                      Parish Registry Information
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" className="orthodox-badge confidence-low" component="span">
                      Body Text
                    </Typography>
                    <Typography className="record-body" sx={{ mt: 1 }}>
                      This is to certify that the sacrament of Holy Baptism was administered according to the rites of the Orthodox Church.
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" className="orthodox-badge" component="span">
                      OCR Preview
                    </Typography>
                    <Typography className="ocr-preview-text large" sx={{ mt: 1 }}>
                      Extracted text from church records with proper Orthodox formatting and multilingual support.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Language Support */}
          <Grid item xs={12} md={6}>
            <Card className="orthodox-card">
              <CardContent>
                <Typography variant="h6" className="record-header medium" gutterBottom>
                  Multilingual Support
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Chip label="English" size="small" className="orthodox-badge" />
                    <Typography className="record-lang-en" sx={{ mt: 1 }}>
                      Holy Orthodox Church Records
                    </Typography>
                  </Box>

                  <Box>
                    <Chip label="Greek" size="small" className="orthodox-badge confidence-high" />
                    <Typography className="record-lang-gr" sx={{ mt: 1 }}>
                      Ἱερὰ Ὀρθόδοξος Ἐκκλησία
                    </Typography>
                  </Box>

                  <Box>
                    <Chip label="Cyrillic" size="small" className="orthodox-badge confidence-medium" />
                    <Typography className="record-lang-ru" sx={{ mt: 1 }}>
                      Православная Церковь
                    </Typography>
                  </Box>

                  <Box>
                    <Chip label="Church Slavonic" size="small" className="orthodox-badge confidence-low" />
                    <Typography className="record-lang-ru" sx={{ mt: 1, fontFamily: 'var(--font-orthodox-slavic)' }}>
                      Свѧтаѧ Правослѧвнаѧ Црькы
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Color Palette */}
          <Grid item xs={12} md={6}>
            <Card className="orthodox-card">
              <CardContent>
                <Typography variant="h6" className="record-header medium" gutterBottom>
                  Orthodox Color Palette
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        backgroundColor: 'var(--orthodox-maroon)',
                        color: 'var(--orthodox-cream)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'var(--font-orthodox-header)' }}>
                        Orthodox Maroon
                      </Typography>
                      <Typography variant="caption">
                        #8a0303
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        backgroundColor: 'var(--orthodox-gold)',
                        color: 'var(--orthodox-maroon)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'var(--font-orthodox-header)' }}>
                        Orthodox Gold
                      </Typography>
                      <Typography variant="caption">
                        #C8A951
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        backgroundColor: 'var(--orthodox-deep-green)',
                        color: 'var(--orthodox-cream)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'var(--font-orthodox-header)' }}>
                        Deep Green
                      </Typography>
                      <Typography variant="caption">
                        #1d442d
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        backgroundColor: 'var(--orthodox-cream)',
                        color: 'var(--orthodox-maroon)',
                        textAlign: 'center',
                        border: '1px solid var(--orthodox-border-light)'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'var(--font-orthodox-header)' }}>
                        Orthodox Cream
                      </Typography>
                      <Typography variant="caption">
                        #faf7f0
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Buttons & Components */}
          <Grid item xs={12} md={6}>
            <Card className="orthodox-card">
              <CardContent>
                <Typography variant="h6" className="record-header medium" gutterBottom>
                  Orthodox Components
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Orthodox Buttons
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <button className="orthodox-btn-primary">Primary</button>
                      <button className="orthodox-btn-secondary">Secondary</button>
                      <button className="orthodox-btn-gold">Gold</button>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Badges & Status
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <span className="orthodox-badge confidence-high">High Confidence</span>
                      <span className="orthodox-badge confidence-medium">Medium</span>
                      <span className="orthodox-badge confidence-low">Low</span>
                      <span className="orthodox-badge required">Required</span>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Record Icons
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Box sx={{ textAlign: 'center' }}>
                        <IconBuildingChurch size={24} color="var(--orthodox-maroon)" />
                        <Typography variant="caption" display="block">Church</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <IconHeart size={24} color="var(--orthodox-gold)" />
                        <Typography variant="caption" display="block">Baptism</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <IconCalendar size={24} color="var(--orthodox-deep-green)" />
                        <Typography variant="caption" display="block">Marriage</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <IconCross size={24} color="var(--orthodox-maroon)" />
                        <Typography variant="caption" display="block">Funeral</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Sacred Elements Demo */}
          <Grid item xs={12}>
            <Card className="orthodox-card orthodox-sacred">
              <CardContent>
                <Typography variant="h6" className="record-header medium" gutterBottom>
                  Sacred Elements with Animation
                </Typography>
                
                <Paper 
                  className="orthodox-modal"
                  sx={{ 
                    p: 3,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, var(--orthodox-bg-light), var(--orthodox-card-light))'
                  }}
                >
                  <Typography className="certificate-title large" sx={{ mb: 2 }}>
                    ☦ Certificate of Sacred Record ☦
                  </Typography>
                  <Typography className="record-body" sx={{ mb: 2 }}>
                    This sacred document bears witness to the holy sacraments administered 
                    within the Orthodox Church according to apostolic tradition.
                  </Typography>
                  <Typography className="ocr-preview-text" sx={{ fontStyle: 'italic' }}>
                    "And he said unto them, Go ye into all the world, and preach the gospel to every creature." - Mark 16:15
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Font Stack Information */}
        <Card className="orthodox-card" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" className="record-header medium" gutterBottom>
              Global Font Stack Variables
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Primary Font Variables:</Typography>
                <Stack spacing={1} sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  <Typography>--font-primary: EB Garamond</Typography>
                  <Typography>--font-headings: Forum</Typography>
                  <Typography>--font-decorative: Cinzel Decorative</Typography>
                  <Typography>--font-body: EB Garamond</Typography>
                  <Typography>--font-special: Old Standard TT</Typography>
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Language-Specific Fonts:</Typography>
                <Stack spacing={1} sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  <Typography>--font-orthodox-greek: Noto Serif Greek</Typography>
                  <Typography>--font-orthodox-cyrillic: Noto Serif Cyrillic</Typography>
                  <Typography>--font-orthodox-slavic: Old Standard TT</Typography>
                  <Typography>--font-orthodox-serif: EB Garamond</Typography>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default OrthodoxThemeDemo;
