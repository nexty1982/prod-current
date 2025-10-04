import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  Chip, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress, 
  Alert, 
  Skeleton,
  Badge,
  Divider,
  Container,
  Fade,
  Zoom
} from '@mui/material';
import { 
  IconNews, 
  IconExternalLink, 
  IconRefresh, 
  IconFilter,
  IconWorld,
  IconClock,
  IconBolt
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

// Interfaces
interface Headline {
  id: number;
  source_name: string;
  title: string;
  summary: string;
  image_url?: string;
  article_url: string;
  language: string;
  pub_date: string;
  isNew: boolean;
  timeAgo: string;
  hasImage: boolean;
}

interface Source {
  name: string;
  label: string;
  articleCount: number;
  latestArticle: string;
  isActive: boolean;
}

interface Language {
  code: string;
  label: string;
  articleCount: number;
}

interface HeadlinesResponse {
  success: boolean;
  headlines: Headline[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    source: string;
    language: string;
  };
  lastUpdated: string;
}

const OrthodoxHeadlines: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Filters
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Auto-refresh timer
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Breadcrumb for navigation
  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Explore' },
    { title: 'Orthodox Headlines' },
  ];

  // Fetch headlines
  const fetchHeadlines = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      }

      const currentOffset = reset ? 0 : offset;
      
      const params = new URLSearchParams({
        source: selectedSource,
        lang: selectedLanguage,
        limit: limit.toString(),
        offset: currentOffset.toString()
      });

      const response = await axios.get<HeadlinesResponse>(`/api/headlines?${params}`);
      
      if (response.data.success) {
        const newHeadlines = response.data.headlines;
        
        if (reset) {
          setHeadlines(newHeadlines);
        } else {
          setHeadlines(prev => [...prev, ...newHeadlines]);
        }
        
        setHasMore(response.data.pagination.hasMore);
        setLastUpdated(response.data.lastUpdated);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching headlines:', err);
      setError(err.response?.data?.message || 'Failed to load Orthodox headlines');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSource, selectedLanguage, limit, offset]);

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const [sourcesRes, languagesRes] = await Promise.all([
        axios.get('/api/headlines/sources'),
        axios.get('/api/headlines/languages')
      ]);

      if (sourcesRes.data.success) {
        setSources(sourcesRes.data.sources);
      }

      if (languagesRes.data.success) {
        setLanguages(languagesRes.data.languages);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    fetchHeadlines(true);
  };

  // Load more articles
  const loadMore = () => {
    setOffset(prev => prev + limit);
  };

  // Handle filter changes
  const handleSourceChange = (newSource: string) => {
    setSelectedSource(newSource);
    setOffset(0);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    setOffset(0);
  };

  // Auto-refresh setup
  useEffect(() => {
    // Set up auto-refresh every 10 minutes
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing Orthodox headlines...');
      handleRefresh();
    }, 10 * 60 * 1000);

    setAutoRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch headlines when filters change
  useEffect(() => {
    fetchHeadlines(true);
  }, [selectedSource, selectedLanguage]);

  // Load more when offset changes
  useEffect(() => {
    if (offset > 0) {
      fetchHeadlines(false);
    }
  }, [offset]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  // Get source badge color
  const getSourceBadgeColor = (sourceName: string) => {
    const colors: { [key: string]: any } = {
      'GOARCH': 'primary',
      'OCA': 'secondary', 
      'ANTIOCH': 'success',
      'SERBIAN': 'warning',
      'RUSSIAN': 'error',
      'ROMANIAN': 'info'
    };
    return colors[sourceName] || 'default';
  };

  // Render filter bar
  const renderFilterBar = () => (
    <Card sx={{ mb: 3, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <IconFilter size={20} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Filter Headlines
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Source</InputLabel>
          <Select
            value={selectedSource}
            onChange={(e) => handleSourceChange(e.target.value)}
            label="Source"
          >
            <MenuItem value="all">All Sources</MenuItem>
            {sources.map((source) => (
              <MenuItem key={source.name} value={source.name}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {source.label}
                  {source.isActive && (
                    <Badge color="success" variant="dot" />
                  )}
                  <Chip size="small" label={source.articleCount} />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            label="Language"
          >
            <MenuItem value="all">All Languages</MenuItem>
            {languages.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconWorld size={16} />
                  {lang.label}
                  <Chip size="small" label={lang.articleCount} />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Refresh
        </Button>
      </Box>
      
      {lastUpdated && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconClock size={14} />
          <Typography variant="caption" color="text.secondary">
            Last updated: {format(new Date(lastUpdated), 'MMM dd, yyyy HH:mm')}
          </Typography>
        </Box>
      )}
    </Card>
  );

  // Render news card
  const renderNewsCard = (headline: Headline, index: number) => (
    <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }} key={headline.id}>
      <Grid item xs={12} sm={6} lg={4}>
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4
            }
          }}
        >
          {headline.hasImage && (
            <CardMedia
              component="img"
              height="200"
              image={headline.image_url}
              alt={headline.title}
              sx={{ objectFit: 'cover' }}
            />
          )}
          
          <CardContent sx={{ flexGrow: 1, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={sources.find(s => s.name === headline.source_name)?.label || headline.source_name}
                color={getSourceBadgeColor(headline.source_name)}
                size="small"
              />
              {headline.isNew && (
                <Chip
                  label="New!"
                  color="success"
                  size="small"
                  icon={<IconBolt size={12} />}
                />
              )}
            </Box>

            <Typography variant="h6" sx={{ mb: 1, lineHeight: 1.3 }}>
              {headline.title}
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {headline.summary}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
              <Typography variant="caption" color="text.secondary">
                {headline.timeAgo}
              </Typography>
              <Button
                size="small"
                variant="contained"
                endIcon={<IconExternalLink size={14} />}
                href={headline.article_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read More
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Zoom>
  );

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid item xs={12} sm={6} lg={4} key={index}>
          <Card>
            <Skeleton variant="rectangular" height={200} />
            <CardContent>
              <Skeleton variant="text" height={32} />
              <Skeleton variant="text" height={20} width="60%" />
              <Box sx={{ mt: 2 }}>
                <Skeleton variant="text" height={16} />
                <Skeleton variant="text" height={16} />
                <Skeleton variant="text" height={16} width="80%" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Skeleton variant="text" height={16} width="30%" />
                <Skeleton variant="rectangular" height={32} width={100} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Render empty state
  const renderEmptyState = () => (
    <Fade in={true}>
      <Card sx={{ textAlign: 'center', py: 8 }}>
        <CardContent>
          <IconNews size={64} color="gray" />
          <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
            No Orthodox Headlines Available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There are no headlines matching your current filters. Try adjusting your source or language selection.
          </Typography>
          <Button variant="contained" onClick={handleRefresh} startIcon={<IconRefresh />}>
            Refresh Headlines
          </Button>
        </CardContent>
      </Card>
    </Fade>
  );

  if (!user) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Please log in to access Orthodox Headlines.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconNews size={36} />
          Orthodox Headlines
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Stay updated with the latest news from Orthodox communities worldwide
        </Typography>
      </Box>

      {/* Filter Bar */}
      {renderFilterBar()}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        renderLoadingSkeleton()
      ) : headlines.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <Grid container spacing={3}>
            {headlines.map((headline, index) => renderNewsCard(headline, index))}
          </Grid>

          {/* Load More Button */}
          {hasMore && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Load More Headlines'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default OrthodoxHeadlines; 