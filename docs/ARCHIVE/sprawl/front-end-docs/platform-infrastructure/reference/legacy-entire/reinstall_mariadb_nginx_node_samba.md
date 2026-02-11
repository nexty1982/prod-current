
# Reinstall MariaDB, Nginx, Node.js, and Samba on Ubuntu

## ✅ Step-by-Step Instructions

### 1. **Remove MariaDB Completely**

```bash
sudo systemctl stop mariadb
sudo apt purge -y mariadb-server mariadb-client mariadb-common mariadb-server-core-* mariadb-client-core-*
sudo apt autoremove --purge -y
sudo apt autoclean
sudo rm -rf /etc/mysql /var/lib/mysql /var/log/mysql ~/.mysql_history
sudo deluser mysql
sudo delgroup mysql
```

---

### 2. **Reinstall MariaDB**

```bash
sudo apt update
sudo apt install -y mariadb-server mariadb-client
```

After installation:

```bash
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation
```

---

### 3. **Remove and Reinstall Nginx**

```bash
sudo systemctl stop nginx
sudo apt purge -y nginx nginx-common nginx-full
sudo apt autoremove --purge -y
sudo rm -rf /etc/nginx /var/log/nginx /var/www/html
```

Reinstall:

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

### 4. **Remove and Reinstall Node.js (via NodeSource)**

**Remove Node.js:**

```bash
sudo apt purge -y nodejs npm
sudo apt autoremove --purge -y
sudo rm -rf /usr/local/lib/node_modules ~/.npm ~/.nvm ~/.node-gyp /opt/nodejs
```

**Reinstall Node.js (LTS version recommended):**

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

---

### 5. **Remove and Reinstall Samba**

```bash
sudo systemctl stop smbd nmbd
sudo apt purge -y samba samba-common samba-common-bin smbclient
sudo apt autoremove --purge -y
sudo rm -rf /etc/samba /var/lib/samba /var/log/samba
```

Reinstall:

```bash
sudo apt update
sudo apt install -y samba smbclient
```

Initialize config:

```bash
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak
sudo nano /etc/samba/smb.conf
```

Basic config example for sharing a folder:
```ini
[public]
   path = /srv/samba/public
   read only = no
   browsable = yes
   guest ok = yes
```

Restart:

```bash
sudo systemctl enable smbd
sudo systemctl restart smbd
```
