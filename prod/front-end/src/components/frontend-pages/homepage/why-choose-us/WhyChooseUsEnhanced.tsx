import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Cancel,
  ArrowForward,
  FlipCameraAndroid
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const features = [
  {
    title: "OCR That Works for Parish Records",
    others: "✅ Everyone offers OCR",
    ours: "✅ We match or outperform with religious-context optimization",
    icon: <CheckCircle sx={{ color: 'success.main' }} />,
    status: 'match'
  },
  {
    title: "Greek/Russian Translation Built In",
    others: "✅ Google, DeepL, Yandex",
    ours: "✅ We offer native accuracy with our team + API integrations",
    icon: <CheckCircle sx={{ color: 'success.main' }} />,
    status: 'match'
  },
  {
    title: "One-Click OCR + Translation",
    others: "⚠️ Few offer both together",
    ours: "✅ Seamless, automatic pipeline = zero manual steps",
    icon: <Warning sx={{ color: 'warning.main' }} />,
    status: 'better'
  },
  {
    title: "Religious Context Precision",
    others: "❌ No one gets this right",
    ours: "✅ Orthodox-specific models ensure accuracy",
    icon: <Cancel sx={{ color: 'error.main' }} />,
    status: 'unique'
  },
  {
    title: "Parish-Verified Workflows",
    others: "❌ Not supported anywhere",
    ours: "✅ Built-in checks by clergy or admins ensure trust",
    icon: <Cancel sx={{ color: 'error.main' }} />,
    status: 'unique'
  },
  {
    title: "Custom Church Admin Portal",
    others: "❌ Generic or not offered",
    ours: "✅ Fully branded, parish-specific control center",
    icon: <Cancel sx={{ color: 'error.main' }} />,
    status: 'unique'
  },
  {
    title: "Image Pairing with Audit Trail",
    others: "❌ Rarely implemented",
    ours: "✅ Full traceability from scan to record",
    icon: <Cancel sx={{ color: 'error.main' }} />,
    status: 'unique'
  },
  {
    title: "Visual Previews with Field-by-Field Edit",
    others: "❌ Largely missing",
    ours: "✅ Built-in previews with live data mapping",
    icon: <Cancel sx={{ color: 'error.main' }} />,
    status: 'unique'
  },
];

const steps = [
  "🔍 Step 1: Book a Demo or Free Trial",
  "📄 Step 2: Upload Your First Record Scans",
  "🧠 Step 3: Let AI Handle OCR + Translation",
  "👨‍💼 Step 4: Review and Approve With Parish Admin",
  "📊 Step 5: Go Live With Secure Church Portal"
];

const WhyChooseUsEnhanced: React.FC = () => {
  const [flipped, setFlipped] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ bgcolor: 'background.default', py: 8 }}>
      <Container maxWidth="lg">
        <Typography 
          variant="h3" 
          component="h2" 
          textAlign="center" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: 'text.primary',
            mb: 4
          }}
        >
          Why Choose{' '}
          <Typography 
            component="span" 
            variant="h3" 
            sx={{ 
              color: 'primary.main',
              fontWeight: 'bold'
            }}
          >
            OrthodoxMetrics?
          </Typography>
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<FlipCameraAndroid />}
            onClick={() => setFlipped(!flipped)}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              px: 4,
              py: 1.5,
              borderRadius: 2
            }}
          >
            {flipped ? '⬅️ Back to Features' : '➡️ See How It Works'}
          </Button>
        </Box>

        <Box sx={{ perspective: '1000px' }}>
          <motion.div
            style={{
              position: 'relative',
              width: '100%',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.7s',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front Face - Features */}
            <Box
              sx={{
                position: flipped ? 'absolute' : 'relative',
                width: '100%',
                backfaceVisibility: 'hidden',
                opacity: flipped ? 0 : 1,
                transition: 'opacity 0.7s'
              }}
            >
              <Grid container spacing={3}>
                {features.map((item, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                            borderColor: 'primary.main'
                          },
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                            {item.icon}
                            <Typography variant="h6" component="h3" fontWeight="600">
                              {item.title}
                            </Typography>
                          </Stack>
                          
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <Typography component="span" fontWeight="500" color="text.primary">
                                Others:
                              </Typography>{' '}
                              {item.others}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" color="success.main">
                            <Typography component="span" fontWeight="500" color="text.primary">
                              OrthodoxMetrics:
                            </Typography>{' '}
                            {item.ours}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Back Face - Steps */}
            <Box
              sx={{
                position: flipped ? 'relative' : 'absolute',
                width: '100%',
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                opacity: flipped ? 1 : 0,
                transition: 'opacity 0.7s'
              }}
            >
              <Paper
                sx={{
                  bgcolor: 'primary.light',
                  p: 4,
                  borderRadius: 3,
                  boxShadow: 3
                }}
              >
                <Typography 
                  variant="h4" 
                  component="h3" 
                  textAlign="center" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main',
                    mb: 4
                  }}
                >
                  Fast Track to Launch
                </Typography>
                
                <List sx={{ maxWidth: 800, mx: 'auto' }}>
                  {steps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2 }}
                    >
                      <ListItem
                        sx={{
                          bgcolor: 'background.paper',
                          mb: 2,
                          borderRadius: 2,
                          boxShadow: 1,
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateX(4px)'
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <ListItemIcon>
                          <ArrowForward sx={{ color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={step}
                          primaryTypographyProps={{
                            variant: 'h6',
                            fontWeight: 500
                          }}
                        />
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              </Paper>
            </Box>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default WhyChooseUsEnhanced;
