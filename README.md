# Maktab Tizimi — Production Deployment

**Website**: https://maktabcointizimi.uz

Professional school management system (maktab boshqaruv tizimi) built with vanilla HTML, CSS, and JavaScript.

## 🚀 Production Setup

The application is hosted at **https://maktabcointizimi.uz** with the following infrastructure:

### Frontend
- Static HTML/CSS/JavaScript site
- All data persisted in browser `localStorage` (key: `maktabData_v1`)
- Optional server-side sync to database via `/api/data` endpoint

### Backend API Endpoints
- `GET https://maktabcointizimi.uz/api/data` — Fetch school data
- `PUT https://maktabcointizimi.uz/api/data` — Update school data
- Both endpoints require proper CORS and authentication headers

## 📋 Features

✅ **Multi-role system**: Admin, Director, Teacher
✅ **Student management**: Add/edit/delete students, track coins
✅ **Class management**: Create classes, assign teachers and students  
✅ **Attendance tracking**: Record and view student attendance
✅ **Ranking system**: Real-time coin-based rankings
✅ **Director expiry**: Schools have configurable operation periods
✅ **Responsive design**: Works on desktop and mobile
✅ **Uzbek interface**: Complete UI in Uzbek language

## 🔐 Default Test Account (Development Only)

⚠️ **Remove before production**: Remove all test credentials after initial setup

- **Login**: ToHa_012 (can be deleted)
- **Password**: tox1c___ (can be deleted)

## 💾 Data Storage

### Frontend (Browser)
```javascript
localStorage.getItem('maktabData_v1')  // Returns JSON object with all school data
```

### Backend (Server)
```
https://maktabcointizimi.uz/api/data
```

### Reset Data (Development)
Open DevTools Console and run:
```javascript
localStorage.removeItem('maktabData_v1'); location.reload();
```

## 📂 File Structure

```
.
├── index.html          # Main application (1277 lines)
├── script.js           # Business logic & events (1377 lines)
├── style.css           # Professional styling (301 lines)
├── data.json           # Static data + examples
├── server.js           # Optional Node.js backend
├── start-server.ps1    # PowerShell HTTP server
└── start-server.bat    # Windows batch HTTP server
```

## 🛠️ Local Development

If running locally (not recommended for production):

### Option 1: Node.js Server (Recommended)
```powershell
Set-Location 'C:\path\to\maktab'
node server.js
```
Open: http://localhost:8000

### Option 2: PowerShell Server
```powershell
powershell -ExecutionPolicy Bypass -File "start-server.ps1"
```
Open: http://localhost:8000

### Option 3: Python Server
```powershell
Set-Location 'C:\path\to\maktab'
python -m http.server 8000
```
Open: http://localhost:8000

## 🔄 Deployment to maktabcointizimi.uz

### Prerequisites
- Node.js 14+ (for server.js)
- SSL certificate (HTTPS required)
- Database or file storage for /api/data endpoint

### Steps
1. Copy all files to server
2. Install dependencies: `npm install`
3. Configure environment variables for production
4. Set up HTTPS/SSL certificate
5. Run: `npm start` or `node server.js`
6. Verify API endpoints work
7. Test login and data persistence

### Production Checklist
- [ ] HTTPS enabled
- [ ] API endpoint configured
- [ ] Test credentials removed
- [ ] Database backup configured
- [ ] Error logging enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Database migrations run

## 📱 Supported Browsers
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📞 Support
For issues or questions about the Maktab Tizimi system, contact: support@maktabcointizimi.uz

---

**Last Updated**: November 30, 2025
