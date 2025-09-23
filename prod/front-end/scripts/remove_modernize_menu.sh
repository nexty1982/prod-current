#!/bin/bash

# Backup the original file
cp src/layouts/full/vertical/sidebar/MenuItems.ts src/layouts/full/vertical/sidebar/MenuItems.ts.backup

# Remove the Modernize Apps section (around line 342-390)
# This includes Notes, Calendar, Kanban under Apps
sed -i '/^\s*{$/,/^\s*title: '\''Apps'\'',$/d' src/layouts/full/vertical/sidebar/MenuItems.ts
sed -i '/^\s*icon: IconApps,$/,/^\s*]\s*},$/d' src/layouts/full/vertical/sidebar/MenuItems.ts

# Remove the Pages section that includes UI, Pricing, FAQ, Account Settings
sed -i '/^\s*{$/,/^\s*title: '\''Pages'\'',$/d' src/layouts/full/vertical/sidebar/MenuItems.ts
sed -i '/^\s*icon: IconPages,$/,/^\s*]\s*},$/d' src/layouts/full/vertical/sidebar/MenuItems.ts

# Remove specific standalone items
sed -i '/^\s*title: '\''Notes'\'',$/,+5d' src/layouts/full/vertical/sidebar/MenuItems.ts
sed -i '/^\s*title: '\''Calendar'\'',$/,+5d' src/layouts/full/vertical/sidebar/MenuItems.ts  
sed -i '/^\s*title: '\''Kanban'\'',$/,+5d' src/layouts/full/vertical/sidebar/MenuItems.ts
sed -i '/^\s*title: '\''Pricing'\'',$/,+5d' src/layouts/full/vertical/sidebar/MenuItems.ts
sed -i '/^\s*title: '\''FAQ'\'',$/,+5d' src/layouts/full/vertical/sidebar/MenuItems.ts
sed -i '/^\s*title: '\''FAQs'\'',$/,+5d' src/layouts/full/vertical/sidebar/MenuItems.ts
sed -i '/^\s*title: '\''Account Settings'\'',$/,+5d' src/layouts/full/vertical/sidebar/MenuItems.ts

echo "Modernize template menu items removed!"
