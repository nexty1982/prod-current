
# Server Configuration: SSH Keys, Sudo, Permissions, NTP, and BIND for `overezit.local`

---

## ✅ SSH Key Configuration

### 1. **Generate SSH Key (on client machine)**

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Accept default path (~/.ssh/id_ed25519)
```

### 2. **Copy Public Key to Server**

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server_ip
```

### 3. **Verify SSH Access**

```bash
ssh user@server_ip
```

---

## ✅ Grant Sudo Access Without Password

### 1. **Edit sudoers File**

```bash
sudo visudo
```

### 2. **Add Line (replace `username` with the actual username)**

```
username ALL=(ALL) NOPASSWD:ALL
```

---

## ✅ File Permissions for `/var/www/react-site`

```bash
# Ownership
sudo chown -R www-data:www-data /var/www/react-site

# Permissions
sudo find /var/www/react-site -type d -exec chmod 755 {} \;
sudo find /var/www/react-site -type f -exec chmod 644 {} \;

# Optional: Ensure execution where needed
chmod +x /var/www/react-site/server/start.sh
```

---

## ✅ Configure NTP and Set Timezone

### 1. **Set Timezone**

```bash
sudo timedatectl set-timezone America/New_York
```

### 2. **Install and Enable NTP**

```bash
sudo apt install -y ntp
sudo systemctl enable ntp
sudo systemctl restart ntp
```

### 3. **Verify**

```bash
timedatectl
ntpq -p
```

---

## ✅ Install and Configure BIND9 for `overezit.local` Intranet

### 1. **Install BIND9**

```bash
sudo apt install -y bind9 bind9utils bind9-doc
```

### 2. **Edit BIND Configuration**

**`/etc/bind/named.conf.local`**
```bash
zone "overezit.local" {
    type master;
    file "/etc/bind/db.overezit.local";
};
```

### 3. **Create Zone File**

**`/etc/bind/db.overezit.local`**
```dns
$TTL    604800
@       IN      SOA     ns.overezit.local. admin.overezit.local. (
                              2         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL

@       IN      NS      ns.overezit.local.
ns      IN      A       192.168.1.10
www     IN      A       192.168.1.10
api     IN      A       192.168.1.11
```

### 4. **Configure Local Resolver**

**`/etc/systemd/resolved.conf`**
```ini
[Resolve]
DNS=127.0.0.1
Domains=overezit.local
```

Then:

```bash
sudo systemctl restart systemd-resolved
```

### 5. **Restart and Test**

```bash
sudo systemctl restart bind9
dig @127.0.0.1 www.overezit.local
```
