#!/bin/bash

echo "Fixing remaining import errors..."

# 1. Fix image imports that use "src/" prefix - they should use relative paths
echo "Fixing image imports..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|import "src/assets/|import "../../assets/|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|import 'src/assets/|import '../../assets/|g" {} \;

# Fix specific files that need different relative paths
sed -i 's|import "../../assets/|import "../assets/|g' src/api/blog/blogData.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/chat/Chatdata.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/contacts/ContactsData.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/eCommerce/EcommerceData.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/eCommerce/ProductsData.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/kanban/KanbanData.tsx
sed -i 's|import "../../assets/|import "../assets/|g' src/api/notes/NotesData.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/ticket/TicketData.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/userprofile/PostData.ts
sed -i 's|import "../../assets/|import "../assets/|g' src/api/userprofile/UsersData.ts

# 2. Fix local module imports that are missing relative paths
echo "Fixing local module imports..."
sed -i 's|import "gitOpsBridge"|import "./gitOpsBridge"|g' src/ai/git/commitHandler.ts
sed -i 's|import "gitOpsBridge"|import "./gitOpsBridge"|g' src/ai/git/prGenerator.ts
sed -i 's|import "vrtSecurity"|import "./vrtSecurity"|g' src/ai/vrt/vrtConfigManager.ts

# 3. Create missing CSS theme files
echo "Creating missing CSS theme files..."
mkdir -p src/styles/themes
touch src/styles/themes/orthodox-traditional.css
touch src/styles/themes/lent-season.css
touch src/styles/themes/pascha-theme.css

# Add basic content to theme files
echo "/* Orthodox Traditional Theme */" > src/styles/themes/orthodox-traditional.css
echo "/* Lent Season Theme */" > src/styles/themes/lent-season.css
echo "/* Pascha Theme */" > src/styles/themes/pascha-theme.css

# 4. Install missing npm packages
echo "Installing missing npm packages..."
npm install --save react-hook-form react-big-calendar simple-git --legacy-peer-deps

# 5. Fix imports that are missing 'from' keyword
echo "Fixing imports missing 'from' keyword..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|import "\(react-hook-form\)"|import { Controller } from "\1"|g' {} \;
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|import "\(react-big-calendar[^"]*\)"|import "\1"|g' {} \;

# 6. Fix require statements that should be imports
sed -i 's|require "simple-git"|import simpleGit from "simple-git"|g' src/ai/git/gitOpsBridge.ts

echo "Import fixes completed!"
