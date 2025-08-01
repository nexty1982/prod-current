# OrthodoxMetrics
## Comprehensive Documentation

**Author:** Documentation Team  
**Date:** July 14, 2025  
**Version:** 1.0.0

---

# Table of Contents

1. [Introduction](#introduction)
   1. [Executive Summary](#executive-summary)
   2. [Project Overview](#project-overview)
   3. [Scope and Objectives](#scope-and-objectives)

2. [System Architecture](#system-architecture)
   1. [Overview](#architecture-overview)
   2. [Backend Architecture](#backend-architecture)
   3. [Frontend Architecture](#frontend-architecture)
   4. [Database Schema](#database-schema)
   5. [Authentication Flows](#authentication-flows)

3. [Core Features](#core-features)
   1. [Church Setup Wizard](#church-setup-wizard)
      1. [Integration Guide](#church-setup-wizard-integration)
      2. [Enhancements](#church-setup-wizard-enhancements)
   2. [Test Church Feature](#test-church-feature)
   3. [Church Provisioning & Import System](#church-provisioning-and-import-system)
   4. [Template System](#template-system)
      1. [Record Template Manager](#record-template-manager)
      2. [Multi-Tenant Template System](#multi-tenant-template-system)
   5. [OCR System](#ocr-system)
      1. [Multi-Tenant OCR System](#multi-tenant-ocr-system)
      2. [AI Entity Extraction](#ai-entity-extraction)

4. [Administration](#administration)
   1. [Admin Panel](#admin-panel)
   2. [User Management](#user-management)
   3. [Church Management](#church-management)
   4. [Logging and Monitoring](#logging-and-monitoring)

5. [Deployment and Operations](#deployment-and-operations)
   1. [Deployment Guide](#deployment-guide)
   2. [Server Configuration](#server-configuration)
   3. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
   4. [Performance Optimization](#performance-optimization)

6. [API Documentation](#api-documentation)
   1. [API Endpoints Reference](#api-endpoints-reference)
   2. [Authentication API](#authentication-api)
   3. [Churches API](#churches-api)
   4. [Templates API](#templates-api)

7. [User Guides](#user-guides)
   1. [End-User Guide](#end-user-guide)
   2. [Administrator Guide](#administrator-guide)
   3. [Quick Start Guide](#quick-start-guide)

8. [Troubleshooting](#troubleshooting)
   1. [Common Issues](#common-issues)
   2. [Diagnostic Tools](#diagnostic-tools)
   3. [Authentication Troubleshooting](#authentication-troubleshooting)

9. [Development](#development)
   1. [Development Setup](#development-setup)
   2. [Testing Guide](#testing-guide)
   3. [Security Guide](#security-guide)

10. [Appendices](#appendices)
    1. [Glossary](#glossary)
    2. [References](#references)
    3. [Revision History](#revision-history)

---

# Introduction

## Executive Summary

OrthodoxMetrics is a comprehensive church management system designed specifically for Orthodox churches. The system provides a complete solution for managing church records, including baptisms, marriages, funerals, and other sacraments, as well as administrative functions such as user management, church configuration, and reporting.

This documentation consolidates all aspects of the OrthodoxMetrics system, including architecture, features, deployment, administration, and development guidelines. It serves as the definitive reference for stakeholders at all levels, from end-users to administrators and developers.

The system has been designed with several key features:
- Multi-tenant architecture supporting multiple churches
- Comprehensive church setup and configuration
- Test church functionality for development and demonstrations
- Template-based record management
- OCR and AI-powered data extraction
- Robust security and authentication

## Project Overview

OrthodoxMetrics was developed to address the specific needs of Orthodox churches for digital record-keeping and management. The system respects Orthodox traditions and terminology while providing modern digital tools for efficient church administration.

The project encompasses:
- Church database creation and management
- Record-keeping for sacraments and services
- User management with role-based permissions
- Template system for customizable record formats
- OCR capabilities for digitizing paper records
- Comprehensive reporting and analytics

## Scope and Objectives

### Scope
This documentation covers all aspects of the OrthodoxMetrics system, including:
- System architecture and components
- Feature descriptions and usage
- Installation and deployment
- Administration and maintenance
- API references
- User guides
- Troubleshooting and support

### Objectives
- Provide a comprehensive reference for all system stakeholders
- Document all features and functionality
- Facilitate system deployment and maintenance
- Support end-users and administrators
- Guide developers in extending and maintaining the system

---

# System Architecture

## Architecture Overview

OrthodoxMetrics follows a modern web application architecture with:
- Node.js Express backend
- React frontend with Material-UI
- MySQL/MariaDB database
- RESTful API communication
- Multi-tenant database design

The system is designed for scalability, security, and performance, with clear separation of concerns between components.

## Backend Architecture

The backend is built on Node.js with Express, providing RESTful API endpoints for all system functionality. Key components include:

- **API Routes**: Organized by domain (churches, templates, auth, etc.)
- **Controllers**: Business logic implementation
- **Services**: Reusable functionality (template generation, OCR processing)
- **Database Access**: Parameterized queries for security
- **Authentication**: Session-based with role permissions
- **Middleware**: Request validation, error handling, logging

## Frontend Architecture

The frontend is built with React and Material-UI, providing a responsive and accessible user interface. Key components include:

- **Component Structure**: Reusable UI components
- **State Management**: Context API and hooks
- **Routing**: React Router with protected routes
- **Form Handling**: Formik with Yup validation
- **API Integration**: Axios for API requests
- **Styling**: Material-UI theming and styled components

## Database Schema

The database architecture follows a multi-tenant design with:

- **Main System Database**: Global registry of churches and users
- **Individual Church Databases**: Separate database for each church

Key tables include:
- `churches`: Global church registry
- `church_info`: Church-specific information
- `users`: User accounts and roles
- `clergy`: Church clergy members
- `baptism_records`, `marriage_records`, `funeral_records`: Sacrament records
- `templates`: Record templates
- `church_settings`: Configuration settings

## Authentication Flows

The system implements comprehensive authentication with:

- **Login Flow**: Username/password authentication
- **Session Management**: Secure HTTP-only cookies
- **Role-Based Access Control**: Admin, church_admin, user roles
- **Permission Checking**: Menu and API endpoint permissions
- **Security Measures**: CSRF protection, rate limiting, secure headers

---

# Core Features

## Church Setup Wizard

The Church Setup Wizard provides a step-by-step process for creating and configuring new churches in the system. The wizard guides users through providing church information, setting up the database, configuring templates, and creating administrator accounts.

### Church Setup Wizard Integration

The Church Setup Wizard integrates with the existing OrthodoxMetrics application through a two-part workflow:

1. **Add Church Page**: Simple church creation form
2. **Church Setup Wizard**: Multi-step configuration process

#### Components Created
- **Frontend**: `ChurchSetupWizard.tsx`, `AddChurchPage.tsx`
- **Backend**: `churchSetupWizard.js`, `church-setup-wizard-schema.sql`

#### Integration Steps
1. **Database Setup**: Run setup script to create required tables
2. **Backend Integration**: Add routes to Express server
3. **Frontend Integration**: Add components to React application
4. **Environment Configuration**: Set required environment variables

#### API Endpoints
- `POST /api/churches`: Create new church
- `GET /api/churches/recent?limit=10`: Get recent churches
- `POST /api/churches/test-connection/:church_id`: Test database connection
- `GET /api/churches/:church_id/details`: Get church details

#### Features Implemented
- Church selection
- Database connection testing
- Church information summary
- Parish clergy information
- Branding & customization

### Church Setup Wizard Enhancements

The Church Setup Wizard has been enhanced from a basic 4-step process to a comprehensive 6-step system with advanced features:

#### Expanded Wizard Steps
1. **Church Information** (enhanced)
2. **Language & Settings** (unchanged)
3. **Administrator Account** (unchanged)
4. **Database Connection Test** (NEW)
5. **Template Setup (Optional)** (NEW)
6. **Review & Create** (enhanced)

#### New Features
- **Database Connection Testing**: Real-time connection testing with visual indicators
- **Template Setup Configuration**: Optional template setup with record type selection
- **Enhanced Progress Tracking**: Visual breadcrumb with step names
- **Advanced Review Summary**: Shows connection and template status
- **Improved Success Message**: Detailed feedback with next steps

#### Backend Enhancements
- Enhanced Church Creation API with template support
- Database Connection Testing API
- Setup Status Tracking

#### User Experience Improvements
- Smart step validation
- Step-specific validation
- Back/forward navigation
- Visual polish with consistent styling
- Comprehensive error handling

## Test Church Feature

The Test Church feature automatically provisions churches with comprehensive dummy data, perfect for development, testing, demonstrations, and training purposes.

### Features Added

#### Test Church Checkbox (Step 1)
- **Test Church toggle** with warning styling
- **Auto-configuration** of templates
- **Sub-options** for controlling data generation:
  - Auto-populate data (church staff and members)
  - Include sample records (baptism, marriage, funeral)
  - Record count selection (25, 50, 100, or 200)

#### Database Schema Enhancement
- Added `is_test_church` field to church_info table
- Created index for efficient querying
- Benefits include easy identification and bulk operations

#### Comprehensive Sample Data Generator
- Orthodox-authentic data (names, titles, locations)
- Realistic dates for all records
- Cultural authenticity with Orthodox-specific patterns

#### Generated Sample Data Types
- Clergy Members (5 default)
- Baptism Records (60% of total)
- Marriage Records (30% of total)
- Funeral Records (10% of total)
- Church Users (8 default)
- Church Settings
- Branding Configuration

### Technical Implementation

#### Frontend Changes
- Form state additions for test church options
- Auto-configuration logic for templates
- Visual indicators for test churches

#### Backend Changes
- Enhanced Church Creation API with test parameters
- Test Data Provisioning Flow
- Data Generation Algorithm

#### Sample Data Statistics
- Default configuration generates 50 records
- Scalable options from 25 to 200 records
- Orthodox-authentic naming patterns

#### Production Safety Features
- Database flag for identification
- Visual indicators in UI
- Separate indexing for easy querying
- Bulk operations for management

### Usage Scenarios
- Development Testing
- Client Demonstrations
- Training Environment
- Performance Testing

## Church Provisioning and Import System

The Church Provisioning & Import System handles both existing church migration and new church provisioning, along with a Material-UI based import interface.

### Architecture

#### Database Schema
- Enhanced church_info table with 18 comprehensive fields
- Extended record tables with Orthodox-specific fields
- Backward compatibility with existing data
- Complete indexing for performance

#### Frontend Components
- ImportRecordsButton.tsx - Material-UI import interface
- RecordGenerator.tsx - Multilingual test data generator
- Notification System with notistack integration

#### Backend Services
- Church Provisioner for automated database creation
- Migration System for safe upgrades
- Import API with validation and batch processing

### Quick Start

#### For Existing Churches
1. Run migration to upgrade schema
2. Test the complete workflow
3. Access the import interface

#### For New Churches
1. Use the church provisioner
2. Test provisioning

### Key Features

#### Import System
- Material-UI Interface
- Church Selection Dropdown
- File Validation
- Comprehensive Validation
- Progress Indicators
- Error Handling
- Notification System

#### Record Generation
- Multilingual Support
- Culturally Authentic Data
- Multiple Record Types
- Scalable Quantities
- Export Functionality

#### Church Provisioning
- Automated Database Creation
- Template-Based
- Global Registry
- Security
- Comprehensive Configuration

### Security & Validation
- Input Validation
- Access Control
- Data Sanitization

### Monitoring & Logging
- Import Tracking
- Error Tracking
- Success Metrics
- User Attribution
- Database Health

## Template System

### Record Template Manager

The Record Template Manager provides a system for creating and managing record templates for different types of church records.

#### Features
- Template creation and management
- Field configuration
- Template generation
- Template application to record types

#### API Endpoints
- `GET /api/templates`: List all templates
- `POST /api/templates/generate`: Create new template
- `DELETE /api/templates/:name`: Delete template

### Multi-Tenant Template System

The Multi-Tenant Template System extends template functionality across multiple churches, allowing for shared templates and church-specific customizations.

#### Features
- Global template library
- Church-specific template customization
- Template inheritance
- Version control

## OCR System

### Multi-Tenant OCR System

The Multi-Tenant OCR System provides optical character recognition capabilities for digitizing paper records, with support for multiple churches and languages.

#### Features
- Document scanning and processing
- Text extraction
- Field mapping
- Multi-language support
- Church-specific configurations

### AI Entity Extraction

The AI Entity Extraction system uses artificial intelligence to automatically extract structured data from unstructured text, particularly for church records.

#### Features
- Named entity recognition
- Date extraction
- Relationship mapping
- Orthodox-specific entity recognition
- Confidence scoring

---

# Administration

## Admin Panel

The Admin Panel provides a centralized interface for system administration, including user management, church management, and system configuration.

### Features
- Dashboard with system statistics
- User management
- Church management
- Template management
- System configuration
- Logs and monitoring

## User Management

The User Management system handles user accounts, roles, and permissions across the system.

### Features
- User creation and management
- Role assignment
- Permission configuration
- Password management
- Activity logging

## Church Management

The Church Management system handles church registration, configuration, and management.

### Features
- Church registration
- Church configuration
- Clergy management
- Record management
- Template assignment

## Logging and Monitoring

The Logging and Monitoring system tracks system activity and performance for troubleshooting and optimization.

### Features
- Activity logging
- Error tracking
- Performance monitoring
- Audit trails
- Notification system

---

# Deployment and Operations

## Deployment Guide

The Deployment Guide provides instructions for deploying the OrthodoxMetrics system in various environments.

### Topics
- System requirements
- Installation steps
- Configuration
- Database setup
- Web server configuration
- SSL/TLS setup

## Server Configuration

The Server Configuration guide details the configuration of the server environment for optimal performance and security.

### Topics
- Node.js configuration
- Web server setup (Nginx/Apache)
- Database server configuration
- Caching
- Security hardening

## Backup and Disaster Recovery

The Backup and Disaster Recovery guide outlines procedures for data backup and recovery in case of system failure.

### Topics
- Backup strategies
- Backup automation
- Recovery procedures
- Data integrity verification
- Business continuity planning

## Performance Optimization

The Performance Optimization guide provides strategies for optimizing system performance.

### Topics
- Database optimization
- Query optimization
- Caching strategies
- Frontend optimization
- Load balancing

---

# API Documentation

## API Endpoints Reference

The API Endpoints Reference provides a comprehensive list of all API endpoints with request and response formats.

### Endpoint Categories
- Authentication
- Churches
- Users
- Records
- Templates
- OCR
- System

## Authentication API

The Authentication API handles user authentication and session management.

### Endpoints
- `POST /api/auth/login`: User login
- `POST /api/auth/logout`: User logout
- `GET /api/auth/check`: Check authentication status
- `POST /api/auth/reset-password`: Password reset

## Churches API

The Churches API handles church management and configuration.

### Endpoints
- `GET /api/churches`: List churches
- `POST /api/churches`: Create church
- `GET /api/churches/:id`: Get church details
- `PUT /api/churches/:id`: Update church
- `DELETE /api/churches/:id`: Delete church

## Templates API

The Templates API handles template management and generation.

### Endpoints
- `GET /api/templates`: List templates
- `POST /api/templates/generate`: Generate template
- `GET /api/templates/:id`: Get template details
- `PUT /api/templates/:id`: Update template
- `DELETE /api/templates/:id`: Delete template

---

# User Guides

## End-User Guide

The End-User Guide provides instructions for regular users of the system.

### Topics
- Login and navigation
- Record management
- Search and filtering
- Reports and exports
- Profile management

## Administrator Guide

The Administrator Guide provides instructions for system administrators.

### Topics
- User management
- Church configuration
- Template management
- System monitoring
- Troubleshooting

## Quick Start Guide

The Quick Start Guide provides a brief introduction to the system for new users.

### Topics
- System overview
- Basic navigation
- Common tasks
- Getting help
- Next steps

---

# Troubleshooting

## Common Issues

The Common Issues section addresses frequently encountered problems and their solutions.

### Categories
- Login issues
- Database connection problems
- Permission errors
- Import/export issues
- Performance problems

## Diagnostic Tools

The Diagnostic Tools section describes tools available for diagnosing system issues.

### Tools
- Health check scripts
- Database diagnostics
- API testing tools
- Log analysis
- Performance monitoring

## Authentication Troubleshooting

The Authentication Troubleshooting section addresses specific issues related to authentication and permissions.

### Topics
- Login failures
- Session issues
- Permission denied errors
- Password reset problems
- Account lockouts

---

# Development

## Development Setup

The Development Setup guide provides instructions for setting up a development environment.

### Topics
- Prerequisites
- Repository setup
- Database setup
- Environment configuration
- Development workflow

## Testing Guide

The Testing Guide outlines procedures for testing the system.

### Topics
- Unit testing
- Integration testing
- End-to-end testing
- Performance testing
- Security testing

## Security Guide

The Security Guide provides guidelines for maintaining system security.

### Topics
- Authentication security
- Data protection
- Input validation
- CSRF protection
- Security headers

---

# Appendices

## Glossary

The Glossary provides definitions of terms used throughout the documentation.

## References

The References section lists external resources and documentation referenced in this document.

## Revision History

The Revision History tracks changes to this documentation.

| Version | Date | Description | Author |
|---------|------|-------------|--------|
| 1.0.0 | July 14, 2025 | Initial comprehensive documentation | Documentation Team |