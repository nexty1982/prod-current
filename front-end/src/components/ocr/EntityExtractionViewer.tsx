import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Progress,
  Separator
} from '@/components/ui';
import { 
  Bot, 
  Edit3, 
  Check, 
  X, 
  AlertTriangle, 
  Eye, 
  Zap,
  Calendar,
  User,
  MapPin,
  Crown,
  Heart,
  Skull,
  Church,
  Users,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ExtractedEntity {
  value: string;
  confidence: number;
  source: string;
}

interface ExtractedEntities {
  recordType: string;
  confidence: number;
  fields: Record<string, ExtractedEntity>;
  metadata: {
    language: string;
    extractionDate: string;
    churchId: number;
  };
}

interface EntityExtractionViewerProps {
  jobId: number;
  churchId: number;
  onEntitiesUpdated?: (entities: ExtractedEntities) => void;
}

const EntityExtractionViewer: React.FC<EntityExtractionViewerProps> = ({
  jobId,
  churchId,
  onEntitiesUpdated
}) => {
  const [entities, setEntities] = useState<ExtractedEntities | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [ocrResult, setOcrResult] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personal']));

  // Field categories for better organization
  const fieldCategories = {
    personal: {
      icon: User,
      title: 'Personal Information',
      fields: ['firstName', 'lastName', 'fullName', 'gender', 'age', 'dateOfBirth']
    },
    religious: {
      icon: Church,
      title: 'Religious Information',
      fields: ['clergy', 'church', 'parish', 'diocese', 'baptismDate', 'marriageDate', 'sponsors', 'godparents']
    },
    location: {
      icon: MapPin,
      title: 'Location Information',
      fields: ['place', 'placeOfBirth', 'placeOfMarriage', 'placeOfBurial', 'address']
    },
    family: {
      icon: Users,
      title: 'Family Information',
      fields: ['parents', 'groomFullName', 'brideFullName', 'witnesses', 'groomParents', 'brideParents']
    },
    dates: {
      icon: Calendar,
      title: 'Important Dates',
      fields: ['dateOfBaptism', 'dateOfMarriage', 'dateOfDeath', 'dateOfFuneral']
    },
    funeral: {
      icon: Skull,
      title: 'Funeral Information',
      fields: ['deceasedFullName', 'dateOfDeath', 'dateOfFuneral', 'placeOfBurial', 'ageAtDeath', 'causeOfDeath']
    }
  };

  useEffect(() => {
    fetchJobEntities();
  }, [jobId, churchId]);

  const fetchJobEntities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/entities`);
      
      if (response.ok) {
        const data = await response.json();
        setEntities(data.extractedEntities);
        setOcrResult(data.ocrResult || '');
        setEditedFields(data.extractedEntities?.fields ? 
          Object.fromEntries(
            Object.entries(data.extractedEntities.fields).map(([key, entity]) => 
              [key, (entity as ExtractedEntity).value]
            )
          ) : {}
        );
      } else {
        console.error('Failed to fetch entities');
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerExtraction = async (recordType?: string) => {
    try {
      setExtracting(true);
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordType })
      });

      if (response.ok) {
        const data = await response.json();
        setEntities(data.extractedEntities);
        setEditedFields(data.extractedEntities?.fields ? 
          Object.fromEntries(
            Object.entries(data.extractedEntities.fields).map(([key, entity]) => 
              [key, (entity as ExtractedEntity).value]
            )
          ) : {}
        );
        onEntitiesUpdated?.(data.extractedEntities);
      } else {
        console.error('Failed to extract entities');
      }
    } catch (error) {
      console.error('Error extracting entities:', error);
    } finally {
      setExtracting(false);
    }
  };

  const saveCorrections = async () => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${jobId}/entities`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correctedFields: editedFields,
          reviewNotes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEntities(data.updatedEntities);
        setEditing(false);
        setReviewNotes('');
        onEntitiesUpdated?.(data.updatedEntities);
      } else {
        console.error('Failed to save corrections');
      }
    } catch (error) {
      console.error('Error saving corrections:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const renderFieldsByCategory = () => {
    if (!entities?.fields) return null;

    return Object.entries(fieldCategories).map(([categoryKey, category]) => {
      const categoryFields = Object.entries(entities.fields).filter(([fieldName]) =>
        category.fields.includes(fieldName)
      );

      if (categoryFields.length === 0) return null;

      const isExpanded = expandedSections.has(categoryKey);
      const IconComponent = category.icon;

      return (
        <Card key={categoryKey} className="mb-4">
          <CardHeader 
            className="cursor-pointer pb-3"
            onClick={() => toggleSection(categoryKey)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <IconComponent className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <Badge variant="secondary">
                  {categoryFields.length} field{categoryFields.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryFields.map(([fieldName, entity]) => (
                  <div key={fieldName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getConfidenceColor(entity.confidence)}`} />
                        <span className="text-xs text-gray-500">
                          {getConfidenceText(entity.confidence)} ({(entity.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    
                    {editing ? (
                      <Input
                        value={editedFields[fieldName] || entity.value}
                        onChange={(e) => setEditedFields(prev => ({
                          ...prev,
                          [fieldName]: e.target.value
                        }))}
                        className="w-full"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border min-h-[40px] flex items-center">
                        {entity.value || <span className="text-gray-400 italic">No value extracted</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      );
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading extracted entities...
        </CardContent>
      </Card>
    );
  }

  if (!entities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>AI Entity Extraction</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No entities have been extracted yet.</p>
            <Button onClick={() => triggerExtraction()} disabled={extracting}>
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Extract Entities
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>AI Extracted Entities</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={entities.confidence >= 0.8 ? "default" : entities.confidence >= 0.6 ? "secondary" : "destructive"}
                className="flex items-center space-x-1"
              >
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(entities.confidence)}`} />
                <span>{(entities.confidence * 100).toFixed(1)}% Confidence</span>
              </Badge>
              
              {!editing ? (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => triggerExtraction()}>
                    <Zap className="h-4 w-4 mr-1" />
                    Re-extract
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button size="sm" onClick={saveCorrections}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-sm text-gray-600">Record Type</Label>
              <p className="font-medium capitalize">{entities.recordType}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Language</Label>
              <p className="font-medium">{entities.metadata.language.toUpperCase()}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Extraction Date</Label>
              <p className="font-medium">
                {new Date(entities.metadata.extractionDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <Progress value={entities.confidence * 100} className="h-2" />
          <p className="text-sm text-gray-600 mt-2">
            Overall extraction confidence: {getConfidenceText(entities.confidence)}
          </p>
        </CardContent>
      </Card>

      {/* Confidence Alert */}
      {entities.confidence < 0.6 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This extraction has low confidence. Please review and correct the extracted fields below.
          </AlertDescription>
        </Alert>
      )}

      {/* Extracted Fields by Category */}
      <div className="space-y-4">
        {renderFieldsByCategory()}
      </div>

      {/* Review Notes (when editing) */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add notes about your corrections..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Raw OCR Text Toggle */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowRawText(!showRawText)}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Source OCR Text</span>
            </div>
            {showRawText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {showRawText && (
          <CardContent>
            <div className="bg-gray-50 p-4 rounded border max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">{ocrResult}</pre>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default EntityExtractionViewer;
