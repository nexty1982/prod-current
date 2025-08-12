#!/bin/bash
echo "Starting deployment..."
cd front-end
NODE_OPTIONS="--max-old-space-size=4096" npm install --legacy-peer-deps
NODE_OPTIONS="--max-old-space-size=4096" npm run build
echo "Deployment completed"
