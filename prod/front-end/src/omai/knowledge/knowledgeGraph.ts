import * as fs from 'fs/promises';
import * as path from 'path';

interface GraphNode {
  id: string;
  type: 'component' | 'script' | 'doc' | 'route' | 'service' | 'model';
  name: string;
  path: string;
  metadata: any;
  embeddings?: number[];
  connections: string[];
  cluster?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'imports' | 'references' | 'depends_on' | 'similar_to' | 'extends';
  strength: number;
  metadata?: any;
}

interface Cluster {
  id: string;
  name: string;
  nodes: string[];
  centroid: number[];
  category: string;
  description: string;
}

interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  clusters: Map<string, Cluster>;
}

/**
 * Knowledge Graph - Cross-references components, scripts, docs, routes, etc.
 */
export class KnowledgeGraphManager {
  private graph: KnowledgeGraph;
  private similarityThreshold: number = 0.7;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      clusters: new Map()
    };
  }

  /**
   * Cross-reference components, scripts, docs, routes, etc.
   */
  async buildGraph(chunks: any[]): Promise<void> {
    try {
      console.log('Building knowledge graph...');
      
      // Create nodes from chunks
      for (const chunk of chunks) {
        await this.addNode(chunk);
      }
      
      // Build connections between nodes
      await this.buildConnections();
      
      // Semantic similarity clustering (implemented)
      await this.performClustering();
      
      // Update graph metadata
      await this.updateGraphMetadata();
      
      console.log(`Knowledge graph built with ${this.graph.nodes.size} nodes and ${this.graph.edges.size} edges`);
    } catch (error) {
      console.error('Failed to build knowledge graph:', error);
    }
  }

  /**
   * Add a node to the graph
   */
  private async addNode(chunk: any): Promise<void> {
    const node: GraphNode = {
      id: chunk.id,
      type: this.determineNodeType(chunk),
      name: chunk.metadata.name,
      path: chunk.metadata.path,
      metadata: chunk.metadata,
      embeddings: chunk.embeddings,
      connections: []
    };
    
    this.graph.nodes.set(chunk.id, node);
  }

  /**
   * Determine node type based on chunk data
   */
  private determineNodeType(chunk: any): GraphNode['type'] {
    const path = chunk.metadata.path.toLowerCase();
    const content = chunk.content.toLowerCase();
    
    if (path.includes('components') || content.includes('react') || content.includes('useState')) {
      return 'component';
    }
    if (path.includes('routes') || content.includes('router.get') || content.includes('router.post')) {
      return 'route';
    }
    if (path.includes('services') || content.includes('service') || content.includes('class')) {
      return 'service';
    }
    if (path.includes('models') || content.includes('CREATE TABLE') || content.includes('database')) {
      return 'model';
    }
    if (path.includes('scripts') || content.includes('function') || content.includes('async')) {
      return 'script';
    }
    if (path.includes('docs') || path.endsWith('.md')) {
      return 'doc';
    }
    
    return 'script'; // Default
  }

  /**
   * Build connections between nodes
   */
  private async buildConnections(): Promise<void> {
    const nodes = Array.from(this.graph.nodes.values());
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        
        // Check for import/reference relationships
        const importConnection = this.findImportConnection(node1, node2);
        if (importConnection) {
          await this.addEdge(node1.id, node2.id, 'imports', importConnection.strength);
        }
        
        // Check for dependency relationships
        const dependencyConnection = this.findDependencyConnection(node1, node2);
        if (dependencyConnection) {
          await this.addEdge(node1.id, node2.id, 'depends_on', dependencyConnection.strength);
        }
        
        // Check for semantic similarity
        const similarityConnection = this.findSimilarityConnection(node1, node2);
        if (similarityConnection) {
          await this.addEdge(node1.id, node2.id, 'similar_to', similarityConnection.strength);
        }
      }
    }
  }

  /**
   * Find import connections between nodes
   */
  private findImportConnection(node1: GraphNode, node2: GraphNode): { strength: number } | null {
    const content1 = node1.metadata.content || '';
    const name2 = node2.name.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Check for import statements
    const importPatterns = [
      new RegExp(`import\\s+.*from\\s+['"][^'"]*${name2}[^'"]*['"]`, 'i'),
      new RegExp(`require\\s*\\(\\s*['"][^'"]*${name2}[^'"]*['"]\\s*\\)`, 'i'),
      new RegExp(`import\\s+.*${name2}`, 'i')
    ];
    
    for (const pattern of importPatterns) {
      if (pattern.test(content1)) {
        return { strength: 0.9 };
      }
    }
    
    return null;
  }

  /**
   * Find dependency connections between nodes
   */
  private findDependencyConnection(node1: GraphNode, node2: GraphNode): { strength: number } | null {
    const content1 = node1.metadata.content || '';
    const name2 = node2.name;
    
    // Check for function calls, class references, etc.
    const dependencyPatterns = [
      new RegExp(`\\b${name2}\\b`, 'i'),
      new RegExp(`${name2}\\.`, 'i'),
      new RegExp(`new\\s+${name2}`, 'i')
    ];
    
    for (const pattern of dependencyPatterns) {
      if (pattern.test(content1)) {
        return { strength: 0.7 };
      }
    }
    
    return null;
  }

  /**
   * Find similarity connections between nodes
   */
  private findSimilarityConnection(node1: GraphNode, node2: GraphNode): { strength: number } | null {
    if (!node1.embeddings || !node2.embeddings) {
      return null;
    }
    
    const similarity = this.calculateCosineSimilarity(node1.embeddings, node2.embeddings);
    
    if (similarity > this.similarityThreshold) {
      return { strength: similarity };
    }
    
    return null;
  }

  /**
   * Add an edge to the graph
   */
  private async addEdge(source: string, target: string, type: GraphEdge['type'], strength: number): Promise<void> {
    const edgeId = `${source}-${target}-${type}`;
    
    const edge: GraphEdge = {
      source,
      target,
      type,
      strength,
      metadata: {
        created: new Date().toISOString()
      }
    };
    
    this.graph.edges.set(edgeId, edge);
    
    // Update node connections
    const sourceNode = this.graph.nodes.get(source);
    const targetNode = this.graph.nodes.get(target);
    
    if (sourceNode && !sourceNode.connections.includes(target)) {
      sourceNode.connections.push(target);
    }
    
    if (targetNode && !targetNode.connections.includes(source)) {
      targetNode.connections.push(source);
    }
  }

  /**
   * Implement vector-based clustering
   */
  private async performClustering(): Promise<void> {
    try {
      console.log('Performing vector-based clustering...');
      
      const nodes = Array.from(this.graph.nodes.values()).filter(node => node.embeddings);
      
      if (nodes.length === 0) {
        console.log('No nodes with embeddings for clustering');
        return;
      }
      
      // Simple k-means clustering
      const clusters = await this.kMeansClustering(nodes, 5); // 5 clusters
      
      // Create cluster objects
      for (const cluster of clusters) {
        const clusterId = `cluster_${cluster.id}`;
        const clusterObj: Cluster = {
          id: clusterId,
          name: this.generateClusterName(cluster.nodes),
          nodes: cluster.nodes.map(n => n.id),
          centroid: cluster.centroid,
          category: this.determineClusterCategory(cluster.nodes),
          description: this.generateClusterDescription(cluster.nodes)
        };
        
        this.graph.clusters.set(clusterId, clusterObj);
        
        // Assign cluster to nodes
        cluster.nodes.forEach(node => {
          node.cluster = clusterId;
        });
      }
      
      console.log(`Created ${clusters.length} clusters`);
    } catch (error) {
      console.error('Clustering failed:', error);
    }
  }

  /**
   * Simple k-means clustering implementation
   */
  private async kMeansClustering(nodes: GraphNode[], k: number): Promise<Array<{ id: number, nodes: GraphNode[], centroid: number[] }>> {
    if (nodes.length === 0) return [];
    
    const dimension = nodes[0].embeddings!.length;
    
    // Initialize centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const centroid = new Array(dimension).fill(0).map(() => Math.random());
      centroids.push(centroid);
    }
    
    const clusters: Array<{ id: number, nodes: GraphNode[], centroid: number[] }> = [];
    
    // Initialize clusters
    for (let i = 0; i < k; i++) {
      clusters.push({ id: i, nodes: [], centroid: centroids[i] });
    }
    
    // Perform clustering iterations
    for (let iteration = 0; iteration < 10; iteration++) {
      // Clear cluster assignments
      clusters.forEach(cluster => cluster.nodes = []);
      
      // Assign nodes to nearest centroid
      for (const node of nodes) {
        let minDistance = Infinity;
        let bestCluster = 0;
        
        for (let i = 0; i < k; i++) {
          const distance = this.calculateEuclideanDistance(node.embeddings!, centroids[i]);
          if (distance < minDistance) {
            minDistance = distance;
            bestCluster = i;
          }
        }
        
        clusters[bestCluster].nodes.push(node);
      }
      
      // Update centroids
      for (let i = 0; i < k; i++) {
        const cluster = clusters[i];
        if (cluster.nodes.length > 0) {
          const newCentroid = new Array(dimension).fill(0);
          
          for (const node of cluster.nodes) {
            for (let j = 0; j < dimension; j++) {
              newCentroid[j] += node.embeddings![j];
            }
          }
          
          for (let j = 0; j < dimension; j++) {
            newCentroid[j] /= cluster.nodes.length;
          }
          
          cluster.centroid = newCentroid;
        }
      }
    }
    
    // Filter out empty clusters
    return clusters.filter(cluster => cluster.nodes.length > 0);
  }

  /**
   * Generate cluster name
   */
  private generateClusterName(nodes: GraphNode[]): string {
    const types = nodes.map(n => n.type);
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    return `${dominantType.charAt(0).toUpperCase() + dominantType.slice(1)} Cluster (${nodes.length} items)`;
  }

  /**
   * Determine cluster category
   */
  private determineClusterCategory(nodes: GraphNode[]): string {
    const types = nodes.map(n => n.type);
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    return dominantType;
  }

  /**
   * Generate cluster description
   */
  private generateClusterDescription(nodes: GraphNode[]): string {
    const types = nodes.map(n => n.type);
    const uniqueTypes = [...new Set(types)];
    
    return `Contains ${nodes.length} items of types: ${uniqueTypes.join(', ')}`;
  }

  /**
   * Update graph metadata
   */
  private async updateGraphMetadata(): Promise<void> {
    const metadata = {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.size,
      totalClusters: this.graph.clusters.size,
      nodeTypes: this.getNodeTypeDistribution(),
      averageConnections: this.calculateAverageConnections(),
      lastUpdated: new Date().toISOString()
    };
    
    // Store metadata
    await this.saveGraphMetadata(metadata);
  }

  /**
   * Get node type distribution
   */
  private getNodeTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const node of this.graph.nodes.values()) {
      distribution[node.type] = (distribution[node.type] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Calculate average connections per node
   */
  private calculateAverageConnections(): number {
    if (this.graph.nodes.size === 0) return 0;
    
    const totalConnections = Array.from(this.graph.nodes.values())
      .reduce((sum, node) => sum + node.connections.length, 0);
    
    return totalConnections / this.graph.nodes.size;
  }

  /**
   * Save graph metadata
   */
  private async saveGraphMetadata(metadata: any): Promise<void> {
    try {
      const logDir = path.join(process.cwd(), 'logs', 'omai');
      await fs.mkdir(logDir, { recursive: true });
      
      const metadataFile = path.join(logDir, 'knowledge-graph-metadata.json');
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to save graph metadata:', error);
    }
  }

  /**
   * Get graph statistics
   */
  getGraphStats(): {
    nodes: number;
    edges: number;
    clusters: number;
    nodeTypes: Record<string, number>;
    averageConnections: number;
  } {
    return {
      nodes: this.graph.nodes.size,
      edges: this.graph.edges.size,
      clusters: this.graph.clusters.size,
      nodeTypes: this.getNodeTypeDistribution(),
      averageConnections: this.calculateAverageConnections()
    };
  }

  /**
   * Find related nodes
   */
  findRelatedNodes(nodeId: string, maxDepth: number = 2): GraphNode[] {
    const related = new Set<string>();
    const queue: Array<{ id: string, depth: number }> = [{ id: nodeId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      
      if (depth > maxDepth || related.has(id)) continue;
      
      related.add(id);
      
      const node = this.graph.nodes.get(id);
      if (node) {
        for (const connectionId of node.connections) {
          queue.push({ id: connectionId, depth: depth + 1 });
        }
      }
    }
    
    return Array.from(related).map(id => this.graph.nodes.get(id)!);
  }

  /**
   * Calculate cosine similarity
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Calculate Euclidean distance
   */
  private calculateEuclideanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return Infinity;
    
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      const diff = vec1[i] - vec2[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }
}

/**
 * Create a knowledge graph manager
 */
export function createKnowledgeGraph(): KnowledgeGraphManager {
  return new KnowledgeGraphManager();
} 