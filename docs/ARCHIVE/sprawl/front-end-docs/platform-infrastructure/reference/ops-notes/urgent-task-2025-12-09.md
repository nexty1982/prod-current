using /admin/users i want this page updated so the user accounts listed can be modified by super_admin, allow for password resets, account lockout, media files the church has set listed (and changeable)
each church should have their own storage path.. for now let's set it to front-end/public/church/##/ (id number)

each user should have their own profile directory that specifies their avatar shown, the banner image set, and their church profile information
the profile for super_admin users will be under front-end/public/church/007/super_admins/next/

/var/www/orthodoxmetrics/data/
└── church
    ├── 007
    │   ├── banner
    │   ├── images
    │   ├── profile
    │   └── super_admins
    │       └── next
    │           ├── avatar
    │           ├── banner
    │           └── images
    └── 46
        ├── images
        └── users
            └── frjames
                ├── banner
                ├── images
                └── profile

Concrete way to do it for OrthodoxMetrics:

Store user data outside the front-end web root

For example on your server:

/var/www/orthodoxmetrics/data/user-files/

or per-church: /var/www/orthodoxmetrics/data/church_<id>/user-files/

Or in the DB / S3-like object storage.

Make sure Nginx/Apache is not directly serving that directory.

Expose it only via authenticated backend routes

In your Node/Express backend, create routes like:

GET /api/user-files/:id → checks session/JWT, verifies the user/church, then streams the file from data/user-files.

POST /api/user-files/upload → same deal for uploads.

Front-end (src/features/...) only ever hits /api/...; it never talks to /data/... directly.

Never put secrets / private data in:

front-end/public/

src/ (they end up in the JS bundle)

Hard-coded URLs that point to public static files