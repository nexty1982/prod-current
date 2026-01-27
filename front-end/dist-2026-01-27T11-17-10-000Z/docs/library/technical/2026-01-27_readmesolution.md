# Solution to Database Table Creation Issue

## Problem
The application is encountering errors because the following tables don't exist in the MySQL database:
- `fields_metadata`
- `dropdown_options`
- `mandatory_fields`

Error messages:
```
Error fetching fields metadata: Error: Table 'ssppoc_records_db.fields_metadata' doesn't exist
Error fetching dropdown config: Error: Table 'ssppoc_records_db.dropdown_options' doesn't exist
```

## Solution
The repository already contains the necessary SQL scripts and a Node.js script to create these tables. Follow these steps to resolve the issue:

1. Make sure the MySQL server is running and accessible with the credentials in the `.env` file:
   - Host: 192.168.1.226
   - Port: 3306
   - User: ssppoc_user
   - Password: tN7afy5SzhNH6pJWU7ka%c
   - Database: ssppoc_records_db

2. Run the database update script:

   **For Windows users:**
   - Double-click on the `run_update.bat` file in the `server/db` directory

   **For Linux/Mac users:**
   - Make the script executable: `chmod +x run_update.sh`
   - Run the script: `./run_update.sh`

   **Alternatively, you can run the script manually:**
   ```bash
   cd server/db
   node update_database.js
   ```

3. This script will:
   - Execute `update_users_table.sql` to ensure the users table has the necessary columns
   - Execute `create_config_tables.sql` to create the missing tables:
     - `fields_metadata`: Stores metadata about fields in different tables
     - `mandatory_fields`: Stores which fields are mandatory
     - `dropdown_options`: Stores options for dropdown fields

4. After running the script, restart the server and the errors should be resolved.

## Verification
You can verify that the tables were created successfully by:
1. Connecting to the MySQL database
2. Running the following queries:
   ```sql
   SHOW TABLES;
   SELECT * FROM fields_metadata;
   SELECT * FROM mandatory_fields;
   SELECT * FROM dropdown_options;
   ```

## Additional Information
The SQL scripts also insert default data into these tables for baptism, marriage, and funeral records. This ensures that the application has the necessary configuration data to function properly.
