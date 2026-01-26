# Orthodox Metrics AI Ecosystem - Quick Start Guide

## 🚀 Immediate Next Steps (This Week)

### 1. Test Current Implementation
```bash
# Backend
cd Z:\ai-ecosystem\backend
python -m pip install -r requirements.txt
python main.py

# Frontend (in new terminal)
cd Z:\front-end
npm install
npm run dev

# Test AI endpoints
curl http://localhost:8001/health
```

### 2. Set Up Environment Variables
Create `Z:\ai-ecosystem\backend\.env`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLOUD_CREDENTIALS=path_to_google_credentials.json
DATABASE_URL=mysql://user:password@localhost:3306/orthodmetrics
DEBUG=true
```

### 3. Database Setup
```sql
-- Add to Orthodox Metrics database
CREATE TABLE ai_usage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_type ENUM('content', 'translation', 'ocr', 'analytics', 'deployment', 'logs') NOT NULL,
    request_data JSON,
    response_data JSON,
    processing_time DECIMAL(10, 3),
    tokens_used INT,
    cost DECIMAL(10, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📋 Priority Tasks (Next 7 Days)

### Day 1-2: Security Foundation
- [ ] Add JWT authentication to AI endpoints
- [ ] Implement rate limiting
- [ ] Add input validation

### Day 3-4: Error Handling
- [ ] Create comprehensive error handling
- [ ] Add proper logging
- [ ] Implement health checks

### Day 5-7: Frontend Polish
- [ ] Add loading states to all AI components
- [ ] Improve error messages
- [ ] Test user workflows

## 🔧 Development Commands

### Backend Development
```bash
# Install dependencies
cd Z:\ai-ecosystem\backend
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --port 8001

# Run tests (when created)
pytest tests/
```

### Frontend Development
```bash
# Install dependencies
cd Z:\front-end
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Docker Development
```bash
# Build AI backend
cd Z:\ai-ecosystem
docker build -f docker/Dockerfile.ai-backend -t ai-backend .

# Run with compose
docker-compose -f docker/docker-compose.yml up
```

## 🧪 Testing Checklist

### Manual Testing
- [ ] AI Content Generator loads and accepts input
- [ ] Translation Assistant processes text
- [ ] OCR Processor accepts file uploads
- [ ] Analytics Dashboard displays placeholder data
- [ ] Deployment Automation shows service status
- [ ] Log Analysis accepts log files
- [ ] Admin Panel provides overview

### API Testing
```bash
# Health check
curl http://localhost:8001/health

# Content generation (requires OpenAI key)
curl -X POST http://localhost:8001/api/ai/content/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test content", "tone": "professional"}'
```

## 🚨 Common Issues & Solutions

### Backend Issues
1. **Import errors**: Check Python version (3.9+) and virtual environment
2. **OpenAI errors**: Verify API key and account credits
3. **Database errors**: Check MariaDB connection and credentials
4. **Port conflicts**: Change port in uvicorn command

### Frontend Issues
1. **Component not loading**: Check console for errors
2. **API calls failing**: Verify backend is running on port 8001
3. **Build errors**: Check Node.js version (18+) and dependencies
4. **Routing issues**: Verify user has admin role

## 📁 File Structure Reference

```
Z:\ai-ecosystem\
├── backend\
│   ├── main.py              # Main FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── models\             # Pydantic models
│   ├── services\           # AI service implementations
│   └── docker\             # Docker configurations
├── start.sh                # Linux/macOS startup script
└── start.ps1               # Windows PowerShell startup script

Z:\front-end\src\
├── components\ai\          # AI React components
├── services\aiService.ts   # AI API client
├── routes\Router.tsx       # Routing configuration
└── layouts\full\vertical\sidebar\MenuItems.ts  # Navigation menu
```

## 📞 Support

### Getting Help
1. Check the logs first: `docker logs ai-backend` or browser console
2. Verify environment variables are set correctly
3. Ensure all services are running (database, backend, frontend)
4. Check the troubleshooting section in README.md

### Reporting Issues
When reporting issues, include:
- Error messages (full stack trace)
- Steps to reproduce
- Environment details (OS, Python/Node versions)
- Current configuration (without sensitive data)

---

**Quick Start Version**: 1.0
**Last Updated**: January 2025
**For urgent issues**: Check logs and restart services
