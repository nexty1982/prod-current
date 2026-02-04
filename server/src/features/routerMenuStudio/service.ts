import { RouterMenuStudioApiError } from './types';
import { RoutesRepo, MenusRepo } from './repo';
import type { RouteRecord, MenuNode, RoutesListQuery, MenusListQuery, ReorderMenusInput } from './types';

export class RoutesService {
  constructor(private readonly repo = new RoutesRepo()) {}

  async list(query: RoutesListQuery = {}): Promise<RouteRecord[]> {
    return this.repo.list(query);
  }

  async create(opts: Partial<RouteRecord>, updated_by?: string): Promise<RouteRecord> {
    return this.repo.create(opts, updated_by);
  }

  async update(id: number, opts: Partial<RouteRecord>, updated_by?: string): Promise<RouteRecord | null> {
    return this.repo.update(id, opts, updated_by);
  }

  async delete(id: number, hard = false): Promise<boolean> {
    return this.repo.delete(id, hard);
  }

  async getById(id: number): Promise<RouteRecord | null> {
    const routes = await this.repo.list({ limit: '1', offset: '0' });
    const route = await this.repo.list();
    
    // Find by ID from the list
    const allRoutes = await this.repo.list({ limit: '1000', offset: '0' });
    return allRoutes.find(r => r.id === id) || null;
  }
}

export class MenusService {
  constructor(private readonly repo = new MenusRepo()) {}

  async tree(): Promise<MenuNode[]> {
    return this.repo.tree();
  }

  async list(query: MenusListQuery = {}): Promise<MenuNode[]> {
    return this.repo.list(query);
  }

  async create(opts: Partial<MenuNode>, updated_by?: string): Promise<MenuNode> {
    return this.repo.create(opts, updated_by);
  }

  async update(id: number, opts: Partial<MenuNode>, updated_by?: string): Promise<MenuNode | null> {
    return this.repo.update(id, opts, updated_by);
  }

  async delete(id: number, hard = false): Promise<boolean> {
    // Check if menu has children
    if (!hard) {
      const children = await this.repo.list();
      const hasActiveChildren = children.some(child => 
        child.parent_id === id && child.is_active
      );
      
      if (hasActiveChildren) {
        throw new RouterMenuStudioApiError(
          'Cannot deactivate menu with active children', 
          400, 
          'has_children'
        );
      }
    }
    
    return this.repo.delete(id, hard);
  }

  async reorder(input: ReorderMenusInput): Promise<void> {
    // Validate IDs exist
    const allMenus = await this.repo.list();
    const validIds = new Set(allMenus.map(m => m.id));
    
    for (const item of input.items) {
      if (!validIds.has(item.id)) {
        throw new RouterMenuStudioApiError(`Menu ID ${item.id} not found`, 400);
      }
    }

    // Check for parent cycles
    if (this.hasCycle(input.items)) {
      throw new RouterMenuStudioApiError('Parent relationships create a cycle', 400);
    }

    // Ensure order_index density
    await this.ensureDenseOrdering(input.items);

    return this.repo.reorder(input);
  }

  private hasCycle(items: Array<{id: number; parent_id?: number}>): boolean {
    const visited = new Set<number>();
    const visiting = new Set<number>();

    const visit = (id: number): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;

      visiting.add(id);
      const item = items.find(i => i.id === id);
      if (item?.parent_id && visit(item.parent_id)) {
        return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    for (const item of items) {
      if (visit(item.id)) return true;
    }
    return false;
  }

  private async ensureDenseOrdering(items: Array<{id: number; parent_id?: number; order_index: number}>): Promise<void> {
    // Group by parent_id and ensure order_index starts from 0 and is sequential
    const byParent = new Map<number | undefined, Array<{id: number; order_index: number}>>();

    items.forEach(item => {
      const parentId = item.parent_id || undefined;
      if (!byParent.has(parentId)) {
        byParent.set(parentId, []);
      }
      byParent.get(parentId)!.push(item);
    });

    for (const [parentId, children] of byParent.entries()) {
      children.sort((a, b) => a.order_index - b.order_index);
      
      for (let i = 0; i < children.length; i++) {
        children[i].order_index = i;
      }
    }
  }

  async getById(id: number): Promise<MenuNode | null> {
    const allMenus = await this.repo.list();
    return allMenus.find(m => m.id === id) || null;
  }
}
