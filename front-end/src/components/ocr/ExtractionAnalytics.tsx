import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription
} from '@/components/ui';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Bot, 
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Users,
  FileText,
  Zap
} from 'lucide-react';

interface ExtractionStats {
  timeframe: string;
  overall: {
    totalJobs: number;
    jobsWithEntities: number;
    extractionRate: string;
    avgEntityConfidence: string;
    jobsNeedingReview: number;
    jobsReviewed: number;
    reviewRate: string;
  };
  byRecordType: Array<{
    record_type: string;
    total_jobs: number;
    jobs_with_entities: number;
    avg_entity_confidence: number;
    jobs_needing_review: number;
    jobs_reviewed: number;
    last_extraction: string;
  }>;
  corrections: {
    totalCorrections: number;
    jobsCorrected: number;
    lastCorrection: string | null;
  };
}

interface JobNeedingReview {
  id: number;
  filename: string;
  originalFilename: string;
  recordType: string;
  language: string;
  confidenceScore: number;
  entityConfidence: number;
  createdAt: string;
  hasEntities: boolean;
}

interface ExtractionAnalyticsProps {
  churchId: number;
}

const ExtractionAnalytics: React.FC<ExtractionAnalyticsProps> = ({ churchId }) => {
  const [stats, setStats] = useState<ExtractionStats | null>(null);
  const [jobsNeedingReview, setJobsNeedingReview] = useState<JobNeedingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchJobsNeedingReview();
  }, [churchId, timeframe]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/extraction/stats?timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching extraction stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobsNeedingReview = async () => {
    try {
      setReviewLoading(true);
      const response = await fetch(`/api/church/${churchId}/ocr/extraction/review?page=${reviewPage}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setJobsNeedingReview(data.jobs);
      }
    } catch (error) {
      console.error('Error fetching jobs needing review:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRecordTypeIcon = (recordType: string) => {
    switch (recordType) {
      case 'baptism': return '💧';
      case 'marriage': return '💒';
      case 'funeral': return '⚰️';
      case 'death': return '💀';
      default: return '📄';
    }
  };

  const formatNumber = (num: number | string) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return isNaN(n) ? '0' : n.toLocaleString();
  };

  const exportStats = () => {
    if (!stats) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Jobs', stats.overall.totalJobs],
      ['Jobs with Entities', stats.overall.jobsWithEntities],
      ['Extraction Rate', stats.overall.extractionRate + '%'],
      ['Average Confidence', stats.overall.avgEntityConfidence + '%'],
      ['Jobs Needing Review', stats.overall.jobsNeedingReview],
      ['Jobs Reviewed', stats.overall.jobsReviewed],
      ['Review Rate', stats.overall.reviewRate + '%'],
      ['Total Corrections', stats.corrections.totalCorrections],
      ['Jobs Corrected', stats.corrections.jobsCorrected],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-stats-${timeframe}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading extraction analytics...
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load extraction statistics. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Bot className="h-6 w-6 text-blue-600" />
            <span>Entity Extraction Analytics</span>
          </h2>
          <p className="text-gray-600 mt-1">
            AI performance metrics and extraction insights
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={exportStats}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold">{formatNumber(stats.overall.totalJobs)}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Extraction Rate</p>
                <p className="text-2xl font-bold">{stats.overall.extractionRate}%</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={parseFloat(stats.overall.extractionRate)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Confidence</p>
                <p className="text-2xl font-bold">{stats.overall.avgEntityConfidence}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={parseFloat(stats.overall.avgEntityConfidence)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Need Review</p>
                <p className="text-2xl font-bold">{formatNumber(stats.overall.jobsNeedingReview)}</p>
              </div>
              <Eye className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-type">By Record Type</TabsTrigger>
          <TabsTrigger value="review">Needs Review</TabsTrigger>
          <TabsTrigger value="corrections">Corrections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extraction Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Extraction Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Jobs with Entities</span>
                    <span className="font-medium">
                      {formatNumber(stats.overall.jobsWithEntities)} / {formatNumber(stats.overall.totalJobs)}
                    </span>
                  </div>
                  <Progress value={parseFloat(stats.overall.extractionRate)} />
                  
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-600">Jobs Reviewed</span>
                    <span className="font-medium">
                      {formatNumber(stats.overall.jobsReviewed)} / {formatNumber(stats.overall.jobsNeedingReview)}
                    </span>
                  </div>
                  <Progress value={parseFloat(stats.overall.reviewRate)} />
                </div>
              </CardContent>
            </Card>

            {/* Correction Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Learning & Corrections</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Corrections</span>
                    <Badge variant="outline">{formatNumber(stats.corrections.totalCorrections)}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Jobs Corrected</span>
                    <Badge variant="outline">{formatNumber(stats.corrections.jobsCorrected)}</Badge>
                  </div>
                  
                  {stats.corrections.lastCorrection && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Correction</span>
                      <span className="text-sm">
                        {new Date(stats.corrections.lastCorrection).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-type">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Record Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record Type</TableHead>
                    <TableHead>Total Jobs</TableHead>
                    <TableHead>With Entities</TableHead>
                    <TableHead>Avg. Confidence</TableHead>
                    <TableHead>Need Review</TableHead>
                    <TableHead>Last Extraction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.byRecordType.map((record) => (
                    <TableRow key={record.record_type}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getRecordTypeIcon(record.record_type)}</span>
                          <span className="capitalize">{record.record_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatNumber(record.total_jobs)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{formatNumber(record.jobs_with_entities)}</span>
                          <Badge variant="outline" className="text-xs">
                            {record.total_jobs > 0 ? 
                              ((record.jobs_with_entities / record.total_jobs) * 100).toFixed(0) : 0}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getConfidenceColor((record.avg_entity_confidence || 0) * 100)}
                        >
                          {record.avg_entity_confidence ? 
                            (record.avg_entity_confidence * 100).toFixed(0) : 0}%
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(record.jobs_needing_review)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.last_extraction ? 
                          new Date(record.last_extraction).toLocaleDateString() : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Jobs Needing Review</span>
                </div>
                <Badge variant="secondary">
                  {formatNumber(stats.overall.jobsNeedingReview)} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobsNeedingReview.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>OCR Confidence</TableHead>
                      <TableHead>Entity Confidence</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsNeedingReview.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{job.originalFilename}</p>
                            <p className="text-sm text-gray-500">ID: {job.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{getRecordTypeIcon(job.recordType)}</span>
                            <span className="capitalize">{job.recordType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getConfidenceColor((job.confidenceScore || 0) * 100)}
                          >
                            {job.confidenceScore ? (job.confidenceScore * 100).toFixed(0) : 0}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getConfidenceColor((job.entityConfidence || 0) * 100)}
                          >
                            {job.entityConfidence ? (job.entityConfidence * 100).toFixed(0) : 0}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No jobs currently need review!</p>
                  <p className="text-sm text-gray-500 mt-2">
                    All extractions have sufficient confidence scores.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corrections">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Learning & Improvement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatNumber(stats.corrections.totalCorrections)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Corrections</div>
                  <p className="text-xs text-gray-500 mt-2">
                    User feedback instances
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatNumber(stats.corrections.jobsCorrected)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Jobs Corrected</div>
                  <p className="text-xs text-gray-500 mt-2">
                    Unique jobs improved
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {stats.corrections.jobsCorrected > 0 ? 
                      Math.round(stats.corrections.totalCorrections / stats.corrections.jobsCorrected) : 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avg. per Job</div>
                  <p className="text-xs text-gray-500 mt-2">
                    Corrections per job
                  </p>
                </div>
              </div>
              
              {stats.corrections.totalCorrections > 0 && (
                <Alert className="mt-6">
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    The AI is learning from user corrections to improve future extractions. 
                    Thank you for helping train the system!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExtractionAnalytics;
