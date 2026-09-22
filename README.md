# MedManager — GitHub Pages Wrapper

หน้าเว็บนี้ครอบ Apps Script Web App ด้วย iframe เต็มจอ เพื่อให้มี favicon และไอคอนหน้าจอ (Add to Home Screen) เป็นของตัวเอง เพราะ Apps Script เองไม่รองรับการตั้งค่านี้

## วิธีใช้งาน

1. อัปโหลดไฟล์ทั้งหมดในนี้ขึ้น repo บน GitHub (root ของ repo หรือโฟลเดอร์ `/docs`)
2. เปิดไฟล์ `index.html` แก้บรรทัดนี้ให้เป็นลิงก์ Web App ที่ deploy ไว้:
   ```js
   const WEBAPP_URL = "PUT_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE";
   ```
   เปลี่ยนเป็นเช่น:
   ```js
   const WEBAPP_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
3. ไปที่ repo → Settings → Pages → เลือก branch และโฟลเดอร์ที่ใช้ → Save
4. เปิดลิงก์ GitHub Pages ที่ได้ บนมือถือ แล้วกด "Add to Home Screen" — จะได้ไอคอน MedManager และเปิดแบบเต็มจอไม่มีแถบ URL ของ Google

## ไฟล์ในนี้

- `index.html` — หน้า wrapper, ครอบ Apps Script ด้วย iframe เต็มจอ
- `manifest.json` — PWA manifest สำหรับ Add to Home Screen บน Android
- `icons/` — ไอคอนทุกขนาดที่สร้างจากรูปที่ให้มา: favicon, apple-touch-icon, icon-192, icon-512

## หมายเหตุ

- ถ้าอยากให้ URL bar เปลี่ยนเป็นของ Google แทน (redirect ตรงแทน iframe) บอกได้ จะทำเวอร์ชันนั้นให้แทน
- ถ้า Apps Script Web App ตั้งค่า "Who has access" แบบต้อง login ด้วยบัญชี Google, การครอบ iframe อาจโดนบล็อกโดยนโยบายของ Google (X-Frame-Options) — ถ้าเจอหน้าโหลดไม่ขึ้นให้แจ้งมา จะแก้เป็นวิธี redirect แทน
