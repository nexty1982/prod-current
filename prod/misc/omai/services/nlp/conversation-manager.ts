import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface Conversation {
  id: string;
  title: string;
  participants: string[];
  messages: ConversationMessage[];
  context: ConversationContext;
  status: 'active' | 'paused' | 'ended';
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  type: 'text' | 'command' | 'system' | 'action';
  timestamp: string;
  metadata?: {
    sentiment?: any;
    intent?: any;
    entities?: any[];
    confidence?: number;
  };
}

export interface ConversationContext {
  topic: string;
  goals: string[];
  constraints: string[];
  preferences: { [key: string]: any };
  history: string[];
  currentState: any;
  variables: { [key: string]: any };
}

export interface DialogueFlow {
  id: string;
  name: string;
  nodes: DialogueNode[];
  edges: DialogueEdge[];
  entryPoint: string;
  variables: { [key: string]: any };
}

export interface DialogueNode {
  id: string;
  type: 'message' | 'condition' | 'action' | 'input' | 'end';
  content: string;
  conditions?: string[];
  actions?: string[];
  nextNodes: string[];
  metadata?: any;
}

export interface DialogueEdge {
  id: string;
  fromNode: string;
  toNode: string;
  condition?: string;
  weight: number;
}

export interface ConversationManager {
  createConversation(title: string, participants: string[]): Promise<Conversation>;
  getConversation(conversationId: string): Promise<Conversation | null>;
  addMessage(conversationId: string, sender: string, content: string, type?: string): Promise<ConversationMessage>;
  updateContext(conversationId: string, updates: Partial<ConversationContext>): Promise<void>;
  generateResponse(conversationId: string, userInput: string): Promise<string>;
  createDialogueFlow(name: string, nodes: DialogueNode[], edges: DialogueEdge[]): Promise<DialogueFlow>;
  executeDialogueFlow(flowId: string, context: any): Promise<string[]>;
  getConversationHistory(conversationId: string, limit?: number): Promise<ConversationMessage[]>;
  endConversation(conversationId: string): Promise<void>;
  listConversations(userId?: string): Promise<Conversation[]>;
}

export class OMIConversationManager implements ConversationManager {
  private dataDir: string;
  private conversationsFile: string;
  private flowsFile: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'om-ai', 'nlp');
    this.conversationsFile = path.join(this.dataDir, 'conversations.json');
    this.flowsFile = path.join(this.dataDir, 'dialogue-flows.json');
    this.ensureDataDir();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating NLP data directory:', error);
    }
  }

  async createConversation(title: string, participants: string[]): Promise<Conversation> {
    try {
      const conversation: Conversation = {
        id: uuidv4(),
        title,
        participants,
        messages: [],
        context: {
          topic: '',
          goals: [],
          constraints: [],
          preferences: {},
          history: [],
          currentState: {},
          variables: {}
        },
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const conversations = await this.getConversations();
      conversations.push(conversation);
      await fs.writeFile(this.conversationsFile, JSON.stringify(conversations, null, 2));

      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversations = await this.getConversations();
      return conversations.find(c => c.id === conversationId) || null;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  async addMessage(conversationId: string, sender: string, content: string, type: string = 'text'): Promise<ConversationMessage> {
    try {
      const conversations = await this.getConversations();
      const conversationIndex = conversations.findIndex(c => c.id === conversationId);
      
      if (conversationIndex === -1) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const message: ConversationMessage = {
        id: uuidv4(),
        conversationId,
        sender,
        content,
        type: type as 'text' | 'command' | 'system' | 'action',
        timestamp: new Date().toISOString()
      };

      conversations[conversationIndex].messages.push(message);
      conversations[conversationIndex].updatedAt = new Date().toISOString();

      await fs.writeFile(this.conversationsFile, JSON.stringify(conversations, null, 2));

      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async updateContext(conversationId: string, updates: Partial<ConversationContext>): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const conversationIndex = conversations.findIndex(c => c.id === conversationId);
      
      if (conversationIndex === -1) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      conversations[conversationIndex].context = {
        ...conversations[conversationIndex].context,
        ...updates
      };
      conversations[conversationIndex].updatedAt = new Date().toISOString();

      await fs.writeFile(this.conversationsFile, JSON.stringify(conversations, null, 2));
    } catch (error) {
      console.error('Error updating context:', error);
      throw error;
    }
  }

  async generateResponse(conversationId: string, userInput: string): Promise<string> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Add user message
      await this.addMessage(conversationId, 'user', userInput);

      // Generate AI response based on context and history
      const response = this.generateAIResponse(conversation, userInput);

      // Add AI response
      await this.addMessage(conversationId, 'omai', response);

      return response;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async createDialogueFlow(name: string, nodes: DialogueNode[], edges: DialogueEdge[]): Promise<DialogueFlow> {
    try {
      const flow: DialogueFlow = {
        id: uuidv4(),
        name,
        nodes,
        edges,
        entryPoint: nodes[0]?.id || '',
        variables: {}
      };

      const flows = await this.getDialogueFlows();
      flows.push(flow);
      await fs.writeFile(this.flowsFile, JSON.stringify(flows, null, 2));

      return flow;
    } catch (error) {
      console.error('Error creating dialogue flow:', error);
      throw error;
    }
  }

  async executeDialogueFlow(flowId: string, context: any): Promise<string[]> {
    try {
      const flows = await this.getDialogueFlows();
      const flow = flows.find(f => f.id === flowId);
      
      if (!flow) {
        throw new Error(`Dialogue flow ${flowId} not found`);
      }

      const responses: string[] = [];
      let currentNode = flow.nodes.find(n => n.id === flow.entryPoint);
      
      while (currentNode) {
        if (currentNode.type === 'message') {
          responses.push(currentNode.content);
        } else if (currentNode.type === 'action') {
          // Execute action
          if (currentNode.actions) {
            for (const action of currentNode.actions) {
              // Execute action logic here
              console.log(`Executing action: ${action}`);
            }
          }
        }

        // Find next node
        const nextEdge = flow.edges.find(e => e.fromNode === currentNode!.id);
        if (nextEdge) {
          currentNode = flow.nodes.find(n => n.id === nextEdge.toNode);
        } else {
          currentNode = null;
        }
      }

      return responses;
    } catch (error) {
      console.error('Error executing dialogue flow:', error);
      throw error;
    }
  }

  async getConversationHistory(conversationId: string, limit?: number): Promise<ConversationMessage[]> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        return [];
      }

      let messages = conversation.messages;
      if (limit) {
        messages = messages.slice(-limit);
      }

      return messages;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async endConversation(conversationId: string): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const conversationIndex = conversations.findIndex(c => c.id === conversationId);
      
      if (conversationIndex !== -1) {
        conversations[conversationIndex].status = 'ended';
        conversations[conversationIndex].updatedAt = new Date().toISOString();
        await fs.writeFile(this.conversationsFile, JSON.stringify(conversations, null, 2));
      }
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  async listConversations(userId?: string): Promise<Conversation[]> {
    try {
      const conversations = await this.getConversations();
      
      if (userId) {
        return conversations.filter(c => c.participants.includes(userId));
      }
      
      return conversations;
    } catch (error) {
      console.error('Error listing conversations:', error);
      return [];
    }
  }

  private generateAIResponse(conversation: Conversation, userInput: string): string {
    // Basic response generation based on conversation context and history
    const recentMessages = conversation.messages.slice(-5);
    const context = conversation.context;
    
    // Simple response logic based on input keywords
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return "Hello! How can I assist you today?";
    } else if (lowerInput.includes('help')) {
      return "I'm here to help! What would you like to know or do?";
    } else if (lowerInput.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    } else if (lowerInput.includes('goodbye') || lowerInput.includes('bye')) {
      return "Goodbye! Feel free to reach out if you need anything else.";
    } else if (lowerInput.includes('how are you')) {
      return "I'm functioning well and ready to assist you! How can I help?";
    } else if (lowerInput.includes('what can you do')) {
      return "I can help with analysis, answer questions, generate content, and assist with various tasks. What would you like to work on?";
    } else {
      // Default contextual response
      return "I understand. Let me help you with that. Could you provide more details about what you'd like to accomplish?";
    }
  }

  private async getConversations(): Promise<Conversation[]> {
    try {
      const data = await fs.readFile(this.conversationsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async getDialogueFlows(): Promise<DialogueFlow[]> {
    try {
      const data = await fs.readFile(this.flowsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
}

export const conversationManager = new OMIConversationManager(); 