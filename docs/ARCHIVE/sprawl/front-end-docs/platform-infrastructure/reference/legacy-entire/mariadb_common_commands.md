
# MariaDB Common Commands

---

## ✅ Create User

```sql
CREATE USER 'username'@'localhost' IDENTIFIED BY 'securepassword';
```

Or for remote access:

```sql
CREATE USER 'username'@'%' IDENTIFIED BY 'securepassword';
```

---

## ✅ Grant All Privileges on a Database

```sql
GRANT ALL PRIVILEGES ON databasename.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
```

---

## ✅ View Existing Privileges

```sql
SHOW GRANTS FOR 'username'@'localhost';
```

To see privileges per table:

```sql
SELECT * FROM information_schema.user_privileges WHERE GRANTEE LIKE "'username'%";
```

---

## ✅ Alter Table Examples

### 1. Add a column:

```sql
ALTER TABLE tablename ADD COLUMN new_column VARCHAR(255);
```

### 2. Modify a column:

```sql
ALTER TABLE tablename MODIFY COLUMN column_name INT NOT NULL;
```

### 3. Drop a column:

```sql
ALTER TABLE tablename DROP COLUMN old_column;
```

### 4. Rename a column:

```sql
ALTER TABLE tablename CHANGE old_column new_column VARCHAR(255);
```

---

## ✅ Select Examples

### 1. Basic select:

```sql
SELECT * FROM tablename;
```

### 2. With WHERE clause:

```sql
SELECT * FROM tablename WHERE column_name = 'value';
```

### 3. With sorting:

```sql
SELECT * FROM tablename ORDER BY column_name DESC;
```

### 4. With limit:

```sql
SELECT * FROM tablename LIMIT 10;
```

---

## ✅ Insert Examples

### 1. Insert single row:

```sql
INSERT INTO tablename (column1, column2) VALUES ('value1', 'value2');
```

### 2. Insert multiple rows:

```sql
INSERT INTO tablename (column1, column2) VALUES 
('value1', 'value2'),
('value3', 'value4');
```

---

## ✅ Extra: Create Database

```sql
CREATE DATABASE databasename;
```

## ✅ Delete User

```sql
DROP USER 'username'@'localhost';
```
