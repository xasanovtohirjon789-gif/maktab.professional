# 🎓 toha_coins — Maktab Boshqaruv Tizimi

Professional maktab boshqaruv platformasi - direktorlar, o'qituvchilar va administatorlar uchun to'liq yechim.

## ✨ Xususiyatlari

- **👨‍💼 Administrator Paneli**: Barcha maktablarni, direktorlarni va faoliyat muddatlarini boshqarish
- **👨‍💼 Direktor Paneli**: Maktabning to'liq statistikasini, o'qituvchilari va o'quvchilarini boshqarish
- **👨‍🏫 O'qituvchi Paneli**: Sinf raxbarligi va o'quvchilar statistikasini ko'rish
- **📊 Reyting Sistema**: Kunlik, oylik va yillik reytinglar
- **💰 Coin Tizimi**: O'quvchilar uchun ball/coin tizimi
- **📱 Responsive Dizayn**: Barcha qurilmalarda ishlaydi (kompyuter, telefon, planshet)

## 🚀 Tez Boshlash (PowerShell)

### Variant 1: Python HTTP Server (Tavsiya etiladi)

```powershell
Set-Location 'C:\Users\Lenovo\Desktop\maktab'
python -m http.server 8000
```

Keyin brauzerda oching: **http://localhost:8000**

### Variant 2: Node.js Server (Opsional, server-side ma'lumot saqlanishi uchun)

```powershell
Set-Location 'C:\Users\Lenovo\Desktop\maktab'
node server.js
```

Keyin brauzerda oching: **http://localhost:8000**

## 🔐 Test Kirish Ma'lumotlari

### Admin Akkaunt
- **Login**: `ToHa_012`
- **Parol**: `tox1c___`

### O'qituvchi Akkaunt
- **Login**: `ali_login`
- **Parol**: `ali_pass`

### Direktor Akkaunt
- **Login**: `director_school2`
- **Parol**: `SecurePass2024`

## 📁 Loyihaning Tuzilishi

```
maktab/
├── index.html           # Asosiy HTML sahifasi (barcha panellar bunda)
├── style.css            # Styling va CSS (responsive)
├── script.js            # Barcha JavaScript logikasi (~1200 qator)
├── server.js            # Node.js server (opsional)
├── data.json            # Default ma'lumotlar (tizimga yuklash uchun)
├── package.json         # NPM konfiguratsiyasi
├── README.md            # Asosiy o'quv qo'llanma
├── GUIDE.md             # Bu fayl (detalli qo'llanma)
└── images/              # Rasmlar (opsional)
```

## 💾 Ma'lumot Saqlash

- **localStorage**: Brauzerdagi ma'lumotlar `maktabData_v1` kalit ostida saqlanadi
- **data.json**: Agar server ishlamoqda bo'lsa, `PUT /api/data` orqali yangilanadi
- **Persistent**: Brauzer yopilsa ham ma'lumot saqlanib qoladi

## 🔄 Brauzerdagi Ma'lumotlarni Qayta Yuklash

DevTools Konsolida ishga tushiring (F12 tugmasi):

```javascript
localStorage.removeItem('maktabData_v1'); location.reload();
```

## ⚙️ Teknik Jixozlar

| Komponent | Teknologiya |
|-----------|-----------|
| HTML | HTML5 + Semantic Elements |
| CSS | Modern CSS3 + Grid + Flexbox |
| JavaScript | Vanilla JS (frameworksiz) |
| Storage | localStorage + JSON |
| Server | Node.js (opsional) |
| HTTP | Python http.server / Node.js Express |

## 📊 Panellar va Xususiyatlari

### 🛡️ Admin Paneli (`ToHa_012` / `tox1c___`)
- **Bosh sahifa**: Barcha maktablarning, direktorlarning statistikasi
- **Barcha Maktablar**: Maktablarni ko'rish, faoliyat muddati qo'shish/o'chirish
- **Direktorlar**: Barcha direktorlarning login/parol ma'lumotlari
- **Direktor Qo'shish**: Yangi maktab va direktor yaratish

**Amallar**:
- Maktabga kun qo'shish (faoliyat muddati uzaytirish)
- Maktabni o'chirish (barcha ma'lumotlar o'chadi)
- Direktor parolini o'zgartirish
- Maktab statistikasini ko'rish (sinflar, o'quvchilar soni)

### 👨‍💼 Direktor Paneli (`director_school2` / `SecurePass2024`)
- **Bosh sahifa**: Maktabning statistikasi (o'qituvchilar, o'quvchilar, sinflar soni)
- **O'qituvchilar**: O'qituvchilar ro'yxati, yangi o'qituvchi qo'shish
- **O'quvchilar**: Maktabning barcha o'quvchilari
- **Sinflar**: Sinflar, sinf raxbari belgilash

**Amallar**:
- O'qituvchi qo'shish (fan, login, parol bilan)
- Sinf qo'shish (sinf rasmi qo'shish mumkin)
- Sinf raxbarini belgilash (o'qituvchidan)
- Maktab rasmi yuklash
- O'qituvchi/sinf o'chirish

### 👨‍🏫 O'qituvchi Paneli (`ali_login` / `ali_pass`)
- **Bosh sahifa**: Biriktirilgan sinflar, o'quvchilar soni
- **Sinflar**: Biriktirilgan sinflarning ro'yxati

**Amallar**:
- Sinf statistikasini ko'rish
- O'quvchilarning coin balansini ko'rish
- Sinf raxbar bo'lsa, davomatni qayd qilish

### 🏢 Sinf Sahifasi (Direktor va O'qituvchi uchun)
- **O'quvchilar jadavali**: Barcha o'quvchilar va ularnin coin balansini
- **O'qituvchilar jadavali**: Sinfda o'rgatib turgan o'qituvchilar
- **Reyting**: Kunlik/oylik/yillik reytinglar
- **Davomat**: Sinf raxbar bo'lsa davomatni qayd qila oladi

**Direktor amallar**:
- O'quvchi qo'shish
- O'qituvchi biriktirish
- Sinf raxbarini belgilash

**O'qituvchi amallar** (Sinf raxbar bo'lsa):
- Davomatni qayd qilish (Ha/Yo'q)
- Absent qilgan talabaga coin qo'shib bo'lmaydi

## 💰 Coin (Ball) Tizimi

### Coin berish
1. O'qituvchi sinf sahifasidan ko'radi
2. O'quvchi nomining yonidagi inputga coin miqdorini kiritar (masalan: +5, -2)
3. Enter tugmasini bosad yoki "Qo'shish" tugmasini bosadi
4. Coin reytig jadvaliga qo'shiladi

### Davomatning ta'siri
- Davomatni "Yo'q" qilib belgilanib qo'yilgan o'quvchiga coin qo'shib bo'lmaydi
- Sinf raxbari (belgilangan o'qituvchi) bu amallarni bajara oladi

### Reyting hisoblash
- **Kunlik**: Bugun qayd qilingan coinlar
- **Oylik**: Bu oy davomidagi coinlar
- **Yillik**: Bu yil davomidagi coinlar

## 🔐 Xavfsizlik Eslatmalari

- ⚠️ Login/parol localStorage'da saqlanmaydi (DevTools'dan ko'rish mumkin)
- ⚠️ Session token yoxud JWT ishlatilmaydi
- ⚠️ Production uchun HTTPS va proper authentication kerak
- ⚠️ Hozircha demo/educational maqsadda ishlatiladi
- ⚠️ Admin akkauntni xavfsiz saqlang (ToHa_012)

## 🐛 Umumiy Masalalar va Yechimlar

### Port 8000 band?
```powershell
# Boshqa port ishlatish
python -m http.server 8080
# Keyin brauzerda: http://localhost:8080
```

### Ma'lumotlar o'chib ketdi?
```javascript
// DevTools konsolida (F12):
localStorage.removeItem('maktabData_v1'); location.reload();
```

### Server ishlamayotgan?
1. Python o'rnatilganmi: `python --version`
2. Node.js o'rnatilganmi: `node --version`
3. Port 8000 bo'sh ekanini: `netstat -ano | findstr :8000`
4. Maktab papkasida ekanini tekshiring

### Login ishlamayotgan?
- **Login maydoni bo'sh bo'lmasin**
- **Parol sahrif sensitiv** (Aa o'zgaradi)
- **Bu akkauntlar mavjud ekanini tekshiring** (Admin, Direktor, O'qituvchi)

### Forma submit bo'lmayotgan?
- Barcha maydonlar to'ldirilinganmi?
- Browser konsolida hato bor mi? (F12 > Console)
- Script.js yuklandi mi? (F12 > Network)

## 📝 Fayllarning Tafsiri

| Fayl | Hajmi | Maqsad |
|------|-------|---------|
| index.html | ~1100 qator | HTML struktura (barcha panellar) |
| style.css | ~1000 qator | Responsive CSS styling |
| script.js | ~1200 qator | Frontend logikasi (events, data management) |
| server.js | ~100 qator | Optional Node.js server |
| data.json | ~200 qator | Ilk ma'lumotlar va example data |
| package.json | ~20 qator | NPM metadata |

## 🎨 Dizayn va Stil

- **Rang Sxemasi**: Modern tog'ri ura (purple #667eea, blue #764fa2, green #27ae60)
- **Shrift**: Segoe UI, system fonts
- **Ikonlar**: Unicode emojis (👨‍💼, 👨‍🏫, etc)
- **Layout**: 
  - **Desktop**: Sidebar + Main Content
  - **Tablet**: Responsive grid
  - **Mobil**: Single column, hidden sidebar
- **Animatsiyalar**: Smooth transitions va fades

## 📱 Responsive Breakpoints

```css
/* Desktop */
@media (min-width: 1024px) { ... }

/* Tablet */
@media (768px <= width < 1024px) { ... }

/* Mobile */
@media (max-width: 767px) { ... }
```

## 🔍 Asosiy Funksiyalar va Algorithms

### 1. Autentifikatsiya
```
Login form submit → 
  Check admin (ToHa_012/tox1c___) →
  Check directors (database) →
  Check teachers (database) →
  Set currentUser → 
  Show appropriate panel
```

### 2. CRUD Operatsiyalari
```
Add: Form submit → Validate → Create ID → Add to array → Save → Update UI
Read: Get from localStorage/database → Render tables
Update: Find by ID → Modify → Save → Update UI
Delete: Confirm → Remove from array → Clean references → Save → Update UI
```

### 3. Reyting Kalkulyatsiyasi
```
Get coin history → Filter by period (day/month/year) → Sum by student → Sort → Render
```

### 4. Session Management
```
Load: Check localStorage currentUser → If exists, show panel → Else show login
Save: After each change, save to localStorage + PUT to server (if available)
Logout: Clear currentUser → Show login screen
```

## 🌐 API Endpoints (Agar server ishlamoqda)

| Method | Endpoint | Tafsif |
|--------|----------|---------|
| GET | `/api/data` | Barcha ma'lumotlarni olish |
| PUT | `/api/data` | Ma'lumotlarni yangilash |
| GET | `/` | HTML sahifasini olish |
| GET | `/*` | Static fayllarni olish (CSS, JS) |

## 📞 Yordam va Batafsil

Agar muammo bo'lsa:
1. **DevTools konsolida xatolarni tekshiring** (F12 > Console)
2. **Network tabida so'rovlarni tekshiring** (F12 > Network)
3. **data.json fayli to'g'ri formatda ekanini tekshiring**
4. **Brauzer cache'ni o'chirib ko'ring** (Ctrl+Shift+Delete)
5. **Localhost:8000 sayt ochildimi tekshiring**

## 🚀 Keyingi Qo'shilishi Mumkin Bo'lgan Xususiyatlar

- [ ] Database integratsiyasi (SQL/MongoDB)
- [ ] Real-time notifications (WebSocket)
- [ ] Email bildirishnomasi
- [ ] Mobile app (React Native/Flutter)
- [ ] Advanced reporting va analytics
- [ ] 2FA (Two-Factor Authentication)
- [ ] Backup va restore
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Advanced permission system

## 📄 Litsenziya

Educational/Development maqsadida yaratilgan.

---

**Yaratilgan sana**: November 30, 2025  
**Versiya**: 1.0  
**Status**: ✅ Fully Functional  
**Support**: Educational purpose - bugungi tizimi tekshirish uchun
