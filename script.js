const SESSION_KEY = 'maktabSession_v1';
const STORAGE_KEY = 'maktabData_v1';

const defaultData = {
    directors: [
        { username: 'ToHa_012', password: 'tox1c___', school: 'Test Maktab' }
    ],
    teachers: [],
    students: [],
    classes: [],
    classTeachers: {},
    classStudents: {},
    studentCoins: {},
    schoolImages: {},
    classImages: {},
    classHomeroom: {},
    attendance: {},
    coinHistory: [],
    schoolExpiry: {},
    schoolStats: {},
    userActivity: []
};

let systemData = {};
let currentUser = null;
let currentClass = null;

// Return a local image for a given key (school name or class name).
function getImageFor(key) {
    // Prefer explicit mapping in systemData if present
    try {
        if (systemData && systemData.schoolImages && systemData.schoolImages[key]) return systemData.schoolImages[key];
    } catch (e) {}
    // If no explicit image, try Unsplash source with a query for the school name (remote, free-to-use thumbnails)
    if (!key || typeof key !== 'string') return 'images/school1.svg';
    const query = encodeURIComponent(key + ' school building');
    return `https://source.unsplash.com/600x300/?${query}`;
}

// Attendance helpers
function getWeekStartISO(d) {
    const date = new Date(d || Date.now());
    // set to Monday
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
    return monday.toISOString().slice(0,10);
}

function ensureAttendanceForClass(classId) {
    if (!systemData.attendance) systemData.attendance = {};
    const week = getWeekStartISO();
    if (!systemData.attendance[classId] || systemData.attendance[classId].weekOf !== week) {
        systemData.attendance[classId] = { weekOf: week, records: {} };
        saveData();
    }
    return systemData.attendance[classId];
}

function markAttendance(studentId, present) {
    if (!currentClass) return;
    const att = ensureAttendanceForClass(currentClass);
    att.records[studentId] = !!present;
    saveData();
    updateClassStudentsTable();
}

function getAttendanceStatus(classId, studentId) {
    if (!systemData.attendance || !systemData.attendance[classId]) return null;
    const rec = systemData.attendance[classId].records || {};
    if (rec.hasOwnProperty(studentId)) return rec[studentId];
    return null;
}

function saveSession() {
    // Session persistence disabled: do not store any credentials in localStorage
    // Return true to avoid spamming alerts about failed saves.
    return true;
}

function loadSession() {
    // Session persistence disabled: always start as logged-out.
    return null;
}

function clearSession() {
    // No-op for localStorage; clear in-memory user state.
    currentUser = null;
}

function saveData() {
    try {
        const dataStr = JSON.stringify(systemData);
        localStorage.setItem(STORAGE_KEY, dataStr);
        console.log('[saveData] Successfully saved', systemData.directors.length, 'directors to localStorage');
    } catch (err) {
        console.error('[saveData] Save failed', err);
    }
    try {
        if (typeof fetch === 'function') {
            fetch('https://maktabcointizimi.uz/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(systemData)
            }).catch(() => {});
        }
    } catch (e) {}
}

// Record coin transactions with timestamp for ranking calculations
function recordCoinTransaction(studentId, amount) {
    if (!systemData.coinHistory) systemData.coinHistory = [];
    const student = (systemData.students || []).find(s => s.id === studentId);
    const classId = student?.classId || null;
    systemData.coinHistory.push({ id: Date.now() + Math.floor(Math.random()*1000), studentId, amount, ts: new Date().toISOString(), classId });
    // keep history reasonably bounded (optional): keep last 10000 entries
    if (systemData.coinHistory.length > 20000) systemData.coinHistory.splice(0, systemData.coinHistory.length - 20000);
}

// Period helpers for ranking: 'day', 'month', 'year'
function getPeriodRange(period) {
    const now = new Date();
    let start, end;
    if (period === 'day') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
        end = new Date(start); end.setDate(start.getDate() + 1);
    } else if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    } else { // year
        start = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
        end = new Date(start.getFullYear() + 1, 0, 1);
    }
    return { start: start.toISOString(), end: end.toISOString() };
}

function getRankingForClass(classId, period) {
    const range = getPeriodRange(period);
    const history = systemData.coinHistory || [];
    const studentIds = systemData.classStudents[classId] || [];
    const totals = {};
    history.forEach(h => {
        if (!h || !h.ts) return;
        if (h.ts < range.start || h.ts >= range.end) return;
        if (!studentIds.includes(h.studentId)) return;
        totals[h.studentId] = (totals[h.studentId] || 0) + (h.amount || 0);
    });
    // convert to array
    const arr = Object.keys(totals).map(sid => ({ studentId: parseInt(sid,10), total: totals[sid] }));
    // include zero-entries? We'll include students with zero only if there is no history entries
    if (arr.length === 0) {
        // produce list with current totals (0) for each student for visibility
        return (studentIds || []).map(sid => ({ studentId: sid, total: 0 }));
    }
    arr.sort((a,b) => b.total - a.total);
    return arr;
}

function renderClassRanking(period) {
    if (!currentClass) return;
    const tbody = document.getElementById('classRankingTableBody');
    if (!tbody) return;
    const ranking = getRankingForClass(currentClass, period || document.getElementById('classRankingPeriod')?.value || 'day');
    tbody.innerHTML = '';
    ranking.forEach((r, i) => {
        const student = (systemData.students || []).find(s => s.id === r.studentId) || { name: 'N/A', surname: '' };
        tbody.innerHTML += `<tr><td>${i+1}</td><td>${student.name} ${student.surname}</td><td>${r.total}</td></tr>`;
    });
}

function getRankingForSchool(school, period) {
    const range = getPeriodRange(period);
    const history = systemData.coinHistory || [];
    const classes = (systemData.classes || []).filter(c => c.school === school);
    const classIds = classes.map(c => c.id);
    const totals = {};
    history.forEach(h => {
        if (!h || !h.ts) return;
        if (h.ts < range.start || h.ts >= range.end) return;
        // include only if classId matches
        if (!classIds.includes(h.classId)) return;
        totals[h.studentId] = (totals[h.studentId] || 0) + (h.amount || 0);
    });
    const arr = Object.keys(totals).map(sid => ({ studentId: parseInt(sid,10), total: totals[sid] }));
    arr.sort((a,b) => b.total - a.total);
    return arr;
}

function renderDirectorRanking(period) {
    if (!currentUser || currentUser.role !== 'director') return;
    const tbody = document.getElementById('directorRankingTableBody');
    if (!tbody) return;
    const school = currentUser.school;
    const ranking = getRankingForSchool(school, period || document.getElementById('directorRankingPeriod')?.value || 'day');
    tbody.innerHTML = '';
    ranking.forEach((r, i) => {
        const student = (systemData.students || []).find(s => s.id === r.studentId) || { name: 'N/A', surname: '', classId: null };
        const cls = (systemData.classes || []).find(c => c.id === student.classId) || { name: 'N/A' };
        tbody.innerHTML += `<tr><td>${i+1}</td><td>${student.name} ${student.surname}</td><td>${cls.name}</td><td>${r.total}</td></tr>`;
    });
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            systemData = JSON.parse(raw);
            console.log('[loadData] Loaded from localStorage:', systemData.directors.length, 'directors');
        } else {
            systemData = JSON.parse(JSON.stringify(defaultData));
            console.log('[loadData] No localStorage data, using defaults');
            saveData();
            (async () => {
                try {
                    const apiResp = await fetch('https://maktabcointizimi.uz/api/data');
                    if (apiResp && apiResp.ok) {
                        const d = await apiResp.json();
                        if (d && Object.keys(d).length) {
                            systemData = d;
                            console.log('[loadData] Loaded from API');
                            saveData();
                            updateAllViews();
                            return;
                        }
                    }
                } catch (e) {}

                try {
                    const staticResp = await fetch('./data.json');
                    if (staticResp && staticResp.ok) {
                        const d2 = await staticResp.json();
                        if (d2) {
                            systemData = d2;
                            console.log('[loadData] Loaded from data.json');
                            saveData();
                            updateAllViews();
                        }
                    }
                } catch (e) {}
            })();
        }
    } catch (err) {
        console.error('[loadData] Load failed', err);
        systemData = JSON.parse(JSON.stringify(defaultData));
    }
}

function updateAllViews() {
    console.log('[updateAllViews] Starting - systemData has', systemData.directors?.length || 0, 'directors');
    try { updateTeachersTable(); } catch(e) { console.error('updateTeachersTable error:', e); }
    try { updateStudentsTable(); } catch(e) { console.error('updateStudentsTable error:', e); }
    try { updateClassesGrid(); } catch(e) { console.error('updateClassesGrid error:', e); }
    try { updateDirectorDashboard(); } catch(e) { console.error('updateDirectorDashboard error:', e); }
    try { updateAllClassesTable(); } catch(e) { console.error('updateAllClassesTable error:', e); }
    try { updateAllDirectorsTable(); } catch(e) { console.error('updateAllDirectorsTable error:', e); }
    try { updateExistingDirectorsList(); } catch(e) { console.error('updateExistingDirectorsList error:', e); }
    try { updateSchoolSelect(); } catch(e) { console.error('updateSchoolSelect error:', e); }
    console.log('[updateAllViews] Complete');
}

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    

    // Check admin
    if (username === 'ToHa_012' && password === 'tox1c___') {
        currentUser = { role: 'admin', username: username };
        // Switch to admin panel
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminPanel').classList.add('active');
        showAdminDashboard();
        return;
    }

    const director = (systemData.directors || []).find(d => d.username === username && d.password === password);
    if (director) {
        // Check school expiry
        const school = director.school;
        const active = isSchoolActive(school);
        if (!active) {
            alert('Maktab off holatga otgan. Tolov qilinganidan song kiring.');
            return;
        }
        currentUser = { role: 'director', username: username, school: director.school };
        // Switch to director panel
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('directorPanel').classList.add('active');
        showDashboard();
        showDirectorPaymentReminder(school);
        return;
    }
    const teacher = (systemData.teachers || []).find(t => t.login === username && t.password === password);
    if (teacher) {
        // Resolve teacher's school: prefer stored field, else infer from class assignments
        let teacherSchool = teacher.school;
        if (!teacherSchool) {
            // find any class where this teacher is assigned
            const cls = (systemData.classes || []).find(c => (systemData.classTeachers[c.id] || []).some(ct => ct.id === teacher.id));
            if (cls) teacherSchool = cls.school;
            if (teacherSchool) teacher.school = teacherSchool; // cache it
        }
        if (teacherSchool) {
            if (!isSchoolActive(teacherSchool)) {
                alert('Sizning maktabingiz off holatga otgan. Tolov qilinganidan song kiring.');
                return;
            }
        }
        currentUser = { role: 'teacher', username: username, teacherId: teacher.id, teacherName: teacher.name };
        // Switch to teacher panel
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('teacherPanel').classList.add('active');
        showTeacherDashboard();
        return;
    }
    document.getElementById('loginError').textContent = 'Login yoki parol notogrri!';
    try { alert('Login yoki parol notogrri!'); } catch(e) {}
});

function togglePasswordVisibility() {
    const input = document.getElementById('password');
    const button = document.querySelector('.toggle-password');
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

// Toggle forms
function toggleAddTeacherForm() { document.getElementById('addTeacherForm').classList.toggle('hidden'); }
function toggleAddStudentForm() { document.getElementById('addStudentForm').classList.toggle('hidden'); }
function toggleAddTeacherToClassForm() { document.getElementById('addTeacherToClassForm').classList.toggle('hidden'); }
document.getElementById('teacherForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const login = document.getElementById('teacherLogin').value;
    const password = document.getElementById('teacherPassword').value;
    if ((systemData.teachers || []).some(t => t.login === login && t.password === password)) {
        alert('Bunday login/parol mavjud!');
        return;
    }
    systemData.teachers.push({
        id: Date.now(),
        name: document.getElementById('teacherName').value,
        surname: document.getElementById('teacherSurname').value,
        father: document.getElementById('teacherFather').value,
        subject: document.getElementById('subject').value,
        login: login,
        password: password
    });
    saveData();
    updateTeachersTable();
    toggleAddTeacherForm();
    e.target.reset();
    updateDirectorDashboard();
});

// Class form
document.getElementById('classForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const className = document.getElementById('className').value;
    const fileInput = document.getElementById('classImageInput');
    const newClass = {
        id: Date.now(),
        name: className,
        school: currentUser?.school || 'Test Maktab'
    };

    const finalize = (imgDataUrl) => {
        systemData.classes.push(newClass);
        systemData.classTeachers[newClass.id] = [];
        systemData.classStudents[newClass.id] = [];
        if (imgDataUrl) {
            if (!systemData.classImages) systemData.classImages = {};
            systemData.classImages[newClass.id] = imgDataUrl;
        }
        saveData();
        document.getElementById('classForm').reset();
        updateClassesGrid();
        updateDirectorDashboard();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
        const f = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(ev) {
            finalize(ev.target.result);
        };
        reader.readAsDataURL(f);
    } else {
        finalize(null);
    }
});

// Student form
document.getElementById('studentForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const student = {
        id: Date.now(),
        name: document.getElementById('studentName').value,
        surname: document.getElementById('studentSurname').value,
        father: document.getElementById('studentFather').value,
        classId: currentClass
    };
    systemData.students.push(student);
    if (!systemData.classStudents[currentClass]) systemData.classStudents[currentClass] = [];
    systemData.classStudents[currentClass].push(student.id);
    systemData.studentCoins[student.id] = 0;
    saveData();
    updateClassStudentsTable();
    updateStudentsTable();
    toggleAddStudentForm();
    e.target.reset();
    updateDirectorDashboard();
});

// Teacher to class form
document.getElementById('teacherToClassForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const teacher = (systemData.teachers || []).find(t => 
        t.login === document.getElementById('classTeacherLogin').value && 
        t.password === document.getElementById('classTeacherPassword').value
    );
    if (!teacher) { alert('O\'qituvchi topilmadi!'); return; }
    if (!systemData.classTeachers[currentClass]) systemData.classTeachers[currentClass] = [];
    // assign teacher to class if not already
    if (!systemData.classTeachers[currentClass].find(t => t.id === teacher.id)) {
        systemData.classTeachers[currentClass].push({
            id: teacher.id, name: teacher.name, surname: teacher.surname,
            father: teacher.father, subject: teacher.subject
        });
    }
    // ensure teacher has school set for login-block checks
    try {
        const cls = (systemData.classes || []).find(c => c.id === currentClass);
        if (cls) teacher.school = cls.school;
    } catch(e) {}
    saveData();
    updateClassTeachersTable();
    toggleAddTeacherToClassForm();
    e.target.reset();
});

function setupAddDirectorFormListener() {
    const addDirectorFormEl = document.getElementById('addDirectorForm');
    console.log('[Director Form] setupAddDirectorFormListener called. Form element:', addDirectorFormEl);
    if (!addDirectorFormEl) {
        console.error('[Director Form] Form element not found!');
        return;
    }
    addDirectorFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('[Director Form] Form submit event triggered');
        
        const schoolName = (document.getElementById('schoolName')?.value || '').trim();
        const directorLogin = (document.getElementById('directorLogin')?.value || '').trim();
        const directorPassword = document.getElementById('directorPassword')?.value || '';
        const expiryDaysInput = document.getElementById('directorExpiryDays')?.value || '';
        
        console.log('[Director Form] Input values:', { schoolName, directorLogin, expiryDaysInput });
        
        document.getElementById('addDirectorSuccessMessage').style.display = 'none';
        document.getElementById('addDirectorErrorMessage').style.display = 'none';
        
        if (!schoolName) {
            console.log('[Director Form] Validation failed: empty school name');
            showDirectorError('🏫 XATO: Maktab nomini kiriting!');
            return;
        }
        if (schoolName.length < 2) {
            showDirectorError('🏫 XATO: Maktab nomi 2 ta belgidan ko\'p bo\'lishi kerak!');
            return;
        }
        
        if (!directorLogin) {
            showDirectorError('🔑 XATO: Direktor loginini kiriting!');
            return;
        }
        if (directorLogin.length < 3) {
            showDirectorError('🔑 XATO: Login 3 ta belgidan ko\'p bo\'lishi kerak!');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(directorLogin)) {
            showDirectorError('🔑 XATO: Login faqat harflar, raqamlar va underscore (_) bilan bo\'lishi kerak!');
            return;
        }
        
        if ((systemData.directors || []).some(d => d.username === directorLogin)) {
            showDirectorError('🔑 XATO: Bu login allaqachon mavjud! Boshqa login kiriting.');
            return;
        }
        
        if (!directorPassword) {
            showDirectorError('🔐 XATO: Direktor parolini kiriting!');
            return;
        }
        const passwordStrength = validatePassword(directorPassword);
        if (!passwordStrength.valid) {
            showDirectorError(`🔐 XATO: Parol xavfsizlik taleblarini bajarishi kerak!\n• ${passwordStrength.errors.join('\n• ')}`);
            return;
        }
        
        const expiryDays = parseInt(expiryDaysInput, 10);
        if (isNaN(expiryDays) || expiryDays < 1) {
            showDirectorError('📅 XATO: Amal bajarish muddatini kunlarda kiriting (minimal 1 kun)!');
            return;
        }
        if (expiryDays > 3650) {
            showDirectorError('📅 XATO: Maksimal 10 yil (3650 kun) bilan kiriting!');
            return;
        }
        
        try {
            console.log('[Director Form] All validations passed. Adding director...');
            if (!systemData.directors) systemData.directors = [];
            if (!systemData.schoolExpiry) systemData.schoolExpiry = {};
            
            const newDirector = { 
                username: directorLogin, 
                password: directorPassword, 
                school: schoolName,
                created: new Date().toISOString()
            };
            systemData.directors.push(newDirector);
            console.log('[Director Form] Director added:', newDirector);
            console.log('[Director Form] Total directors now:', systemData.directors.length);
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + expiryDays);
            const expiryIso = expiryDate.toISOString().slice(0,10);
            systemData.schoolExpiry[schoolName] = expiryIso;
            console.log('[Director Form] Expiry set for', schoolName, ':', expiryIso);
            
            saveData();
            console.log('[Director Form] Data saved to localStorage');
            
            document.getElementById('successLogin').textContent = directorLogin;
            document.getElementById('successSchool').textContent = schoolName;
            document.getElementById('successDays').textContent = expiryDays;
            document.getElementById('addDirectorSuccessMessage').style.display = 'block';
            document.getElementById('addDirectorSuccessMessage').scrollIntoView({ behavior: 'smooth' });
            console.log('[Director Form] Success message displayed');
            
            e.target.reset();
            
            console.log('[Director Form] Updating tables...');
            try { updateAllDirectorsTable(); console.log('[Director Form] updateAllDirectorsTable done'); } catch(err) { console.error('updateAllDirectorsTable error:', err); }
            try { updateExistingDirectorsList(); console.log('[Director Form] updateExistingDirectorsList done'); } catch(err) { console.error('updateExistingDirectorsList error:', err); }
            try { updateAdminDashboard(); console.log('[Director Form] updateAdminDashboard done'); } catch(err) { console.error('updateAdminDashboard error:', err); }
            try { updateAdminSchoolsList(); console.log('[Director Form] updateAdminSchoolsList done'); } catch(err) { console.error('updateAdminSchoolsList error:', err); }
            
            console.log('[Director Form] All operations complete. systemData:', systemData);
            
        } catch (err) {
            console.error('[Director Form] Add director error:', err);
            showDirectorError('Tizim xatosi: ' + (err.message || 'Noma\'lum xato'));
        }
    });
}


function showDirectorError(message) {
    const errorDiv = document.getElementById('addDirectorErrorMessage');
    const errorText = document.getElementById('addDirectorErrorText');
    if (errorDiv && errorText) {
        errorText.innerHTML = message.replace(/\n/g, '<br>');
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

function showDirectorSuccess(directorLogin, schoolName, expiryDays) {
    document.getElementById('successLogin').textContent = directorLogin;
    document.getElementById('successSchool').textContent = schoolName;
    document.getElementById('successDays').textContent = expiryDays;
    document.getElementById('addDirectorSuccessMessage').style.display = 'block';
    document.getElementById('addDirectorSuccessMessage').scrollIntoView({ behavior: 'smooth' });
}

// Password validation helper
function validatePassword(password) {
    const errors = [];
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[@_#$%\-]/.test(password);
    const hasMinLength = password.length >= 8;
    
    if (!hasUppercase) errors.push('Katta harf (A-Z) bo\'lishi kerak');
    if (!hasLowercase) errors.push('Kichik harf (a-z) bo\'lishi kerak');
    if (!hasNumber) errors.push('Raqam (0-9) bo\'lishi kerak');
    if (!hasSpecial) errors.push('Belgi (@_#$%-) bo\'lishi kerak');
    if (!hasMinLength) errors.push('Minimal 8 ta belgi bo\'lishi kerak');
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Update existing directors list
function updateExistingDirectorsList() {
    const listDiv = document.getElementById('existingDirectorsList');
    if (!listDiv) return;
    
    const directors = systemData.directors || [];
    
    if (directors.length === 0) {
        listDiv.innerHTML = `<p style="color:var(--muted);text-align:center;padding:12px;font-style:italic;">
            Hozircha direktor yo'q - birinchisini siz qo'shasiz! 🎉
        </p>`;
        return;
    }
    
    let html = '<table class="data-table" style="width:100%;font-size:14px;">';
    html += '<thead><tr><th>№</th><th>🏫 Maktab</th><th>🔑 Login</th></tr></thead><tbody>';
    
    directors.forEach((dir, idx) => {
        html += `<tr>
            <td>${idx + 1}</td>
            <td>${dir.school || '-'}</td>
            <td><code style="background:#f0f0f0;padding:4px 8px;border-radius:4px;font-family:monospace;font-size:12px;">${dir.username}</code></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    listDiv.innerHTML = html;
}

// Director: handle school image upload
document.getElementById('schoolImageForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('directorSchoolImageInput');
    if (!input || !input.files || !input.files[0]) {
        alert('Iltimos fayl tanlang');
        return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(ev) {
        const dataUrl = ev.target.result;
        const school = currentUser?.school;
        if (!school) {
            alert('Siz direktor sifatida tizimga kiring');
            return;
        }
        if (!systemData.schoolImages) systemData.schoolImages = {};
        systemData.schoolImages[school] = dataUrl;
        saveData();
        alert('Maktab rasmi saqlandi');
        try { updateClassesGrid(); } catch(_) {}
    };
    reader.readAsDataURL(file);
});

// Navigation functions
function showDashboard() {
    updateActiveNav(0, 'directorPanel');
    updateDirectorDashboard();
}

function showTeachers() {
    updateActiveNav(1, 'directorPanel');
    updateTeachersTable();
}

function showStudents() {
    updateActiveNav(2, 'directorPanel');
    updateStudentsTable();
}

function showClasses() {
    updateActiveNav(3, 'directorPanel');
    updateClassesGrid();
}

function showAdminDashboard() {
    updateActiveNav(0, 'adminPanel');
    updateAdminDashboard();
}

function showTeacherDashboard() {
    updateActiveNav(0, 'teacherPanel');
    updateTeacherDashboard();
}

function showTeacherClasses() {
    updateActiveNav(1, 'teacherPanel');
    updateTeacherClassesGrid();
}

function showAllClasses() {
    // Preserve compatibility: show schools list instead of flat classes
    showAdminSchoolsList();
}

function showAdminSchoolsList() {
    updateActiveNav(1, 'adminPanel');
    updateAdminSchoolsList();
}

function showAllDirectors() {
    updateActiveNav(2, 'adminPanel');
    updateAllDirectorsTable();
}

function showAddDirector() {
    updateActiveNav(3, 'adminPanel');
    updateExistingDirectorsList();
}

function updateAdminSchoolsList() {
    const container = document.getElementById('schoolsList');
    const classes = systemData.classes || [];
    const schools = [...new Set(classes.map(c => c.school))];
    // Add schools from directors even if they don't have classes yet
    const schoolsFromDirectors = [...new Set((systemData.directors || []).map(d => d.school))];
    const allSchools = [...new Set([...schools, ...schoolsFromDirectors])];
    
    container.innerHTML = '';
    if (allSchools.length === 0) {
        container.innerHTML = '<div class="no-data-message">Hozircha maktablar yo\'q.</div>';
        document.getElementById('schoolClassesContainer').style.display = 'none';
    } else {
        allSchools.forEach((school) => {
            const schoolClasses = classes.filter(c => c.school === school);
            const totalStudents = schoolClasses.reduce((acc, cls) => acc + ((systemData.classStudents[cls.id] || []).length), 0);
            // Prefer curated local SVGs (fast and offline-friendly). Use getImageFor helper.
            const imgUrl = getImageFor(school) || `https://source.unsplash.com/featured/?school,${encodeURIComponent(school)}`;
            const html = `
                <div class="class-card school-card" role="button" tabindex="0" style="cursor:pointer" onclick="showSchoolClasses('${escapeHtml(school)}')">
                    <div class="school-hero" style="background-image:url('${imgUrl}')"></div>
                    <div style="padding:8px 0 0">
                      <h3 style="margin-bottom:6px">${escapeHtml(school)}</h3>
                      <p style="color:var(--muted);font-size:13px;margin:0">Sinflar: ${schoolClasses.length} · O'quvchilar: ${totalStudents}</p>
                    </div>
                </div>`;
            container.innerHTML += html;
        });
    }
    document.getElementById('schoolClassesContainer').style.display = 'none';
    try { updateAdminSchoolsTable(); } catch(e) {}
}

// Check whether a school is currently active (not expired). If no expiry set, treat as active.
function isSchoolActive(school) {
    if (!systemData.schoolExpiry) return true;
    const iso = systemData.schoolExpiry[school];
    if (!iso) return true;
    const today = new Date().toISOString().slice(0,10);
    return iso >= today;
}

function daysUntilExpiry(school) {
    if (!systemData.schoolExpiry) return Infinity;
    const iso = systemData.schoolExpiry[school];
    if (!iso) return Infinity;
    const exp = new Date(iso + 'T23:59:59Z');
    const today = new Date();
    const diff = Math.ceil((exp - today) / (1000*60*60*24));
    return diff;
}

// Extend or set expiry for a school by adding given days. If currently active, extend from current expiry; else set from today.
function extendSchoolDays(school, days) {
    if (!systemData.schoolExpiry) systemData.schoolExpiry = {};
    const currentIso = systemData.schoolExpiry[school];
    let base = new Date();
    if (currentIso) {
        const curDate = new Date(currentIso + 'T23:59:59Z');
        if (curDate > new Date()) base = curDate;
    }
    base.setDate(base.getDate() + Number(days));
    const newIso = base.toISOString().slice(0,10);
    systemData.schoolExpiry[school] = newIso;
    saveData();
    updateAdminSchoolsTable();
}

function updateAdminSchoolsTable() {
    const tbody = document.getElementById('adminSchoolsTableBody');
    if (!tbody) return;
    const schoolsFromClasses = (systemData.classes || []).map(c => c.school);
    const schoolsFromDirectors = (systemData.directors || []).map(d => d.school);
    const schools = [...new Set([...schoolsFromClasses, ...schoolsFromDirectors])];
    tbody.innerHTML = '';
    schools.forEach((school, i) => {
        const director = (systemData.directors || []).find(d => d.school === school);
        const directorName = director ? director.username : '-';
        const expiry = systemData.schoolExpiry?.[school] || '-';
        const active = isSchoolActive(school);
        const status = active ? '<span style="color:green">On</span>' : '<span style="color:red">Off</span>';
        const inputId = `add-days-${i}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-primary';
        btn.textContent = 'Qo\'shish';
        btn.onclick = function() {
            const v = document.getElementById(inputId).value;
            if (!v) {
                alert('Kun sonini kiriting');
                return;
            }
            extendSchoolDays(school, Number(v));
        };
        const input = document.createElement('input');
        input.type = 'number';
        input.id = inputId;
        input.placeholder = 'Kun';
        input.style.cssText = 'width:80px;padding:6px;border-radius:6px;border:1px solid #ddd;margin-right:4px';
        const cell = document.createElement('td');
        cell.appendChild(input);
        cell.appendChild(btn);
        const row = document.createElement('tr');
        row.innerHTML = `<td>${i+1}</td><td>${school}</td><td>${directorName}</td><td>${expiry}</td><td>${status}</td>`;
        row.appendChild(cell);
        // Add delete button in separate cell
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'O\'chirish';
        deleteBtn.style.padding = '6px 10px';
        deleteBtn.style.fontSize = '13px';
        deleteBtn.onclick = function() {
            if (confirm(`"${school}" maktabini o'chiramoqchisiz?`)) {
                deleteSchool(school);
            }
        };
        const deleteCell = document.createElement('td');
        deleteCell.appendChild(deleteBtn);
        row.appendChild(deleteCell);
        tbody.appendChild(row);
    });
}

function showDirectorPaymentReminder(school) {
    const daysLeft = daysUntilExpiry(school);
    if (daysLeft <= 3 && daysLeft !== Infinity) {
        try { alert(`Eslatma: to'lovga ${daysLeft} kun qoldi. Iltimos akkauntingizga to'lov qiling!`); } catch(e) {}
    }
}

function deleteSchool(school) {
    if (!school) return;
    if (!confirm(`\"${school}\" maktabini va unga tegishli barcha ma'lumotlarni o'chiramoqchisiz?`)) return;

    // Collect classes to remove
    const classesToRemove = (systemData.classes || []).filter(c => c.school === school).map(c => c.id);

    // Remove classes
    systemData.classes = (systemData.classes || []).filter(c => c.school !== school);

    // For each class, remove students, classStudents, classTeachers and studentCoins
    classesToRemove.forEach(cid => {
        const studentsInClass = systemData.classStudents?.[cid] || [];
        studentsInClass.forEach(sid => {
            systemData.students = (systemData.students || []).filter(s => s.id !== sid);
            if (systemData.studentCoins && systemData.studentCoins.hasOwnProperty(sid)) delete systemData.studentCoins[sid];
        });
        if (systemData.classStudents && systemData.classStudents.hasOwnProperty(cid)) delete systemData.classStudents[cid];
        if (systemData.classTeachers && systemData.classTeachers.hasOwnProperty(cid)) delete systemData.classTeachers[cid];
        if (systemData.classHomeroom && systemData.classHomeroom.hasOwnProperty(cid)) delete systemData.classHomeroom[cid];
        if (systemData.attendance && systemData.attendance.hasOwnProperty(cid)) delete systemData.attendance[cid];
    });

    // Remove directors associated with this school
    systemData.directors = (systemData.directors || []).filter(d => d.school !== school);
    
    // Remove school expiry date
    if (systemData.schoolExpiry && systemData.schoolExpiry.hasOwnProperty(school)) delete systemData.schoolExpiry[school];
    
    // Remove school images
    if (systemData.schoolImages && systemData.schoolImages.hasOwnProperty(school)) delete systemData.schoolImages[school];

    saveData();
    updateAllViews();
    alert(`${school} maktabi va unga tegishli barcha ma'lumotlar muvaffaqiyatli o'chirildi.`);
}

function showSchoolClasses(school) {
    const title = document.getElementById('schoolClassesTitle');
    const tbody = document.getElementById('schoolClassesTableBody');
    title.textContent = `${school} - sinflar`;
    const classes = (systemData.classes || []).filter(c => c.school === school);
    tbody.innerHTML = '';
    classes.forEach((c, i) => {
        const count = (systemData.classStudents[c.id] || []).length;
        tbody.innerHTML += `<tr><td>${i + 1}</td><td>${c.name}</td><td>${count}</td><td><button class="btn btn-info" onclick="openAdminClassPage(${c.id})">Ochish</button></td></tr>`;
    });
    document.getElementById('schoolClassesContainer').style.display = 'block';
}

// Utility to escape single quotes in generated onclick handlers
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateActiveNav(index, panelId) {
    const navBtns = document.querySelectorAll(`#${panelId} .nav-btn`);
    const sections = document.querySelectorAll(`#${panelId} .content-section`);
    console.log(`updateActiveNav(${index}, ${panelId}): Found ${navBtns.length} buttons, ${sections.length} sections`);
    navBtns.forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
        console.log(`  Button ${i}: active=${i === index}`);
    });
    sections.forEach((sec, i) => {
        sec.classList.toggle('active', i === index);
        console.log(`  Section ${i}: active=${i === index}`);
    });
    // Ensure panel itself is visible
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
}

function openClassPage(classId) {
    currentClass = classId;
    const cls = systemData.classes.find(c => c.id === classId);
    document.getElementById('classPageTitle').textContent = `${cls.name} Sinf Paneli`;
    document.getElementById('classOverviewTitle').textContent = `${cls.name} - Sinf ma'lumotlari`;
    // set page hero image (use school's image if available)
    try {
        const hero = document.getElementById('classHero');
        if (hero) {
            const img = getImageFor(cls.school || cls.name);
            hero.style.backgroundImage = `url('${img}')`;
            hero.classList.remove('fallback');
        }
    } catch (e) {}
    
    // Faqat direktir uchun formalarni koКўrsatamiz
    const btnAddStudent = document.getElementById('btnAddStudent');
    const btnAddTeacher = document.getElementById('btnAddTeacher');
    // homeroom assign UI (director only)
    try {
        const homContainer = document.getElementById('homeroomAssignContainer');
        const homSelect = document.getElementById('homeroomSelect');
        if (currentUser?.role === 'director') {
            homContainer.style.display = 'block';
            homSelect.innerHTML = '';
            const teachers = systemData.teachers || [];
            const option0 = document.createElement('option'); option0.value = ''; option0.textContent = '-- Tanlang --'; homSelect.appendChild(option0);
            teachers.forEach(t => {
                const opt = document.createElement('option'); opt.value = t.id; opt.textContent = `${t.name} ${t.surname} (${t.subject})`; homSelect.appendChild(opt);
            });
            // set current if assigned
            const cur = systemData.classHomeroom?.[classId];
            if (cur) homSelect.value = cur;
        } else {
            homContainer.style.display = 'none';
        }
    } catch (e) {}
    if (currentUser?.role === 'director') {
        btnAddStudent.style.display = 'inline-block';
        btnAddTeacher.style.display = 'inline-block';
    } else {
        btnAddStudent.style.display = 'none';
        btnAddTeacher.style.display = 'none';
    }
    
    document.getElementById('directorPanel').classList.remove('active');
    document.getElementById('classPage').classList.add('active');
    // set week info
    try {
        const weekInfo = document.getElementById('classWeekInfo');
        const week = getWeekStartISO();
        if (weekInfo) weekInfo.textContent = `Hafta boshi: ${week}`;
    } catch (e) {}
    updateClassStudentsTable();
    updateClassTeachersTable();
    try { renderClassRanking(); } catch (e) {}
}

function openTeacherClassPage(classId) {
    currentClass = classId;
    const cls = systemData.classes.find(c => c.id === classId);
    document.getElementById('classPageTitle').textContent = `${cls.name} Sinf Paneli`;
    document.getElementById('classOverviewTitle').textContent = `${cls.name} - Sinf ma'lumotlari`;
    
    // O'qituvchi uchun formalarni yashiramiz
    document.getElementById('btnAddStudent').style.display = 'none';
    document.getElementById('btnAddTeacher').style.display = 'none';
    
    document.getElementById('teacherPanel').classList.remove('active');
    document.getElementById('classPage').classList.add('active');
    // set hero image for class page
    try {
        const hero = document.getElementById('classHero');
        if (hero) {
            const img = getImageFor(cls.school || cls.name);
            hero.style.backgroundImage = `url('${img}')`;
            hero.classList.remove('fallback');
        }
    } catch (e) {}
    // set week info
    try {
        const weekInfo = document.getElementById('classWeekInfo');
        const week = getWeekStartISO();
        if (weekInfo) weekInfo.textContent = `Hafta boshi: ${week}`;
    } catch (e) {}
    updateClassStudentsTable();
    updateClassTeachersTable();
    try { renderClassRanking(); } catch (e) {}
}

function goBackToDirector() {
    currentClass = null;
    document.getElementById('classPage').classList.remove('active');
    if (currentUser?.role === 'teacher') {
        document.getElementById('teacherPanel').classList.add('active');
        showTeacherDashboard();
    } else if (currentUser?.role === 'admin') {
        document.getElementById('adminPanel').classList.add('active');
        showAllClasses();
    } else {
        document.getElementById('directorPanel').classList.add('active');
        showDashboard();
    }
}

function assignHomeroom(classId) {
    const sel = document.getElementById('homeroomSelect');
    if (!sel) return;
    const val = sel.value;
    if (!val) { alert('Iltimos o\'qituvchini tanlang'); return; }
    const teacherId = parseInt(val, 10);
    if (!systemData.classHomeroom) systemData.classHomeroom = {};
    systemData.classHomeroom[classId] = teacherId;
    saveData();
    alert('Sinf raxbar muvaffaqiyatli belgilandi');
    try { updateTeacherDashboard(); } catch(e) {}
    try { updateClassesGrid(); } catch(e) {}
}

function openAdminClassPage(classId) {
    currentClass = classId;
    const cls = systemData.classes.find(c => c.id === classId);
    document.getElementById('classPageTitle').textContent = `${cls.name} Sinf Paneli`;
    document.getElementById('classOverviewTitle').textContent = `${cls.name} - Sinf ma'lumotlari (Maktab: ${cls.school})`;
    
    // Admin uchun formalarni yashiramiz
    document.getElementById('btnAddStudent').style.display = 'none';
    document.getElementById('btnAddTeacher').style.display = 'none';
    
    document.getElementById('adminPanel').classList.remove('active');
    document.getElementById('classPage').classList.add('active');
    // set hero image for class page (admin)
    try {
        const hero = document.getElementById('classHero');
        if (hero) {
            const img = getImageFor(cls.school || cls.name);
            hero.style.backgroundImage = `url('${img}')`;
            hero.classList.remove('fallback');
        }
    } catch (e) {}
    // set week info
    try {
        const weekInfo = document.getElementById('classWeekInfo');
        const week = getWeekStartISO();
        if (weekInfo) weekInfo.textContent = `Hafta boshi: ${week}`;
    } catch (e) {}
    updateClassStudentsTable();
    updateClassTeachersTable();
}

function logout() {
    clearSession();
    currentClass = null;
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginScreen').classList.add('active');
}

// Update functions
function updateDirectorDashboard() {
    const userClasses = systemData.classes.filter(c => c.school === (currentUser?.school || 'Test Maktab'));
    const classIds = userClasses.map(c => c.id);
    const userStudents = systemData.students.filter(s => classIds.includes(s.classId));
    document.getElementById('teacherCount').textContent = systemData.teachers.length;
    document.getElementById('studentCount').textContent = userStudents.length;
    document.getElementById('classCount').textContent = userClasses.length;
    try { renderDirectorRanking(); } catch (e) {}
}

function updateAdminDashboard() {
    // Get schools from both directors and classes
    const schoolsFromClasses = [...new Set((systemData.classes || []).map(c => c.school))];
    const schoolsFromDirectors = [...new Set((systemData.directors || []).map(d => d.school))];
    const allUniqueSchools = [...new Set([...schoolsFromClasses, ...schoolsFromDirectors])];
    
    const allDirectors = (systemData.directors || []);
    const allClasses = (systemData.classes || []);
    const allStudents = (systemData.students || []);
    
    try { document.getElementById('adminSchoolCount').textContent = allUniqueSchools.length; } catch(e) {}
    try { document.getElementById('adminDirectorCount').textContent = allDirectors.length; } catch(e) {}
    try { document.getElementById('adminClassCount').textContent = allClasses.length; } catch(e) {}
    try { document.getElementById('adminStudentCount').textContent = allStudents.length; } catch(e) {}
}

function updateTeacherDashboard() {
    const teacherClasses = systemData.classes.filter(c => 
        systemData.classTeachers[c.id]?.some(t => t.id === currentUser?.teacherId)
    );
    let totalStudents = 0;
    teacherClasses.forEach(cls => {
        totalStudents += (systemData.classStudents[cls.id] || []).length;
    });
    document.getElementById('teacherGreeting').textContent = `Xush kelibsiz, ${currentUser?.teacherName}!`;
    document.getElementById('teacherClassCount').textContent = teacherClasses.length;
    document.getElementById('teacherStudentCount').textContent = totalStudents;
    document.getElementById('teacherReadyCount').textContent = teacherClasses.length;
    // populate homeroom classes
    try {
        const homList = document.getElementById('teacherHomeroomList');
        homList.innerHTML = '';
        const homeroomClasses = (systemData.classes || []).filter(c => (systemData.classHomeroom || {})[c.id] === currentUser?.teacherId);
        if (homeroomClasses.length === 0) {
            homList.innerHTML = '<div class="no-data-message">Siz hozircha hech qanday sinf raxbari emassiz.</div>';
        } else {
            homeroomClasses.forEach(cls => {
                const count = (systemData.classStudents[cls.id] || []).length;
                homList.innerHTML += `<div class="class-card" onclick="openTeacherClassPage(${cls.id})"><div class="school-hero" style="background-image:url('${getImageFor(cls.school)}')"></div><div style="padding:12px"><h3>${cls.name}</h3><p style="color:var(--muted)">O'quvchilar: ${count}</p></div></div>`;
            });
        }
    } catch (e) {}
}

function updateTeacherClassesGrid() {
    const grid = document.getElementById('teacherClassesGrid');
    const noMessage = document.getElementById('teacherNoClassesMessage');
    grid.innerHTML = '';
    
    const teacherClasses = systemData.classes.filter(c => 
        systemData.classTeachers[c.id]?.some(t => t.id === currentUser?.teacherId)
    );
    
    if (teacherClasses.length === 0) {
        noMessage.style.display = 'block';
    } else {
        noMessage.style.display = 'none';
        teacherClasses.forEach(cls => {
            const count = (systemData.classStudents[cls.id] || []).length;
            grid.innerHTML += `<div class="class-card" onclick="openTeacherClassPage(${cls.id})"><h3>${cls.name}</h3><p>O'quvchilar: ${count}</p></div>`;
        });
    }
}

function updateTeachersTable() {
    const tbody = document.getElementById('teachersTableBody');
    tbody.innerHTML = '';
    (systemData.teachers || []).forEach((t, i) => {
        tbody.innerHTML += `<tr><td>${i + 1}</td><td>${t.name} ${t.surname} ${t.father}</td><td>${t.subject}</td><td><code>${t.login}</code></td><td><code>${t.password}</code></td><td><button class="btn btn-danger" onclick="deleteTeacher(${t.id})">O'chirish</button></td></tr>`;
    });
}

function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    (systemData.students || []).forEach((s, i) => {
        const cls = (systemData.classes || []).find(c => c.id === s.classId);
        tbody.innerHTML += `<tr><td>${i + 1}</td><td>${s.name} ${s.surname} ${s.father}</td><td>${cls?.name || 'N/A'}</td><td><button class="btn btn-danger" onclick="deleteStudent(${s.id})">O'chirish</button></td></tr>`;
    });
}

function updateClassesGrid() {
    const grid = document.getElementById('classesGrid');
    const noMessage = document.getElementById('noClassesMessage');
    grid.innerHTML = '';
    const userClasses = (systemData.classes || []).filter(c => c.school === (currentUser?.school || 'Test Maktab'));
    
    if (userClasses.length === 0) {
        if (noMessage) noMessage.style.display = 'block';
    } else {
        if (noMessage) noMessage.style.display = 'none';
                userClasses.forEach(cls => {
            const count = (systemData.classStudents[cls.id] || []).length;
                        const classImg = (systemData.classImages && systemData.classImages[cls.id]) || (systemData.schoolImages && systemData.schoolImages[cls.school]) || getImageFor(cls.school);
            grid.innerHTML += `<div class="class-card" style="position:relative;cursor:pointer" onclick="openClassPage(${cls.id})">
                <button class="btn btn-danger" style="position:absolute;top:10px;right:10px;width:auto;padding:6px 10px;font-size:11px;z-index:10" onclick="deleteClass(${cls.id}, event)">O'chirish</button>
                                <div class="school-hero" style="background-image:url('${classImg}')"></div>
                                <div style="padding:12px">
                                    <h3>${cls.name}</h3>
                                    <p>O'quvchilar: ${count}</p>
                                </div>
            </div>`;
        });
    }
}

function updateClassStudentsTable() {
    const tbody = document.getElementById('classStudentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const studentIds = systemData.classStudents[currentClass] || [];
    const students = systemData.students.filter(s => studentIds.includes(s.id));
    students.forEach((s, i) => {
        const coins = systemData.studentCoins[s.id] || 0;
        const deleteBtn = currentUser?.role === 'director' ? `<button class="btn btn-danger" onclick="deleteStudent(${s.id})">O'chirish</button>` : '';
        const attStatus = getAttendanceStatus(currentClass, s.id);
        // If student marked absent (false), disable coin input
        const disabledAttr = (attStatus === false) ? 'disabled' : '';
        let attendanceControls = '';
        // Show attendance buttons only to homeroom teacher for this class
        const homeroomId = systemData.classHomeroom?.[currentClass];
        const isHomeroom = currentUser?.role === 'teacher' && currentUser?.teacherId === homeroomId;
        if (isHomeroom) {
            const yesActive = attStatus === true ? 'opacity:1;border:2px solid rgba(0,0,0,0.06)' : '';
            const noActive = attStatus === false ? 'opacity:1;border:2px solid rgba(0,0,0,0.06)' : '';
            attendanceControls = `<div style="display:flex;gap:8px;align-items:center"><button class="btn small btn-danger" style="${noActive}" onclick="markAttendance(${s.id}, false)">Yo'q</button><button class="btn small btn-success" style="${yesActive}" onclick="markAttendance(${s.id}, true)">Ha</button></div>`;
        } else {
            if (attStatus === false) attendanceControls = `<span style="color:${'#c0392b'};font-weight:700">Kelmadi</span>`;
            else if (attStatus === true) attendanceControls = `<span style="color:${'#1e8449'};font-weight:700">Keldi</span>`;
            else attendanceControls = `<span style="color:var(--muted)">-</span>`;
        }

        tbody.innerHTML += `<tr><td>${i + 1}</td><td>${s.name} ${s.surname} ${s.father}</td><td><div class="coin-controls"><span class="coin-display">💰 ${coins}</span><input type="number" ${disabledAttr} id="coin-input-${s.id}" placeholder="±N" style="width:60px;padding:6px;border-radius:6px;border:1px solid #ddd;margin-left:6px" onkeypress="if(event.key==='Enter') addCoins(${s.id})" /></div></td><td>${attendanceControls} ${deleteBtn}</td></tr>`;
    });
}

function updateClassTeachersTable() {
    const tbody = document.getElementById('classTeachersTableBody');
    tbody.innerHTML = '';
    const teachers = systemData.classTeachers[currentClass] || [];
    teachers.forEach((t, i) => {
        // Faqat direktir o'chira oladi
        const deleteBtn = currentUser?.role === 'director' ? `<button class="btn btn-danger" onclick="removeTeacherFromClass(${t.id})">O'chirish</button>` : '';
        tbody.innerHTML += `<tr><td>${i + 1}</td><td>${t.name} ${t.surname} ${t.father}</td><td>${t.subject}</td><td>${deleteBtn}</td></tr>`;
    });
}

function updateAllClassesTable() {
    const tbody = document.getElementById('allClassesTableBody');
    tbody.innerHTML = '';
    (systemData.classes || []).forEach((c, i) => {
        const count = (systemData.classStudents[c.id] || []).length;
        tbody.innerHTML += `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.school}</td><td>${count}</td><td><button class="btn btn-info" style="width: auto; padding: 8px 15px;" onclick="openAdminClassPage(${c.id})">Ko'rish</button></td></tr>`;
    });
}

function updateAllDirectorsTable() {
    const tbody = document.getElementById('allDirectorsTableBody');
    tbody.innerHTML = '';
    (systemData.directors || []).forEach((d, i) => {
        tbody.innerHTML += `<tr><td>${i + 1}</td><td>${d.school}</td><td><code>${d.username}</code></td><td><code>${d.password}</code></td><td><button class="btn btn-warning" style="width: auto; padding: 8px 15px;" onclick="editDirector(${i})">O'zgartirish</button><button class="btn btn-danger" onclick="deleteDirector(${i})">O'chirish</button></td></tr>`;
    });
}

// Delete and modify functions
function deleteTeacher(id) {
    systemData.teachers = (systemData.teachers || []).filter(t => t.id !== id);
    // remove teacher from any classTeachers lists
    Object.keys(systemData.classTeachers || {}).forEach(cid => {
        systemData.classTeachers[cid] = (systemData.classTeachers[cid] || []).filter(t => t.id !== id);
    });
    saveData();
    updateTeachersTable();
    updateDirectorDashboard();
}

function deleteStudent(id) {
    systemData.students = (systemData.students || []).filter(s => s.id !== id);
    delete systemData.studentCoins[id];
    Object.keys(systemData.classStudents || {}).forEach(cid => {
        systemData.classStudents[cid] = (systemData.classStudents[cid] || []).filter(sid => sid !== id);
    });
    saveData();
    updateClassStudentsTable();
    updateStudentsTable();
    if (currentUser?.role === 'director') updateDirectorDashboard();
    if (currentUser?.role === 'teacher') updateTeacherDashboard();
}

function changeCoin(id, amount) {
    // Prevent change if student marked absent in their class
    const student = (systemData.students || []).find(s => s.id === id);
    const classId = student?.classId;
    if (classId && getAttendanceStatus(classId, id) === false) { alert("Bu o'quvchi sinf raxbar tomonidan kelmagan deb belgilangan. Coin o'zgartirib bo'lmaydi."); return; }
    if (!systemData.studentCoins[id] && systemData.studentCoins[id] !== 0) systemData.studentCoins[id] = 0;
    systemData.studentCoins[id] = (systemData.studentCoins[id] || 0) + amount;
    // record history for rankings
    try { recordCoinTransaction(id, amount); } catch (e) {}
    saveData();
    updateClassStudentsTable();
}

function addCoins(studentId) {
    const input = document.getElementById(`coin-input-${studentId}`);
    if (!input) return;
    const val = parseInt(input.value, 10);
    if (isNaN(val)) {
        alert('Raqam kiriting');
        return;
    }
    // Prevent adding coins to students marked absent this week
    const att = getAttendanceStatus(currentClass, studentId);
    if (att === false) { alert("Bu o'quvchi sinf raxbar tomonidan kelmagan deb belgilangan. Coin qo'yib bo'lmaydi."); return; }
    if (!systemData.studentCoins[studentId] && systemData.studentCoins[studentId] !== 0) systemData.studentCoins[studentId] = 0;
    systemData.studentCoins[studentId] = (systemData.studentCoins[studentId] || 0) + val;
    try { recordCoinTransaction(studentId, val); } catch (e) {}
    saveData();
    updateClassStudentsTable();
}

function removeTeacherFromClass(id) {
    systemData.classTeachers[currentClass] = (systemData.classTeachers[currentClass] || []).filter(t => t.id !== id);
    saveData();
    updateClassTeachersTable();
}

function deleteClass(classId, event) {
    if (event) event.stopPropagation();
    if (confirm('Bu sinfni o\'chiramoqchi ekanini tasdiqlamoqmi?')) {
        systemData.classes = (systemData.classes || []).filter(c => c.id !== classId);
        delete systemData.classTeachers[classId];
        const studentsInClass = (systemData.classStudents[classId] || []);
        delete systemData.classStudents[classId];
        studentsInClass.forEach(sid => delete systemData.studentCoins[sid]);
        saveData();
        updateClassesGrid();
        updateDirectorDashboard();
        updateAllClassesTable();
    }
}

function deleteDirector(index) {
    if (confirm('Bu direktorni o\'chiramoqchi ekanini tasdiqlamoqmi?')) {
        systemData.directors.splice(index, 1);
        saveData();
        updateAllDirectorsTable();
    }
}

function editDirector(index) {
    const director = (systemData.directors || [])[index];
    const newPassword = prompt(`Direktor paroli o'zgartirish:\nMaktab: ${director.school}\nLogin: ${director.username}\nYangi parol:`, director.password);
    if (newPassword !== null && newPassword.trim() !== '') {
        director.password = newPassword;
        saveData();
        updateAllDirectorsTable();
        alert('Parol muvaffaqiyatli o\'zgartirildi!');
    }
}

function updateSchoolSelect() {
    const select = document.getElementById('schoolSelect');
    const schools = [...new Set(systemData.classes.map(c => c.school))];
    select.innerHTML = '<option value="">-- Maktab tanlamasdan --</option>';
    schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school;
        option.textContent = school;
        select.appendChild(option);
    });
}

function showSelectedSchoolInfo() {
    const school = document.getElementById('schoolSelect').value;
    if (!school) {
        document.getElementById('schoolInfoContainer').style.display = 'none';
        return;
    }
    
    const schoolClasses = systemData.classes.filter(c => c.school === school);
    const classIds = schoolClasses.map(c => c.id);
    const schoolStudents = systemData.students.filter(s => classIds.includes(s.classId));
}



function diagnosePanel(panelId) {
    const panel = document.getElementById(panelId);
    const navBtns = document.querySelectorAll(`#${panelId} .nav-btn`);
    const sections = document.querySelectorAll(`#${panelId} .content-section`);
    console.log(`=== Panel Diagnostics for ${panelId} ===`);
    console.log(`Panel exists: ${!!panel}`);
    console.log(`Nav buttons: ${navBtns.length}`);
    navBtns.forEach((btn, i) => console.log(`  [${i}] ${btn.textContent.trim()}`));
    console.log(`Content sections: ${sections.length}`);
    sections.forEach((sec, i) => console.log(`  [${i}] ${sec.id} (active: ${sec.classList.contains('active')})`));
}

window.addEventListener('load', () => {
    // Load data only on initial page load
    if (!document.getElementById('loginForm')) return; // page not fully loaded yet
    loadData();
    
    // Only reset user and show login if no active user yet
    if (!currentUser) {
        currentUser = null;
        currentClass = null;
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('loginScreen').classList.add('active');
    }
    // If user is already logged in, keep their panel visible
    
    updateAllViews();
    setupAddDirectorFormListener();
    try {
        document.getElementById('btnRefreshClassRanking')?.addEventListener('click', () => renderClassRanking(document.getElementById('classRankingPeriod')?.value));
        document.getElementById('classRankingPeriod')?.addEventListener('change', () => renderClassRanking());
        document.getElementById('btnRefreshDirectorRanking')?.addEventListener('click', () => renderDirectorRanking(document.getElementById('directorRankingPeriod')?.value));
        document.getElementById('directorRankingPeriod')?.addEventListener('change', () => renderDirectorRanking());
    } catch (e) {}
});
