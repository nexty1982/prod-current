## OrthodoxMetrics CI/CD Deployment Pipeline

### 🚀 Purpose

Establish a secure, testable, and controlled deployment workflow for the OrthodoxMetrics production environment using Jenkins.

---

### 📅 Lifecycle Stages

1. **Trigger Build**

   - Event: Push to `main` or `release/*` branches
   - Method: Jenkins GitHub webhook or manual trigger

2. **Pre-Production Build (Staging)**

   - Clean and build front-end with `NODE_ENV=staging`
   - Start test backend with isolated test DB
   - Export artifacts for downstream testing

3. **Run Tests**

   - ESLint and code format validation
   - Unit and integration tests
   - Backend route healthcheck
   - DB schema checksum comparison

4. **Result Reporting**

   - Display status in Jenkins console
   - Optional: Send to Discord/email
   - Archive test logs, test coverage, and build artifacts

5. **Approval Gate**

   - Prompt super\_admin (`nick`) for manual approval
   - Jenkins `input` step used to confirm continuation

6. **Production Build & Deploy**

   - Frontend: `NODE_ENV=production npm run build`
   - Backend: PM2 restart or systemctl restart `om-backend`
   - Database: Run controlled migrations

7. **Post-Deploy Validation**

   - `GET /api/status` health check
   - Confirm frontend rendering and DB access
   - Trigger rollback if critical errors detected

---

### 🔒 Security Protections

- Only Jenkins can write to production directories
- DB migrations versioned and logged
- Errors in pre-prod or post-deploy halt the pipeline
- All builds logged and timestamped for auditability

---

### 🌐 Environment Variables

```env
NODE_ENV=production or staging
OM_ENV=prod or preprod
```

---

### ✅ Example Jenkinsfile Steps

```groovy
pipeline {
  agent any

  stages {
    stage('Build Staging') {
      steps {
        sh 'npm install'
        sh 'NODE_ENV=staging npm run build'
      }
    }

    stage('Run Tests') {
      steps {
        sh 'npm run lint'
        sh 'npm test'
      }
    }

    stage('Approval') {
      steps {
        input message: 'Promote to Production?', submitter: 'nick'
      }
    }

    stage('Deploy Production') {
      steps {
        sh 'NODE_ENV=production npm run build'
        sh 'pm2 restart om-backend'
      }
    }
  }
}
```

---

*Last updated: August 2025* *Maintainer: OrthodoxMetrics DevOps*

