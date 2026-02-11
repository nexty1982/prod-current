-- Orthodox Calendar Schema Reference
-- This file contains reference schema structures for Orthodox Calendar features
-- NOTE: These tables are NOT created in client databases - this is for reference only
-- The Orthodox Calendar uses external APIs (OCA.org, etc.) for liturgical data

/*
REFERENCE ONLY - Local commemorations structure for future use:
- Parish-specific saints and commemorations
- Local feast days and memorials
- Parish patron saints

Example structure:
{
    "name": "St. Peter the Apostle (Parish Patron)",
    "date": "2024-06-29",
    "type": "saint",
    "description": "Patron saint of our parish, feast day celebration",
    "rank": "great",
    "color": "gold"
}
*/

/*
REFERENCE ONLY - Parish events structure for future use:
- Church service schedules
- Parish meetings and social events
- Educational programs

Example structure:
{
    "title": "Divine Liturgy",
    "description": "Sunday Divine Liturgy",
    "date": "2024-07-14",
    "startTime": "10:00:00",
    "endTime": "12:00:00",
    "type": "liturgy",
    "location": "Main Church",
    "recurring": true
}
*/

-- The Orthodox Calendar system uses external Orthodox sources:
-- 1. OCA.org for daily saints and commemorations
-- 2. Liturgical calculations for seasons and colors
-- 3. Scripture readings from Orthodox lectionary
-- 4. No database storage required - all data fetched from external APIs
