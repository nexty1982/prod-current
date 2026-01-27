# OrthodoxMetrics Frontend Development Setup

## Overview

This setup allows you to run a development server alongside the production environment without affecting production.

## Environment Structure

### Production (nginx)
- **Status**: Runs normally through nginx
- **Ports**: 80 (HTTP) / 443 (HTTPS)
- **Access**: https://orthodoxmetrics.com
- **Files**: Served from `dist/` directory
- **Management**: Standard nginx configuration

### Development Server
- **Purpose**: For testing changes in real-time
- **Port**: 5174
- **Host**: 0.0.0.0 (accessible from any interface)
- **Access**: http://server-ip:5174
- **Features**: Hot Module Replacement, instant rebuilds

### Preview Server (Optional)
- **Purpose**: For testing built files before deployment
- **Port**: 5175
- **Access**: http://localhost:5175

## Usage

### Start Development Server
```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run dev
```
or
```bash
./frontend-manager.sh dev
```

### Build for Production
```bash
npm run build
```
Then deploy the `dist/` files through nginx as usual.

### Manager Script Commands
```bash
./frontend-manager.sh dev      # Start development server
./frontend-manager.sh preview  # Start preview server
./frontend-manager.sh both     # Start both
./frontend-manager.sh stop     # Stop development servers
./frontend-manager.sh status   # Check status
```

## Important Notes

- **Production is NOT affected** by development server
- Development server is for testing only
- Production continues to run through nginx normally
- Build files are deployed to production via standard process
- Development server uses port 5174, production uses nginx ports

## Development Workflow

1. Make changes to source files
2. Test changes on development server (port 5174)
3. When satisfied, build for production: `npm run build`
4. Deploy `dist/` files to production nginx
5. Production site updates with new changes

This setup allows you to test OMAI Ultimate Logger changes instantly while keeping production stable!
