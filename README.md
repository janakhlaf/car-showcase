# VELOCE — React + PHP + MySQL

هذه النسخة تحافظ على تصميم مشروع Next.js الأصلي ومكوّناته وصفحاته قدر الإمكان، مع تحويل التشغيل إلى React Vite وربط PHP/MySQL.

## التشغيل
1. ضع المجلد باسم `finalmoderncarwebsite` داخل `C:\xampp\htdocs`.
2. شغّل Apache وMySQL من XAMPP.
3. افتح phpMyAdmin واستورد `database.sql`.
4. افتح Terminal داخل `frontend` ثم شغّل:
   npm install
   npm run dev
5. افتح http://localhost:5173

Admin: admin@showroom.com / admin123

إذا غيّرت اسم مجلد المشروع، عدّل `VITE_BACKEND_BASE` داخل ملف `frontend/.env`.
