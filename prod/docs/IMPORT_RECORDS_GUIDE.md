# Import Records Guide

## Overview
The Import Records feature allows you to bulk import baptism, marriage, and funeral records from CSV, JSON, XML, or SQL files.

## Quick Start

### Step 1: Access the Import Feature
1. Navigate to the Records page
2. Select your church from the dropdown
3. Click the green **"Import Records"** button

### Step 2: Upload Your File
1. Select the record type (Baptisms, Marriages, or Funerals)
2. Click to upload or drag and drop your file
3. Supported formats:
   - **CSV** (.csv) - Comma-separated values
   - **JSON** (.json) - JavaScript Object Notation
   - **XML** (.xml) - Extensible Markup Language
   - **SQL** (.sql) - SQL dump files
4. Maximum file size: 50MB

### Step 3: Map Your Fields
The system will automatically detect columns in your file and suggest mappings to database fields.

#### Baptism Records Fields:
- `first_name` - First name of the baptized person
- `last_name` - Last name of the baptized person
- `baptism_date` - Date of baptism (YYYY-MM-DD format)
- `birth_date` - Date of birth (YYYY-MM-DD format)
- `priest_name` - Name of the officiating priest
- `sponsor_name` - Name of the godparent/sponsor
- `parents_names` - Names of the parents
- `notes` - Additional notes or comments

#### Marriage Records Fields:
- `groom_first_name` - Groom's first name
- `groom_last_name` - Groom's last name
- `bride_first_name` - Bride's first name
- `bride_last_name` - Bride's last name
- `marriage_date` - Date of marriage (YYYY-MM-DD format)
- `priest_name` - Name of the officiating priest
- `witnesses` - Names of witnesses
- `notes` - Additional notes or comments

#### Funeral Records Fields:
- `first_name` - First name of the deceased
- `last_name` - Last name of the deceased
- `funeral_date` - Date of funeral (YYYY-MM-DD format)
- `death_date` - Date of death (YYYY-MM-DD format)
- `birth_date` - Date of birth (YYYY-MM-DD format)
- `age_at_death` - Age at time of death
- `priest_name` - Name of the officiating priest
- `burial_place` - Location of burial
- `notes` - Additional notes or comments

### Step 4: Preview Your Data
- Review the first 10 records to ensure correct mapping
- Check that dates are in the correct format
- Verify names and other text fields are properly formatted

### Step 5: Import
1. Click **"Start Import"** to begin the import process
2. Monitor the progress:
   - **Inserted**: New records added to the database
   - **Updated**: Existing records that were modified
   - **Skipped**: Duplicate records that were not imported
   - **Errors**: Records that couldn't be imported
3. Wait for the "Import completed!" message

## Sample Files

Sample import files are available in `/server/data/sample-imports/`:
- `baptisms.csv` - Sample baptism records in CSV format
- `baptisms.json` - Sample baptism records in JSON format
- `marriages.csv` - Sample marriage records in CSV format
- `funerals.csv` - Sample funeral records in CSV format

## Tips for Successful Imports

### CSV Files
- First row should contain column headers
- Use commas to separate fields
- Enclose text with commas in quotes
- Dates should be in YYYY-MM-DD format

Example CSV:
```csv
first_name,last_name,baptism_date,birth_date,priest_name
John,Smith,2024-01-15,2023-12-01,Fr. Michael
```

### JSON Files
- Should be an array of objects
- Each object represents one record
- Field names should match database fields

Example JSON:
```json
[
  {
    "first_name": "John",
    "last_name": "Smith",
    "baptism_date": "2024-01-15",
    "birth_date": "2023-12-01",
    "priest_name": "Fr. Michael"
  }
]
```

## Deduplication
The system automatically prevents duplicate imports using a hash of each record's content. If you import the same file twice, duplicates will be skipped.

## Troubleshooting

### Common Issues:

1. **"Invalid file type"**
   - Ensure your file has the correct extension (.csv, .json, .xml, or .sql)

2. **"File size must be less than 50MB"**
   - Split large files into smaller batches

3. **Date format errors**
   - Ensure dates are in YYYY-MM-DD format
   - Example: 2024-01-15 (not 01/15/2024)

4. **Authentication required**
   - Make sure you're logged in
   - Refresh the page and try again

5. **No records imported**
   - Check field mapping is correct
   - Verify data format matches requirements
   - Look for error messages in the import status

## Security Notes
- All imports are tracked with user and timestamp information
- Records are automatically associated with your selected church
- Import history is maintained for audit purposes
- Duplicate detection prevents accidental re-imports

## Need Help?
Contact your system administrator if you encounter issues not covered in this guide.
