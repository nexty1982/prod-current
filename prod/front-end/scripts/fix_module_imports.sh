#!/bin/bash

echo "Fixing imports in all module files..."

# Fix imports in omai-logger module
for file in src/modules/omai-logger/*.tsx src/modules/omai-logger/*.ts; do
  [ -f "$file" ] && {
    # Fix imports from parent directories that should be from src/
    sed -i "s|from '../../../services/|from '../../services/|g" "$file"
    sed -i "s|from '../config/|from '../../config/|g" "$file"
    # These files reference OMAIUltimateLogger which is in same dir
    sed -i "s|from '../../OMAIUltimateLogger'|from './OMAIUltimateLogger'|g" "$file"
    sed -i "s|from '../../SimpleLogViewer'|from './SimpleLogViewer'|g" "$file"
    # Fix types and hooks that are in same directory
    sed -i "s|from '../../types'|from './types'|g" "$file"
    sed -i "s|from '../../hooks'|from './hooks'|g" "$file"
  }
done

# Fix imports in OMLearn module
for file in src/modules/OMLearn/*.tsx src/modules/OMLearn/*.ts; do
  [ -f "$file" ] && {
    sed -i "s|from '../../SurveyResultsContext'|from './SurveyResultsContext'|g" "$file"
  }
done

# Fix imports in settings module
for file in src/modules/settings/*.tsx src/modules/settings/*.ts; do
  [ -f "$file" ] && {
    sed -i "s|from '../settings/|from './|g" "$file"
    sed -i "s|from '../../ImageGridExtractor'|from './ImageGridExtractor'|g" "$file"
  }
done

# Fix imports in tasks module
for file in src/modules/tasks/*.tsx src/modules/tasks/*.ts; do
  [ -f "$file" ] && {
    sed -i "s|from '../../TaskModal/|from '../../components/apps/kanban/TaskModal/|g" "$file"
    sed -i "s|from '../../KanbanHeader'|from '../../components/apps/kanban/KanbanHeader'|g" "$file"
  }
done

echo "Import fixes completed!"
