# Guía Rápida de Despliegue en Servidor Linux (vía PuTTY / SSH)

Este proyecto está optimizado para funcionar en servidores Linux con **Apache / Nginx + PHP 8.x + SQLite3**.

---

## 1. Requisitos del Servidor Linux
Asegúrate de tener instalados los módulos de PHP para SQLite y PDO:

### En Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y apache2 php php-sqlite3 php-pdo php-mbstring libapache2-mod-php
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

### En CentOS / AlmaLinux / RHEL:
```bash
sudo dnf install -y httpd php php-pdo php-sqlite3
sudo systemctl restart httpd
```

---

## 2. Permisos Críticos de la Base de Datos SQLite (MANDATORIO)
SQLite necesita permisos de lectura y escritura **tanto en el archivo `barberia.db` como en el directorio `database/`** (para crear archivos de bloqueo y transacciones temporales `-wal` y `-journal`).

Ejecuta los siguientes comandos en tu terminal de PuTTY, reemplazando `/var/www/html/barberia` por la ruta donde subiste la carpeta:

```bash
# 1. Asignar como dueño al usuario del servidor web (www-data en Ubuntu/Debian, o apache en CentOS)
sudo chown -R www-data:www-data /var/www/html/barberia

# 2. Permisos de carpetas y archivos
sudo chmod -R 755 /var/www/html/barberia

# 3. Permisos de escritura específicos para la carpeta database y el archivo SQLite
sudo chmod -R 775 /var/www/html/barberia/database
sudo chmod 664 /var/www/html/barberia/database/barberia.db
```

---

## 3. Habilitar `.htaccess` en Apache (si aplica)
Para que las reglas de protección de `.htaccess` funcionen, asegúrate de que Apache permita `AllowOverride All` en tu VirtualHost o en `/etc/apache2/apache2.conf`:

```apache
<Directory /var/www/html/barberia>
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```
Luego reinicia Apache:
```bash
sudo systemctl restart apache2
```

---

## 4. Verificación
Abre tu navegador e ingresa a:
`http://IP_DE_TU_SERVIDOR/barberia/`

El sistema cargará automáticamente `index.php` con todos los módulos y la base de datos lista para operar.
