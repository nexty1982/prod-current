import { BoundComponent } from '../../../front-end/src/pages/omb/types';

export default {
  name: "databaseChecker",
  description: "Checks if database tables exist for components",
  run: async (component: BoundComponent): Promise<string> => {
    try {
      // Check if the database table exists by querying the information schema
      const response = await fetch('/api/admin/database/check-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: component.dbTable
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.exists) {
          return `✅ Database table '${component.dbTable}' exists`;
        } else {
          return `❌ Database table '${component.dbTable}' does not exist`;
        }
      } else {
        return `⚠️ Could not verify database table '${component.dbTable}': ${response.status}`;
      }
    } catch (error) {
      return `❌ Could not check database table '${component.dbTable}': ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}; 