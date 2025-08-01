import { BoundComponent } from '../../front-end/src/pages/omb/types';

export interface MarkdownDocOptions {
  includePluginResults?: boolean;
  includeMetadata?: boolean;
  template?: 'default' | 'detailed' | 'simple';
}

export function generateMarkdownDoc(
  component: BoundComponent, 
  pluginResults?: any[], 
  options: MarkdownDocOptions = {}
): string {
  const {
    includePluginResults = true,
    includeMetadata = true,
    template = 'default'
  } = options;

  // Escape markdown special characters
  const escapeMarkdown = (text: string): string => {
    return text
      .replace(/[\\`*_{}\[\]()#+\-!]/g, '\\$&')
      .replace(/\n/g, '\\n');
  };

  // Generate the markdown content
  let markdown = `# ${escapeMarkdown(component.name)}\n\n`;

  // Basic component information
  markdown += `**Type**: ${component.type.charAt(0).toUpperCase() + component.type.slice(1)}  \n`;
  markdown += `**Route**: \`${component.route}\`  \n`;
  markdown += `**DB Table**: \`${component.dbTable}\`  \n`;
  markdown += `**Roles**: \`[${component.roles.join(', ')}]\`  \n`;
  
  if (component.description) {
    markdown += `**Description**: ${escapeMarkdown(component.description)}  \n`;
  }
  
  if (component.size) {
    markdown += `**Size**: ${component.size}  \n`;
  }

  markdown += '\n---\n\n';

  // Add status indicators
  markdown += `✅ Linked from dashboard  \n`;
  markdown += `📡 Binds to \`GET ${component.route}\`\n\n`;

  // Add plugin results if available
  if (includePluginResults && pluginResults && pluginResults.length > 0) {
    markdown += `## 🔍 Analysis Results\n\n`;
    
    pluginResults.forEach((result: any) => {
      markdown += `### ${result.pluginName}\n`;
      markdown += `${result.result}\n\n`;
    });
  }

  // Add metadata if requested
  if (includeMetadata && component.metadata) {
    markdown += `## 📋 Metadata\n\n`;
    markdown += `**Created**: ${component.metadata.createdAt}  \n`;
    markdown += `**Updated**: ${component.metadata.updatedAt}  \n`;
    markdown += `**Created By**: ${component.metadata.createdBy}  \n\n`;
  }

  // Add usage examples
  markdown += `## 💻 Usage\n\n`;
  markdown += `This component is automatically generated and managed by the OMB Visual Editor.\n\n`;
  markdown += `### API Integration\n`;
  markdown += `- **Endpoint**: \`${component.route}\`\n`;
  markdown += `- **Method**: GET\n`;
  markdown += `- **Authentication**: Required\n`;
  markdown += `- **Roles**: ${component.roles.join(', ')}\n\n`;

  markdown += `### Database Schema\n`;
  markdown += `- **Table**: \`${component.dbTable}\`\n`;
  markdown += `- **Access**: ${component.roles.includes('admin') ? 'Admin only' : 'Role-based'}\n\n`;

  return markdown;
}

export async function saveMarkdownDoc(
  component: BoundComponent, 
  pluginResults?: any[], 
  options: MarkdownDocOptions = {}
): Promise<string> {
  const markdown = generateMarkdownDoc(component, pluginResults, options);
  const filename = `${component.id.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
  
  try {
    const response = await fetch('/api/omai/generate-doc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        component,
        pluginResults,
        options,
        filename
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save markdown doc: ${response.status}`);
    }
    
    const result = await response.json();
    return result.docPath;
  } catch (error) {
    console.error('Failed to save markdown doc:', error);
    throw error;
  }
} 