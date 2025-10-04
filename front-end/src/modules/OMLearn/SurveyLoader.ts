// SurveyLoader.ts - Loads age-appropriate surveys from /data/surveys/

export interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'scale' | 'scenario';
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels: {
      min: string;
      max: string;
    };
  };
  required: boolean;
  reasoning?: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  ageAppropriate?: number[]; // Age range this question is appropriate for
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  gradeGroup: string;
  questions: Question[];
  estimatedTime: number;
  categories: string[];
  version: string;
  lastUpdated: string;
  author?: string;
  tags?: string[];
}

export interface SurveyMetadata {
  id: string;
  title: string;
  description: string;
  gradeGroup: string;
  questionCount: number;
  estimatedTime: number;
  categories: string[];
  version: string;
  lastUpdated: string;
}

class SurveyLoader {
  private surveys: Map<string, Survey> = new Map();
  private metadata: SurveyMetadata[] = [];

  constructor() {
    this.loadSurveys();
  }

  private async loadSurveys(): Promise<void> {
    try {
      // In a real implementation, this would fetch from the server
      // For now, we'll create sample surveys
      const sampleSurveys: Survey[] = [
        this.createK2Survey(),
        this.create35Survey(),
        this.create68Survey(),
        this.create912Survey()
      ];

      sampleSurveys.forEach(survey => {
        this.surveys.set(survey.id, survey);
        this.metadata.push({
          id: survey.id,
          title: survey.title,
          description: survey.description,
          gradeGroup: survey.gradeGroup,
          questionCount: survey.questions.length,
          estimatedTime: survey.estimatedTime,
          categories: survey.categories,
          version: survey.version,
          lastUpdated: survey.lastUpdated
        });
      });
    } catch (error) {
      console.error('Error loading surveys:', error);
      throw new Error('Failed to load surveys');
    }
  }

  private createK2Survey(): Survey {
    return {
      id: 'survey-k-2',
      title: 'Kindergarten - 2nd Grade Reasoning Assessment',
      description: 'Basic reasoning and moral development concepts for young learners',
      gradeGroup: 'k-2',
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      author: 'OMLearn Team',
      estimatedTime: 10,
      categories: ['Moral Reasoning', 'Basic Logic', 'Social Understanding'],
      tags: ['early-childhood', 'basic-reasoning', 'moral-development'],
      questions: [
        {
          id: 'k2-q1',
          text: 'If you found a toy that doesn\'t belong to you, what should you do?',
          type: 'multiple_choice',
          options: [
            'Keep it for yourself',
            'Give it to a teacher',
            'Throw it away',
            'Ask friends if it\'s theirs'
          ],
          required: true,
          category: 'Moral Reasoning',
          difficulty: 'easy',
          ageAppropriate: [5, 6, 7, 8],
          reasoning: 'This assesses basic understanding of honesty and property rights.'
        },
        {
          id: 'k2-q2',
          text: 'How do you feel when someone shares with you?',
          type: 'text',
          required: true,
          category: 'Social Understanding',
          difficulty: 'easy',
          ageAppropriate: [5, 6, 7, 8],
          reasoning: 'This explores emotional understanding and gratitude.'
        },
        {
          id: 'k2-q3',
          text: 'What would you do if you saw someone crying?',
          type: 'multiple_choice',
          options: [
            'Ignore them',
            'Ask what\'s wrong',
            'Tell them to stop crying',
            'Go get a teacher'
          ],
          required: true,
          category: 'Social Understanding',
          difficulty: 'easy',
          ageAppropriate: [5, 6, 7, 8],
          reasoning: 'This assesses empathy and appropriate social responses.'
        }
      ]
    };
  }

  private create35Survey(): Survey {
    return {
      id: 'survey-3-5',
      title: '3rd - 5th Grade Reasoning Assessment',
      description: 'Intermediate reasoning patterns and ethical thinking for elementary students',
      gradeGroup: '3-5',
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      author: 'OMLearn Team',
      estimatedTime: 15,
      categories: ['Moral Reasoning', 'Logical Thinking', 'Ethical Decision Making'],
      tags: ['elementary', 'intermediate-reasoning', 'ethical-thinking'],
      questions: [
        {
          id: '35-q1',
          text: 'If you found a wallet with money in it, what would you do and why?',
          type: 'text',
          required: true,
          category: 'Moral Reasoning',
          difficulty: 'medium',
          ageAppropriate: [8, 9, 10, 11],
          reasoning: 'This question assesses moral reasoning and honesty principles.'
        },
        {
          id: '35-q2',
          text: 'How important is it to tell the truth, even when it might hurt someone\'s feelings?',
          type: 'scale',
          required: true,
          category: 'Ethical Decision Making',
          scale: {
            min: 1,
            max: 5,
            labels: {
              min: 'Not important at all',
              max: 'Very important'
            }
          },
          difficulty: 'medium',
          ageAppropriate: [8, 9, 10, 11],
          reasoning: 'This measures the balance between honesty and compassion.'
        },
        {
          id: '35-q3',
          text: 'What would you do if you saw someone being bullied at school?',
          type: 'multiple_choice',
          options: [
            'Walk away and ignore it',
            'Tell a teacher or adult',
            'Try to stop it yourself',
            'Join in with the bullying',
            'Other (please explain)'
          ],
          required: true,
          category: 'Moral Reasoning',
          difficulty: 'medium',
          ageAppropriate: [8, 9, 10, 11],
          reasoning: 'This assesses moral courage and intervention behavior.'
        }
      ]
    };
  }

  private create68Survey(): Survey {
    return {
      id: 'survey-6-8',
      title: '6th - 8th Grade Reasoning Assessment',
      description: 'Advanced reasoning and complex moral scenarios for middle school students',
      gradeGroup: '6-8',
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      author: 'OMLearn Team',
      estimatedTime: 20,
      categories: ['Moral Reasoning', 'Logical Thinking', 'Ethical Decision Making', 'Critical Analysis'],
      tags: ['middle-school', 'advanced-reasoning', 'complex-scenarios'],
      questions: [
        {
          id: '68-q1',
          text: 'If you could change one rule at school, what would it be and why?',
          type: 'text',
          required: true,
          category: 'Logical Thinking',
          difficulty: 'medium',
          ageAppropriate: [11, 12, 13, 14],
          reasoning: 'This evaluates critical thinking about rules and their purposes.'
        },
        {
          id: '68-q2',
          text: 'How do you decide what is right and wrong?',
          type: 'text',
          required: true,
          category: 'Ethical Decision Making',
          difficulty: 'hard',
          ageAppropriate: [11, 12, 13, 14],
          reasoning: 'This explores the foundation of moral reasoning.'
        },
        {
          id: '68-q3',
          text: 'What would you do if you saw a friend cheating on a test?',
          type: 'text',
          required: true,
          category: 'Moral Reasoning',
          difficulty: 'hard',
          ageAppropriate: [11, 12, 13, 14],
          reasoning: 'This assesses moral reasoning in peer relationships.'
        }
      ]
    };
  }

  private create912Survey(): Survey {
    return {
      id: 'survey-9-12',
      title: '9th - 12th Grade Reasoning Assessment',
      description: 'Sophisticated reasoning models and philosophical concepts for high school students',
      gradeGroup: '9-12',
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      author: 'OMLearn Team',
      estimatedTime: 25,
      categories: ['Moral Reasoning', 'Logical Thinking', 'Ethical Decision Making', 'Philosophical Thinking'],
      tags: ['high-school', 'sophisticated-reasoning', 'philosophical-concepts'],
      questions: [
        {
          id: '912-q1',
          text: 'Is it ever acceptable to lie? If so, when and why?',
          type: 'text',
          required: true,
          category: 'Philosophical Thinking',
          difficulty: 'hard',
          ageAppropriate: [14, 15, 16, 17, 18],
          reasoning: 'This explores complex ethical reasoning and moral philosophy.'
        },
        {
          id: '912-q2',
          text: 'How do you balance individual rights with the common good?',
          type: 'text',
          required: true,
          category: 'Ethical Decision Making',
          difficulty: 'hard',
          ageAppropriate: [14, 15, 16, 17, 18],
          reasoning: 'This assesses understanding of social contract theory and civic responsibility.'
        },
        {
          id: '912-q3',
          text: 'What makes an action morally right or wrong?',
          type: 'text',
          required: true,
          category: 'Philosophical Thinking',
          difficulty: 'hard',
          ageAppropriate: [14, 15, 16, 17, 18],
          reasoning: 'This explores fundamental questions of moral philosophy.'
        }
      ]
    };
  }

  // Public methods
  async getSurvey(gradeGroupId: string): Promise<Survey | null> {
    const surveyId = `survey-${gradeGroupId}`;
    return this.surveys.get(surveyId) || null;
  }

  async getSurveyMetadata(gradeGroupId: string): Promise<SurveyMetadata | null> {
    return this.metadata.find(m => m.gradeGroup === gradeGroupId) || null;
  }

  async getAllSurveys(): Promise<Survey[]> {
    return Array.from(this.surveys.values());
  }

  async getAllMetadata(): Promise<SurveyMetadata[]> {
    return this.metadata;
  }

  async getSurveysByCategory(category: string): Promise<Survey[]> {
    return Array.from(this.surveys.values()).filter(survey => 
      survey.categories.includes(category)
    );
  }

  async getSurveysByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<Survey[]> {
    return Array.from(this.surveys.values()).filter(survey => 
      survey.questions.some(q => q.difficulty === difficulty)
    );
  }

  async searchSurveys(query: string): Promise<Survey[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.surveys.values()).filter(survey => 
      survey.title.toLowerCase().includes(lowerQuery) ||
      survey.description.toLowerCase().includes(lowerQuery) ||
      survey.categories.some(cat => cat.toLowerCase().includes(lowerQuery)) ||
      survey.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Future: Load from server
  async loadFromServer(): Promise<void> {
    try {
      // This would make an API call to load surveys from the server
      // const response = await fetch('/api/omlearn/surveys');
      // const surveys = await response.json();
      // this.surveys = new Map(surveys.map(s => [s.id, s]));
      console.log('Future: Loading surveys from server');
    } catch (error) {
      console.error('Error loading surveys from server:', error);
      throw new Error('Failed to load surveys from server');
    }
  }

  // Future: Save to server
  async saveToServer(survey: Survey): Promise<void> {
    try {
      // This would make an API call to save a survey to the server
      // const response = await fetch('/api/omlearn/surveys', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(survey)
      // });
      console.log('Future: Saving survey to server');
    } catch (error) {
      console.error('Error saving survey to server:', error);
      throw new Error('Failed to save survey to server');
    }
  }
}

// Export singleton instance
export const surveyLoader = new SurveyLoader();
export default surveyLoader; 