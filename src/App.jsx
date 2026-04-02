import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home, User, Users, CalendarCheck, BookOpen, FolderOpen, Award, 
  Download, AlertCircle, CheckCircle2, Lock,
  Edit2, Trash2, Upload, Image as ImageIcon, Settings, LogOut, Menu, X, Check,
  Zap, Bell, ChevronRight, CheckSquare, Folder, ChevronDown, ExternalLink, Shield
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

// ==========================================
// KONFIGURASI FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCDyImhC_veVkfXNAv-zuEfBxfsgz4fbxc",
  authDomain: "aplikasi-siap-guru.firebaseapp.com",
  projectId: "aplikasi-siap-guru",
  storageBucket: "aplikasi-siap-guru.firebasestorage.app",
  messagingSenderId: "898399806241",
  appId: "1:898399806241:web:9eec6b69a113ab368c9460"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const MAPEL_OPTIONS = [
  'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 
  'IPAS', 'Seni Budaya', 'Bahasa Madura'
];

const KELAS_OPTIONS = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];

const TAHUN_OPTIONS = [
  '2025/2026','2026/2027','2027/2028','2028/2029','2029/2030','2030/2031'
];

// Guru mapel khusus (PAI, PJOK, Bahasa Inggris) - beda tampilan
const GURU_MAPEL_LIST = [
  'Guru PAI',
  'Guru PJOK',
  'Guru Bahasa Inggris',
];

const isGuruMapel = (loggedInKelas) => GURU_MAPEL_LIST.includes(loggedInKelas);

// ==========================================
// UTILITIES
// ==========================================
const getTodayDate = () => new Date().toISOString().split('T')[0];
const generateId = () => Math.random().toString(36).substr(2, 9);

const loadXLSX = async () => {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Gagal memuat library Excel"));
    document.head.appendChild(script);
  });
};

const exportToExcel = async (data, filename, showToast) => {
  if (!data || !data.length) {
    showToast("Tidak ada data untuk diexport", "error");
    return;
  }
  try {
    const XLSX = await loadXLSX();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    showToast(`File ${filename}.xlsx berhasil diunduh!`, "success");
  } catch (error) {
    console.error(error);
    showToast("Gagal mengekspor file Excel.", "error");
  }
};

const loadJsPDF = async () => {
  if (window.jspdf) return window.jspdf.jsPDF;
  if (window.jsPDF) return window.jsPDF;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      const JsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
      if (JsPDF) resolve(JsPDF);
      else reject(new Error("Gagal memuat jsPDF"));
    };
    script.onerror = () => reject(new Error("Gagal memuat library PDF"));
    document.head.appendChild(script);
  });
};

const loadAutoTable = async () => {
  if (window.jspdf && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat autoTable"));
    document.head.appendChild(script);
  });
};


// ==========================================
// MODAL COMPONENT (reusable)
// ==========================================
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-black text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X size={20}/>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default function App() {
  const [isEntered, setIsEntered] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Login Credentials States
  const [loginKelas, setLoginKelas] = useState('Kelas 1');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Sesi Aktif (Setelah Login)
  const [loggedInKelas, setLoggedInKelas] = useState('');
  const [dbId, setDbId] = useState(''); // Contoh: 'db_kelas_1'

  // Global Context Dropdowns (Kelas dihilangkan dari dropdown karena sudah fix per guru)
  const [activeTahun, setActiveTahun] = useState('2025/2026');
  const [activeSemester, setActiveSemester] = useState('Ganjil');

  // Data States
  const [settings, setSettings] = useState({ 
    logoUrl: '', 
    namaSekolah: 'SD NEGERI NUSANTARA',
    namaKepalaSekolah: '',
    nipKepalaSekolah: '',
    kotaTandatangan: '',
    username: '',
    password: ''
  });
  const [profile, setProfile] = useState({ nama: '', nip: '', foto: '' });
  const [students, setStudents] = useState([]);
  const [allStudentsByKelas, setAllStudentsByKelas] = useState({}); // untuk guru mapel
  const [attendance, setAttendance] = useState([]);
  const [journals, setJournals] = useState([]);
  const [tools, setTools] = useState([]);
  const [grades, setGrades] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // Inisialisasi Auth Anonim Firebase (Hanya untuk akses sistem)
  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.log("Auth error:", error));
    
    // Sync Local Settings for Login Page awal (sebelum narik DB)
    const savedSchool = localStorage.getItem('sg_schoolName') || 'SD NEGERI NUSANTARA';
    const savedLogo = localStorage.getItem('appLogoSekolah') || '';
    setSettings(prev => ({...prev, namaSekolah: savedSchool, logoUrl: savedLogo}));
  }, []);

  // Fetch Data HANYA JIKA SUDAH LOGIN & dbId TERSEDIA
  useEffect(() => {
    if (!isEntered || !dbId) return;

    const unsubSettings = onSnapshot(doc(db, 'users', dbId, 'data', 'settings'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSettings(prev => ({...prev, ...data}));
        if(data.namaSekolah) localStorage.setItem('sg_schoolName', data.namaSekolah);
        if(data.logoUrl) localStorage.setItem('appLogoSekolah', data.logoUrl);
      }
    });
    const unsubTahunSemester = onSnapshot(doc(db, 'users', dbId, 'data', 'tahunSemester'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.tahun) setActiveTahun(d.tahun);
        if (d.semester) setActiveSemester(d.semester);
      }
    });
    const unsubProfile = onSnapshot(doc(db, 'users', dbId, 'data', 'profile'), (doc) => {
      if (doc.exists()) setProfile(doc.data());
    });
    const unsubStudents = onSnapshot(collection(db, 'users', dbId, 'students'), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubAttendance = onSnapshot(collection(db, 'users', dbId, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubJournals = onSnapshot(collection(db, 'users', dbId, 'journals'), (snap) => {
      setJournals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTools = onSnapshot(collection(db, 'users', dbId, 'tools'), (snap) => {
      setTools(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubGrades = onSnapshot(collection(db, 'users', dbId, 'grades'), (snap) => {
      setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubSettings(); unsubTahunSemester(); unsubProfile(); unsubStudents(); unsubAttendance(); unsubJournals(); unsubTools(); unsubGrades();
    };
  }, [isEntered, dbId]);

  // Fetch semua siswa dari kelas 1-6 untuk guru mapel
  useEffect(() => {
    if (!isEntered || !isGuruMapel(loggedInKelas)) return;
    const unsubs = KELAS_OPTIONS.map(kelas => {
      const kelasDbId = `db_${kelas.replace(' ', '_').toLowerCase()}`;
      return onSnapshot(collection(db, 'users', kelasDbId, 'students'), (snap) => {
        const siswa = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllStudentsByKelas(prev => ({ ...prev, [kelas]: siswa }));
      });
    });
    return () => unsubs.forEach(u => u());
  }, [isEntered, loggedInKelas]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      // Buat ID Database berdasarkan kelas/mapel yang dipilih
      const targetDbId = `db_${loginKelas.replace(/\s+/g, '_').toLowerCase()}`;
      const settingsRef = doc(db, 'users', targetDbId, 'data', 'settings');
      const docSnap = await getDoc(settingsRef);

      let isLoginValid = false;
      // Default password: guru1..guru6 untuk guru kelas, gurupai/gurupjok/gurubahasainggris untuk guru mapel
      const defaultPass = isGuruMapel(loginKelas)
        ? `guru${loginKelas.replace('Guru ','').replace(/\s+/g,'').toLowerCase()}`
        : `guru${loginKelas.split(' ')[1]}`;

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.password === loginPass) {
          isLoginValid = true;
        }
      } else {
        // Jika belum pernah disetting, gunakan password default
        if (loginPass === defaultPass) {
          isLoginValid = true;
          await setDoc(settingsRef, {
             password: defaultPass,
             namaSekolah: settings.namaSekolah
          }, { merge: true });
        }
      }

      if (isLoginValid) {
        setLoggedInKelas(loginKelas);
        setDbId(targetDbId);
        setIsEntered(true);
        showToast(`Berhasil masuk sebagai ${loginKelas}`);
      } else {
        showToast("Password salah!", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsEntered(false);
    setLoginUser('');
    setLoginPass('');
    setLoggedInKelas('');
    setDbId('');
    
    // Reset States supaya data tidak bocor ke login berikutnya
    setProfile({ nama: '', nip: '', foto: '' });
    setStudents([]);
    setAttendance([]);
    setJournals([]);
    setTools([]);
    setGrades([]);
    setActiveTab('dashboard');
    
    showToast("Berhasil keluar aplikasi");
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-slate-100 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-100 bg-white border border-slate-100 overflow-hidden relative z-10">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo Sekolah" className="w-full h-full object-cover" />
            ) : (
              <BookOpen size={48} className="text-indigo-600" />
            )}
          </div>
          
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 relative z-10">{settings.namaSekolah}</p>
          
          <h1 className="text-3xl font-black text-slate-800 mb-1 relative z-10">SIAP GURU</h1>
          <p className="text-slate-500 font-bold mb-8 relative z-10 text-sm">Portal Manajemen Kelas Terpadu</p>
          
          <form onSubmit={handleLogin} className="space-y-4 relative z-10 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Masuk Sebagai</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield size={18} className="text-slate-400" />
                </div>
                <select 
                  value={loginKelas} onChange={(e)=>setLoginKelas(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer" 
                >
                  {KELAS_OPTIONS.map(k => <option key={k} value={k}>Guru {k}</option>)}
                  {GURU_MAPEL_LIST.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-400" />
              </div>
              <input 
                type="password" value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Password" 
              />
            </div>
            
            <button 
              type="submit" disabled={isLoggingIn}
              className="w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? "Memverifikasi..." : "Masuk Aplikasi"}
            </button>

           <div className="mt-6 text-center text-xs font-medium text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
              Copyright &copy; 2026 Hairur Rahman
            </div>
          </form>
        </div>
      </div>
    );
}

  const guruMapelMode = isGuruMapel(loggedInKelas);

  const mainNavItems = guruMapelMode
    ? [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'students', icon: Users, label: 'Data Siswa' },
        { id: 'journal', icon: BookOpen, label: 'Jurnal Mengajar' },
        { id: 'tools', icon: FolderOpen, label: 'Perangkat' },
        { id: 'grades', icon: Award, label: 'Rekap Nilai' },
      ]
    : [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'students', icon: Users, label: 'Data Siswa' },
        { id: 'attendance', icon: CalendarCheck, label: 'Absensi' },
        { id: 'journal', icon: BookOpen, label: 'Jurnal Mengajar' },
        { id: 'tools', icon: FolderOpen, label: 'Perangkat' },
        { id: 'grades', icon: Award, label: 'Rekap Nilai' },
      ];

  // Siswa difilter dan DIURUTKAN SESUAI ABJAD
  const classStudents = students
    .filter(s => s.tahun === activeTahun)
    .sort((a, b) => a.nama.localeCompare(b.nama)); 

  const classAttendance = attendance.filter(a => a.tahun === activeTahun && a.semester === activeSemester);
  const classJournals = journals.filter(j => j.tahun === activeTahun && j.semester === activeSemester);
  const classTools = tools.filter(t => t.tahun === activeTahun && t.semester === activeSemester);
  const classGrades = grades.filter(g => g.tahun === activeTahun && g.semester === activeSemester);

  const filterCtx = { activeTahun, activeSemester, loggedInKelas, dbId, guruMapelMode };

  // Untuk guru mapel, mapelGuru = nama mapelnya saja (tanpa "Guru ")
  const mapelGuru = guruMapelMode ? loggedInKelas.replace('Guru ', '') : '';

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-bold text-sm pointer-events-auto transition-all animate-fade-in ${t.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header Atas */}
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-4 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition md:hidden">
            <Menu size={22} />
          </button>
          
          <div className="flex items-center gap-2">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
            ) : (
              <BookOpen className="text-indigo-600" size={24} />
            )}
            <h1 className="font-extrabold text-lg text-indigo-700 tracking-tight leading-none hidden sm:block">SIAP GURU</h1>
          </div>
        </div>

        {/* Dropdowns Filter */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Label Kelas Fix (Terkunci sesuai user yang login) */}
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 flex items-center gap-1.5">
            <Shield size={14} /> {loggedInKelas}
          </div>

          <select value={activeTahun} onChange={(e)=>{
            const val = e.target.value;
            setActiveTahun(val);
            setDoc(doc(db, 'users', dbId, 'data', 'tahunSemester'), { tahun: val, semester: activeSemester }, { merge: true });
          }} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-indigo-500">
            {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={activeSemester} onChange={(e)=>{
            const val = e.target.value;
            setActiveSemester(val);
            setDoc(doc(db, 'users', dbId, 'data', 'tahunSemester'), { tahun: activeTahun, semester: val }, { merge: true });
          }} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-indigo-500">
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay untuk mobile saat sidebar terbuka */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Sidebar */}
        <aside className={`fixed md:relative inset-y-0 left-0 z-30 w-64 h-full bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="flex items-center justify-between p-4 md:hidden border-b border-slate-100">
            <span className="font-black text-slate-800">Menu Utama</span>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 p-1 bg-slate-100 rounded-lg"><X size={20}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {mainNavItems.map(item => (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                <item.icon size={18} className={activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-slate-100 space-y-1 bg-slate-50/50">
            <button onClick={() => handleNavClick('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <Settings size={18} className={activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'} /> Pengaturan
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={18} /> Keluar Aplikasi
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {activeTab === 'dashboard' && <Dashboard profile={profile} students={guruMapelMode ? Object.values(allStudentsByKelas).flat().filter(s=>s.tahun===activeTahun) : classStudents} attendance={classAttendance} journals={classJournals} ctx={filterCtx} setActiveTab={setActiveTab} guruMapelMode={guruMapelMode} />}
          {activeTab === 'students' && !guruMapelMode && <StudentSection students={classStudents} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'students' && guruMapelMode && <StudentSectionGuruMapel allStudentsByKelas={allStudentsByKelas} ctx={filterCtx} />}
          {activeTab === 'attendance' && !guruMapelMode && <AttendanceSection students={classStudents} attendance={classAttendance} ctx={filterCtx} showToast={showToast} settings={settings} profile={profile} />}
          {activeTab === 'journal' && !guruMapelMode && <JournalSection journals={classJournals} ctx={filterCtx} showToast={showToast} settings={settings} profile={profile} />}
          {activeTab === 'journal' && guruMapelMode && <JournalSectionGuruMapel journals={classJournals} allStudentsByKelas={allStudentsByKelas} ctx={filterCtx} showToast={showToast} settings={settings} profile={profile} mapelGuru={mapelGuru} />}
          {activeTab === 'tools' && <ToolsSection tools={classTools} ctx={filterCtx} showToast={showToast} guruMapelMode={guruMapelMode} />}
          {activeTab === 'grades' && !guruMapelMode && <GradesSection students={classStudents} grades={classGrades} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'grades' && guruMapelMode && <GradesSectionGuruMapel allStudentsByKelas={allStudentsByKelas} grades={classGrades} ctx={filterCtx} showToast={showToast} mapelGuru={mapelGuru} />}
          {activeTab === 'settings' && <SettingsSection settings={settings} profile={profile} ctx={filterCtx} showToast={showToast} />}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 1. DASHBOARD COMPONENT
// ==========================================
const Dashboard = ({ profile, students, attendance, journals, ctx, setActiveTab, guruMapelMode }) => {
  const today = getTodayDate();
  const todayAttendance = attendance.filter(a => a.tanggal === today);
  const presentToday = todayAttendance.filter(a => a.status === 'Hadir').length;
  const isAbsenLengkap = todayAttendance.length === students.length && students.length > 0;
  const todayJournals = journals.filter(j => j.tanggal === today);
  const latestJournals = [...journals].sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal)).slice(0, 3);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in flex flex-col">
      {/* Profil Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center relative z-10">
          {profile?.foto ? (
            <img src={profile.foto} alt="Profil" className="w-full h-full object-cover" />
          ) : (
            <User size={48} className="text-slate-300" />
          )}
        </div>
        <div className="text-center md:text-left flex-1 relative z-10">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">{profile?.nama || ctx.loggedInKelas}</h2>
          <p className="text-slate-500 font-bold mb-4">
            NIP. {profile?.nip || '-'} <span className="mx-2 text-slate-300">|</span>
            {guruMapelMode ? ctx.loggedInKelas : `Wali ${ctx.loggedInKelas}`}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
             <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
               <span className="block text-[10px] uppercase font-bold text-indigo-400">Total Siswa</span>
               <span className="text-lg font-black text-indigo-700">{students.length} Anak</span>
             </div>
             {!guruMapelMode && (
               <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                 <span className="block text-[10px] uppercase font-bold text-emerald-400">Hadir Hari Ini</span>
                 <span className="text-lg font-black text-emerald-700">{presentToday} Anak</span>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> Aksi Cepat</h3>
            <div className="space-y-3">
              {!guruMapelMode && (
                <button onClick={() => setActiveTab('attendance')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100 hover:border-indigo-100 rounded-xl transition font-bold text-slate-600 text-sm">
                  <div className="flex items-center gap-3"><CalendarCheck size={18} /> Isi Absensi Kelas</div>
                  <ChevronRight size={16} />
                </button>
              )}
              <button onClick={() => setActiveTab('grades')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-100 hover:border-emerald-100 rounded-xl transition font-bold text-slate-600 text-sm">
                <div className="flex items-center gap-3"><Award size={18} /> Input Nilai Sumatif</div>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setActiveTab('journal')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-100 hover:border-blue-100 rounded-xl transition font-bold text-slate-600 text-sm">
                <div className="flex items-center gap-3"><BookOpen size={18} /> Tambah Jurnal Baru</div>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Jurnal Terisi</p>
              <h3 className="text-2xl font-black text-slate-800">{journals.length} <span className="text-sm font-medium text-slate-400">Total</span></h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Tahun Ajaran</p>
              <h3 className="text-lg font-black text-slate-800">{ctx.activeTahun}</h3>
              <p className="text-[10px] text-slate-400 font-bold">Sem. {ctx.activeSemester}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 flex items-center gap-2"><BookOpen size={18} className="text-indigo-600" /> Jurnal Terbaru</h3>
            <button onClick={() => setActiveTab('journal')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Lihat Semua</button>
          </div>
          
          <div className="space-y-4 flex-1">
            {latestJournals.length === 0 ? (
               <div className="text-center py-8 text-slate-400 font-medium text-sm">Belum ada jurnal yang dicatat pada semester ini.</div>
            ) : (
              latestJournals.map(j => (
                <div key={j.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-indigo-100 text-indigo-700">
                    <span className="text-base font-black leading-none">{j.tanggal.substring(8,10)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-base truncate">{guruMapelMode ? (j.kelas || j.mapel) : j.mapel}</h4>
                    <p className="text-slate-500 text-sm truncate">{j.materi}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-4">
        {!guruMapelMode && !isAbsenLengkap && (
          <div className="flex-1 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
            <Bell size={20} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Pengingat Absensi</p>
              <p className="text-xs">Anda belum melengkapi absensi siswa untuk hari ini.</p>
            </div>
            <button onClick={() => setActiveTab('attendance')} className="text-xs bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-300">Isi Sekarang</button>
          </div>
        )}
        {todayJournals.length === 0 && (
          <div className="flex-1 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
            <Bell size={20} className="text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Jurnal Kosong</p>
              <p className="text-xs">Belum ada jurnal mengajar yang diinput hari ini.</p>
            </div>
            <button onClick={() => setActiveTab('journal')} className="text-xs bg-blue-200 text-blue-900 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-300">Tambah</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 2. STUDENT COMPONENT
// ==========================================
const StudentSection = ({ students, ctx, showToast }) => {
  const [formData, setFormData] = useState({ nisn: '', nis: '', nama: '', jk: 'L' });
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama) return showToast("Nama wajib diisi", "error");
    const newId = generateId();
    const newStudent = { ...formData, kelas: ctx.loggedInKelas, tahun: ctx.activeTahun };
    await setDoc(doc(db, 'users', ctx.dbId, 'students', newId), newStudent);
    showToast("Data siswa berhasil ditambahkan");
    setFormData({ nisn: '', nis: '', nama: '', jk: 'L' });
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', ctx.dbId, 'students', id));
    showToast("Data siswa dihapus");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws);
          
          if (data.length === 0) return showToast("File Excel kosong", "error");

          let count = 0;
          for (const row of data) {
            const newId = generateId();
            const newStudent = {
              nisn: (row['NISN'] || '').toString(),
              nis: (row['NIS'] || '').toString(),
              nama: (row['Nama'] || '').toString(),
              jk: (row['JK'] || 'L').toString().toUpperCase().charAt(0),
              kelas: ctx.loggedInKelas,
              tahun: ctx.activeTahun
            };
            if(newStudent.nama) {
               await setDoc(doc(db, 'users', ctx.dbId, 'students', newId), newStudent);
               count++;
            }
          }
          showToast(`${count} siswa berhasil diimport ke ${ctx.loggedInKelas}!`);
        } catch (err) {
          showToast("Format file Excel tidak sesuai", "error");
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      showToast("Gagal memuat library Excel", "error");
    }
    e.target.value = null;
  };

  const handleDownloadTemplateSiswa = async () => {
    try {
      const XLSX = await loadXLSX();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Nama', 'NIS', 'NISN', 'JK'],
        ['Contoh Nama Siswa', '1234', '9876543210', 'L'],
        ['Contoh Nama Siswi', '1235', '9876543211', 'P'],
      ]);
      ws['!cols'] = [{wch:30},{wch:12},{wch:14},{wch:5}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
      XLSX.writeFile(wb, 'Template_Data_Siswa.xlsx');
    } catch(err) { showToast("Gagal membuat template", "error"); }
  };

  const handleDownloadDataSiswa = async () => {
    if (students.length === 0) return showToast("Belum ada data siswa", "error");
    try {
      const XLSX = await loadXLSX();
      const data = [
        ['Nama', 'NIS', 'NISN', 'JK'],
        ...students.map(s => [s.nama, s.nis || '', s.nisn || '', s.jk])
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{wch:30},{wch:12},{wch:14},{wch:5}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
      XLSX.writeFile(wb, `Data_Siswa_${ctx.loggedInKelas.replace(' ','_')}_${ctx.activeTahun.replace('/','_')}.xlsx`);
      showToast("Data siswa berhasil diunduh!", "success");
    } catch(err) { showToast("Gagal mengunduh data", "error"); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Siswa Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap</label>
            <input type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">NIS</label>
              <input type="text" value={formData.nis} onChange={e => setFormData({...formData, nis: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">NISN</label>
              <input type="text" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Jenis Kelamin</label>
            <select value={formData.jk} onChange={e => setFormData({...formData, jk: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none">
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition">Simpan Siswa</button>
        </form>
      </Modal>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Data Siswa <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-lg ml-2">{ctx.loggedInKelas}</span></h2>
          <p className="text-slate-500 font-medium mt-1">Tahun {ctx.activeTahun} • Total: {students.length} Siswa</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold transition hover:bg-indigo-700 text-sm shadow-md shadow-indigo-200">
            <Users size={18} /> + Tambah Siswa
          </button>
          <button onClick={handleDownloadTemplateSiswa} className="flex items-center justify-center gap-2 bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl font-bold transition border border-slate-200 hover:bg-slate-100 text-sm">
            <Download size={18} /> Template XLSX
          </button>
          <label className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-100 font-bold transition border border-emerald-100 text-sm">
            <Upload size={18} /> Import Excel (.xlsx)
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-bold w-12 text-center">No</th>
                <th className="p-4 font-bold">Nama Lengkap</th>
                <th className="p-4 font-bold">NIS / NISN</th>
                <th className="p-4 font-bold text-center">L/P</th>
                <th className="p-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    Belum ada data siswa. Silakan tambah manual atau import dari Excel.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-800">{s.nama}</td>
                    <td className="p-4 text-slate-600 text-sm">{s.nis || '-'} / {s.nisn || '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${s.jk === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {s.jk}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. ATTENDANCE COMPONENT
// ==========================================
const AttendanceSection = ({ students, attendance, ctx, showToast, settings, profile }) => {
  const [date, setDate] = useState(getTodayDate());
  const [exportMonth, setExportMonth] = useState(getTodayDate().substring(5, 7));
  const [exportYear, setExportYear] = useState(getTodayDate().substring(0, 4));

  const handleStatusChange = async (siswaId, status) => {
    const existing = attendance.find(a => a.siswaId === siswaId && a.tanggal === date);
    if (existing) {
      await setDoc(doc(db, 'users', ctx.dbId, 'attendance', existing.id), { status }, { merge: true });
    } else {
      const newId = generateId();
      await setDoc(doc(db, 'users', ctx.dbId, 'attendance', newId), { 
        siswaId, tanggal: date, status, 
        kelas: ctx.loggedInKelas, tahun: ctx.activeTahun, semester: ctx.activeSemester 
      });
    }
  };

  const handleHadirSemua = async () => {
    if (students.length === 0) return showToast("Belum ada data siswa", "error");
    const promises = students.map(s => {
      const existing = attendance.find(a => a.siswaId === s.id && a.tanggal === date);
      if (existing) {
        if(existing.status !== 'Hadir') return setDoc(doc(db, 'users', ctx.dbId, 'attendance', existing.id), { status: 'Hadir' }, { merge: true });
        return Promise.resolve();
      } else {
        const newId = generateId();
        return setDoc(doc(db, 'users', ctx.dbId, 'attendance', newId), { 
          siswaId: s.id, tanggal: date, status: 'Hadir', 
          kelas: ctx.loggedInKelas, tahun: ctx.activeTahun, semester: ctx.activeSemester
        });
      }
    });
    try {
      await Promise.all(promises);
      showToast("Semua siswa ditandai Hadir hari ini");
    } catch(err) {
      showToast("Terjadi kesalahan saat update massal", "error");
    }
  };

  const getLastWorkdayOfMonth = (year, month) => {
    let d = new Date(year, month, 0);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  };

  const buildSignatureBlock = (doc, kelas, kota, tanggalTTD, namaKepala, nipKepala, namaGuru, nipGuru, startY) => {
    const pageW = doc.internal.pageSize.getWidth();
    const left = 14;
    const rightX = pageW / 2 + 10;
    doc.setFontSize(10);
    doc.text('Mengetahui,', left + 20, startY, { align: 'center' });
    doc.text('Kepala Sekolah', left + 20, startY + 5, { align: 'center' });
    doc.text(`${kota}, ${tanggalTTD}`, rightX + 20, startY, { align: 'center' });
    doc.text(`Guru ${kelas}`, rightX + 20, startY + 5, { align: 'center' });
    doc.text(namaKepala, left + 20, startY + 28, { align: 'center' });
    doc.setDrawColor(0);
    doc.line(left, startY + 29, left + 40, startY + 29);
    doc.text(`NIP. ${nipKepala}`, left + 20, startY + 33, { align: 'center' });
    doc.text(namaGuru, rightX + 20, startY + 28, { align: 'center' });
    doc.line(rightX, startY + 29, rightX + 40, startY + 29);
    doc.text(`NIP. ${nipGuru}`, rightX + 20, startY + 33, { align: 'center' });
  };

  const handleExport = async () => {
    const year = parseInt(exportYear);
    const month = parseInt(exportMonth);
    const dataBulanIni = attendance.filter(a => {
      const [y, m] = a.tanggal.split('-').map(Number);
      return y === year && m === month;
    });
    if (dataBulanIni.length === 0) return showToast("Tidak ada data absensi di bulan ini", "error");

    const uniqueDates = [...new Set(dataBulanIni.map(a => a.tanggal))].sort();
    const bulanNama = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
    const lastWorkday = getLastWorkdayOfMonth(year, month);
    const tanggalTTD = lastWorkday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const kota = settings.kotaTandatangan || '___________';
    const namaKepala = settings.namaKepalaSekolah || '___________________________';
    const nipKepala = settings.nipKepalaSekolah || '___________________________';
    const namaGuru = profile.nama || '___________________________';
    const nipGuru = profile.nip || '___________________________';
    const namaSekolah = settings.namaSekolah || 'SD NEGERI NUSANTARA';

    try {
      const JsPDF = await loadJsPDF();
      await loadAutoTable();
      const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text(namaSekolah, pageW / 2, 14, { align: 'center' });
      doc.setFontSize(11);
      doc.text('REKAP ABSENSI SISWA', pageW / 2, 20, { align: 'center' });
      doc.setFont(undefined, 'normal'); doc.setFontSize(9);
      doc.text(`${ctx.loggedInKelas}  |  Bulan: ${bulanNama} ${year}  |  Semester: ${ctx.activeSemester} (${ctx.activeTahun})`, pageW / 2, 26, { align: 'center' });

      const head = [['No', 'Nama Siswa', ...uniqueDates.map(d => d.substring(8,10)), 'H', 'I', 'S', 'A']];
      const body = students.map((s, idx) => {
        let h=0, i=0, sk=0, a=0;
        const cells = uniqueDates.map(d => {
          const att = dataBulanIni.find(x => x.siswaId === s.id && x.tanggal === d);
          const st = att ? att.status : '';
          if(st==='Hadir') h++; if(st==='Izin') i++; if(st==='Sakit') sk++; if(st==='Alpha') a++;
          return st==='Hadir'?'H':st==='Sakit'?'S':st==='Izin'?'I':st==='Alpha'?'A':'';
        });
        return [idx+1, s.nama, ...cells, h, i, sk, a];
      });

      doc.autoTable({
        head, body, startY: 30,
        styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
        columnStyles: { 1: { halign: 'left', cellWidth: 40 } },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        margin: { left: 10, right: 10 },
      });

      const finalY = doc.lastAutoTable.finalY + 5;
      doc.setFontSize(8);
      doc.text('Keterangan: H=Hadir, I=Izin, S=Sakit, A=Alpha', 14, finalY);

      const sigY = finalY + 8;
      const needNewPage = sigY + 38 > doc.internal.pageSize.getHeight();
      if (needNewPage) doc.addPage();
      buildSignatureBlock(doc, ctx.loggedInKelas, kota, tanggalTTD, namaKepala, nipKepala, namaGuru, nipGuru, needNewPage ? 20 : sigY);

      doc.save(`Rekap_Absensi_${ctx.loggedInKelas.replace(' ','_')}_${bulanNama}_${year}.pdf`);
      showToast(`PDF Rekap Absensi ${bulanNama} ${year} berhasil diunduh!`, "success");
    } catch(err) {
      console.error(err);
      showToast("Gagal membuat PDF: " + err.message, "error");
    }
  };

  const handleExportSemester = async () => {
    const semesterMonths = ctx.activeSemester === 'Ganjil' ? [7,8,9,10,11,12] : [1,2,3,4,5,6];
    const tahunParts = ctx.activeTahun.split('/');
    const yearForMonth = ctx.activeSemester === 'Ganjil' ? parseInt(tahunParts[0]) : parseInt(tahunParts[1]);

    const dataSemester = attendance.filter(a => {
      const [y, m] = a.tanggal.split('-').map(Number);
      return y === yearForMonth && semesterMonths.includes(m);
    });
    if (dataSemester.length === 0) return showToast("Tidak ada data absensi semester ini", "error");

    try {
      const XLSX = await loadXLSX();

      // Build header rows: row1 = [No, Nama, Jan, , , , Feb, ...], row2 = [,,H,S,I,A,H,S,I,A,...]
      const activeMonths = semesterMonths.filter(m => {
        return dataSemester.some(a => parseInt(a.tanggal.split('-')[1]) === m);
      });

      const row1 = ['No', 'Nama Siswa'];
      const row2 = ['', ''];
      activeMonths.forEach(m => {
        const nama = new Date(yearForMonth, m-1, 1).toLocaleString('id-ID', { month: 'long' });
        row1.push(nama, '', '', '');
        row2.push('H', 'S', 'I', 'A');
      });
      row1.push('Total H', 'Total S', 'Total I', 'Total A');
      row2.push('', '', '', '');

      const dataRows = students.map((s, idx) => {
        const row = [idx + 1, s.nama];
        let totalH=0, totalS=0, totalI=0, totalA=0;
        activeMonths.forEach(m => {
          const dataBulan = dataSemester.filter(a => parseInt(a.tanggal.split('-')[1]) === m);
          let h=0, sk=0, i=0, a=0;
          dataBulan.forEach(att => {
            if (att.siswaId !== s.id) return;
            if(att.status==='Hadir') h++;
            else if(att.status==='Sakit') sk++;
            else if(att.status==='Izin') i++;
            else if(att.status==='Alpha') a++;
          });
          row.push(h, sk, i, a);
          totalH+=h; totalS+=sk; totalI+=i; totalA+=a;
        });
        row.push(totalH, totalS, totalI, totalA);
        return row;
      });

      const sheetData = [
        [`REKAP ABSENSI SEMESTER ${ctx.activeSemester.toUpperCase()} - ${ctx.loggedInKelas} - ${ctx.activeTahun}`],
        row1,
        row2,
        ...dataRows,
        [],
        ['Keterangan: H=Hadir, S=Sakit, I=Izin, A=Alpha'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Merge cells for month headers
      const merges = [];
      let col = 2;
      activeMonths.forEach(() => {
        merges.push({ s: { r: 1, c: col }, e: { r: 1, c: col + 3 } });
        col += 4;
      });
      // Merge No and Nama headers vertically row1-row2
      merges.push({ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } });
      merges.push({ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } });
      ws['!merges'] = merges;

      // Column widths
      const wscols = [{ wch: 5 }, { wch: 28 }];
      activeMonths.forEach(() => { [6,5,5,5].forEach(w => wscols.push({ wch: w })); });
      [8,8,8,8].forEach(w => wscols.push({ wch: w }));
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Sem ${ctx.activeSemester}`);
      XLSX.writeFile(wb, `Rekap_Absensi_Sem${ctx.activeSemester}_${ctx.loggedInKelas.replace(' ','_')}_${ctx.activeTahun.replace('/','_')}.xlsx`);
      showToast(`Rekap Semester ${ctx.activeSemester} berhasil diunduh!`, "success");
    } catch(err) {
      console.error(err);
      showToast("Gagal membuat file Excel: " + err.message, "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Presensi {ctx.loggedInKelas}</h2>
          <p className="text-slate-500 font-medium mt-1">Kelola kehadiran harian siswa ({ctx.activeSemester})</p>
        </div>
        <input 
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <button onClick={handleHadirSemua} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 transition shadow-md shadow-emerald-200">
           <CheckSquare size={16}/> Hadir Semua
        </button>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="bg-white border border-indigo-200 text-indigo-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {Array.from({length: 12}, (_, i) => {
              const m = (i + 1).toString().padStart(2, '0');
              const name = new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' });
              return <option key={m} value={m}>{name}</option>
            })}
          </select>
          <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className="bg-white border border-indigo-200 text-indigo-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {[2025,2026,2027,2028,2029,2030,2031].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
             <Download size={16}/> Rekap Bulanan (PDF)
          </button>
          <button onClick={handleExportSemester} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-md shadow-emerald-200">
             <Download size={16}/> Rekap Semester (XLSX)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-bold w-12 text-center">No</th>
                <th className="p-4 font-bold">Nama Lengkap</th>
                <th className="p-4 font-bold text-center">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const att = attendance.find(a => a.siswaId === s.id && a.tanggal === date);
                const currentStatus = att ? att.status : '';
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-800">{s.nama}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {['Hadir', 'Sakit', 'Izin', 'Alpha'].map(st => (
                          <button key={st} onClick={() => handleStatusChange(s.id, st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              currentStatus === st ? 
                                st === 'Hadir' ? 'bg-emerald-500 text-white' : 
                                st === 'Sakit' ? 'bg-blue-500 text-white' : 
                                st === 'Izin' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-slate-400 font-medium">Belum ada siswa di kelas ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. JOURNAL COMPONENT
// ==========================================
const JournalSection = ({ journals, ctx, showToast, settings, profile }) => {
  const [formData, setFormData] = useState({ tanggal: getTodayDate(), mapel: MAPEL_OPTIONS[0], tujuanPembelajaran: '', materi: '', kegiatan: '', asesmen: '' });
  const [exportMonth, setExportMonth] = useState(getTodayDate().substring(5, 7));
  const [exportYear, setExportYear] = useState(getTodayDate().substring(0, 4));
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mapel || !formData.materi) return showToast("Mapel dan Materi wajib diisi", "error");
    const newId = generateId();
    const newJournal = { ...formData, kelas: ctx.loggedInKelas, tahun: ctx.activeTahun, semester: ctx.activeSemester };
    await setDoc(doc(db, 'users', ctx.dbId, 'journals', newId), newJournal);
    showToast("Jurnal berhasil disimpan");
    setFormData({ ...formData, tujuanPembelajaran: '', materi: '', kegiatan: '', asesmen: '' });
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', ctx.dbId, 'journals', id));
    showToast("Jurnal dihapus");
  };

  const getLastWorkdayOfMonth = (year, month) => {
    let d = new Date(year, month, 0);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  };

  const handleExportJournal = async () => {
    const year = parseInt(exportYear);
    const month = parseInt(exportMonth);
    const dataBulan = journals.filter(j => {
      if (!j.tanggal || j.tanggal.length < 7) return false;
      const jYear = parseInt(j.tanggal.substring(0, 4));
      const jMonth = parseInt(j.tanggal.substring(5, 7));
      return jYear === year && jMonth === month;
    });
    if (dataBulan.length === 0) {
      showToast("Tidak ada data jurnal di bulan ini", "error");
      return;
    }

    const bulanNama = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
    const lastWorkday = getLastWorkdayOfMonth(year, month);
    const tanggalTTD = lastWorkday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const kota = settings.kotaTandatangan || '___________';
    const namaKepala = settings.namaKepalaSekolah || '___________________________';
    const nipKepala = settings.nipKepalaSekolah || '___________________________';
    const namaGuru = profile.nama || '___________________________';
    const nipGuru = profile.nip || '___________________________';
    const namaSekolah = settings.namaSekolah || 'SD NEGERI NUSANTARA';

    const sorted = [...dataBulan].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    try {
      const JsPDF = await loadJsPDF();
      await loadAutoTable();
      const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text(namaSekolah, pageW / 2, 14, { align: 'center' });
      doc.setFontSize(11);
      doc.text('JURNAL MENGAJAR', pageW / 2, 20, { align: 'center' });
      doc.setFont(undefined, 'normal'); doc.setFontSize(9);
      doc.text(`${ctx.loggedInKelas}  |  Bulan: ${bulanNama} ${year}  |  Semester: ${ctx.activeSemester} (${ctx.activeTahun})`, pageW / 2, 26, { align: 'center' });

      const head = [['No', 'Tanggal', 'Mata Pelajaran', 'Tujuan Pembelajaran', 'Materi Pokok', 'Aktivitas Siswa', 'Asesmen']];
      const body = sorted.map((j, idx) => [
        idx + 1, j.tanggal, j.mapel,
        j.tujuanPembelajaran || '-', j.materi,
        j.kegiatan || '-', j.asesmen || '-'
      ]);

      doc.autoTable({
        head, body, startY: 30,
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22 },
          2: { cellWidth: 32 },
          3: { cellWidth: 55 },
          4: { cellWidth: 38 },
          5: { cellWidth: 55 },
          6: { cellWidth: 35 },
        },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        margin: { left: 10, right: 10 },
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      const needNewPage = finalY + 38 > doc.internal.pageSize.getHeight();
      if (needNewPage) doc.addPage();
      const sigY = needNewPage ? 20 : finalY;

      const left = 14; const rightX = pageW / 2 + 10;
      doc.setFontSize(10);
      doc.text('Mengetahui,', left + 20, sigY, { align: 'center' });
      doc.text('Kepala Sekolah', left + 20, sigY + 5, { align: 'center' });
      doc.text(`${kota}, ${tanggalTTD}`, rightX + 20, sigY, { align: 'center' });
      doc.text(`Guru ${ctx.loggedInKelas}`, rightX + 20, sigY + 5, { align: 'center' });
      doc.text(namaKepala, left + 20, sigY + 28, { align: 'center' });
      doc.setDrawColor(0);
      doc.line(left, sigY + 29, left + 40, sigY + 29);
      doc.text(`NIP. ${nipKepala}`, left + 20, sigY + 33, { align: 'center' });
      doc.text(namaGuru, rightX + 20, sigY + 28, { align: 'center' });
      doc.line(rightX, sigY + 29, rightX + 40, sigY + 29);
      doc.text(`NIP. ${nipGuru}`, rightX + 20, sigY + 33, { align: 'center' });

      doc.save(`Jurnal_Mengajar_${ctx.loggedInKelas.replace(' ','_')}_${bulanNama}_${year}.pdf`);
      showToast(`PDF Jurnal ${bulanNama} ${year} berhasil diunduh!`, "success");
    } catch(err) {
      console.error(err);
      showToast("Gagal membuat PDF: " + err.message, "error");
    }
  };

  const handleDownloadTemplateJurnal = async () => {
    try {
      const XLSX = await loadXLSX();
      // Use plain text date string as cell value so Excel doesn't convert it to serial
      const ws = XLSX.utils.aoa_to_sheet([
        ['Tanggal', 'Mata Pelajaran', 'TP', 'Materi Pokok', 'Aktivitas Siswa', 'Asesmen'],
        ['2025-07-14', MAPEL_OPTIONS[0], 'Siswa mampu ...', 'Contoh materi', 'Diskusi kelompok', 'Tes lisan'],
      ]);
      // Force Tanggal column as text
      ws['A2'] = { t: 's', v: '2025-07-14' };
      ws['!cols'] = [{wch:14},{wch:28},{wch:40},{wch:30},{wch:35},{wch:25}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Jurnal');
      XLSX.writeFile(wb, 'Template_Jurnal_Mengajar.xlsx');
    } catch(err) { showToast("Gagal membuat template", "error"); }
  };

  // Convert Excel serial date number to YYYY-MM-DD string
  const excelSerialToDate = (serial) => {
    const utc_days = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleImportJurnal = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          // cellDates:false so we get raw values and handle dates ourselves
          const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { raw: true });
          if (data.length === 0) return showToast("File Excel kosong", "error");
          let count = 0;
          for (const row of data) {
            let tanggal = row['Tanggal'];
            if (!tanggal) continue;
            // If numeric (Excel serial date), convert to YYYY-MM-DD
            if (typeof tanggal === 'number') {
              tanggal = excelSerialToDate(tanggal);
            } else {
              tanggal = tanggal.toString().trim();
            }
            // Validate YYYY-MM-DD pattern
            if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) continue;
            const mapel = row['Mata Pelajaran'] ? row['Mata Pelajaran'].toString().trim() : '';
            const materi = row['Materi Pokok'] ? row['Materi Pokok'].toString().trim() : '';
            if (!materi) continue;
            const newId = generateId();
            await setDoc(doc(db, 'users', ctx.dbId, 'journals', newId), {
              tanggal,
              mapel: mapel || MAPEL_OPTIONS[0],
              tujuanPembelajaran: (row['TP'] || '').toString(),
              materi,
              kegiatan: (row['Aktivitas Siswa'] || '').toString(),
              asesmen: (row['Asesmen'] || '').toString(),
              kelas: ctx.loggedInKelas,
              tahun: ctx.activeTahun,
              semester: ctx.activeSemester,
            });
            count++;
          }
          if (count === 0) return showToast("Tidak ada data valid. Pastikan format tanggal YYYY-MM-DD", "error");
          showToast(`${count} jurnal berhasil diimport!`, "success");
        } catch(err) { showToast("Format file tidak sesuai", "error"); }
      };
      reader.readAsBinaryString(file);
    } catch(err) { showToast("Gagal memuat library Excel", "error"); }
    e.target.value = null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Form Jurnal Baru">
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={handleDownloadTemplateJurnal} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
            <Download size={14}/> Template XLSX
          </button>
          <label className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-100 transition">
            <Upload size={14}/> Import XLSX
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportJurnal} />
          </label>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal</label>
            <input type="date" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mata Pelajaran</label>
            <select value={formData.mapel} onChange={e => setFormData({...formData, mapel: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
              {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tujuan Pembelajaran</label>
            <textarea placeholder="Siswa mampu..." value={formData.tujuanPembelajaran} onChange={e => setFormData({...formData, tujuanPembelajaran: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Materi Pokok</label>
            <input type="text" placeholder="Topik hari ini" value={formData.materi} onChange={e => setFormData({...formData, materi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Aktivitas Siswa</label>
            <textarea placeholder="Siswa melakukan..." value={formData.kegiatan} onChange={e => setFormData({...formData, kegiatan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-24 resize-none"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Asesmen / Penilaian</label>
            <input type="text" placeholder="Bentuk penilaian" value={formData.asesmen} onChange={e => setFormData({...formData, asesmen: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-md">Simpan Jurnal</button>
        </form>
      </Modal>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Jurnal Mengajar {ctx.loggedInKelas}</h2>
          <p className="text-slate-500 font-medium mt-1">Catatan pembelajaran {ctx.activeSemester} ({ctx.activeTahun})</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
            <Edit2 size={16}/> + Tambah Jurnal
          </button>
          <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="bg-slate-50 border border-slate-200 text-indigo-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {Array.from({length: 12}, (_, i) => {
              const m = (i + 1).toString().padStart(2, '0');
              const name = new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' });
              return <option key={m} value={m}>{name}</option>
            })}
          </select>
          <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className="bg-slate-50 border border-slate-200 text-indigo-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {[2025,2026,2027,2028,2029,2030,2031].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExportJournal} className="flex items-center gap-2 text-sm text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition shadow-sm">
            <Download size={18} /> Unduh Jurnal
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {journals.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 font-medium shadow-sm flex flex-col items-center justify-center min-h-[300px]">
            <BookOpen size={48} className="text-slate-200 mb-3" />
            Belum ada catatan jurnal untuk periode ini.
          </div>
        )}
        {[...journals].sort((a,b) => b.tanggal.localeCompare(a.tanggal)).map(j => (
          <div key={j.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition group">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-indigo-100 text-indigo-700">
              <span className="text-lg font-black leading-none">{j.tanggal.substring(8,10)}</span>
              <span className="text-[10px] font-bold uppercase mt-0.5">{new Date(j.tanggal + 'T00:00:00').toLocaleString('id-ID', { month: 'short' })}</span>
              <span className="text-[9px] font-bold text-indigo-400">{j.tanggal.substring(0,4)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 text-lg truncate pr-4">{j.mapel}</h4>
                <button onClick={() => handleDelete(j.id)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
              </div>
              {j.tujuanPembelajaran && (
                <p className="text-indigo-600 font-medium text-xs mt-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 line-clamp-2">🎯 {j.tujuanPembelajaran}</p>
              )}
              <p className="text-slate-600 font-medium text-sm mt-1">{j.materi}</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aktivitas</p>
                  <p className="text-sm text-slate-700">{j.kegiatan || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Asesmen</p>
                  <p className="text-sm text-slate-700">{j.asesmen || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// TOOLS COMPONENT
// ==========================================
const ToolsSection = ({ tools, ctx, showToast, guruMapelMode }) => {
  const CATEGORY_OPTIONS = ['ATP', 'Prota', 'Promes', 'Modul Ajar', 'Kisi-kisi dan soal sumatif', 'Kokurikuler'];
  
  const [formData, setFormData] = useState({ nama: '', jenis: 'Modul Ajar', link: '' });
  const [viewMapel, setViewMapel] = useState(guruMapelMode ? KELAS_OPTIONS[0] : MAPEL_OPTIONS[0]);
  const [editingId, setEditingId] = useState(null);
  const [openFolders, setOpenFolders] = useState({ 'Modul Ajar': true, 'Kisi-kisi dan soal sumatif': true });
  const [showModal, setShowModal] = useState(false);

  const toggleFolder = (cat) => setOpenFolders(prev => ({...prev, [cat]: !prev[cat]}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!formData.nama || !formData.link) return showToast("Lengkapi form", "error");
    
    if (editingId) {
      await setDoc(doc(db, 'users', ctx.dbId, 'tools', editingId), {
        ...formData, 
        mapel: viewMapel
      }, { merge: true });
      showToast("Perangkat berhasil diperbarui");
      setEditingId(null);
    } else {
      const newId = generateId();
      await setDoc(doc(db, 'users', ctx.dbId, 'tools', newId), { 
        ...formData, 
        mapel: viewMapel, 
        kelas: ctx.loggedInKelas, 
        tahun: ctx.activeTahun, 
        semester: ctx.activeSemester 
      });
      showToast("Perangkat berhasil ditambahkan");
    }
    setFormData({ nama: '', jenis: formData.jenis, link: '' });
    setShowModal(false);
  };

  const handleEdit = (t) => {
    setFormData({ nama: t.nama, jenis: t.jenis, link: t.link });
    setEditingId(t.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ nama: '', jenis: 'Modul Ajar', link: '' });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', ctx.dbId, 'tools', id));
    showToast("Perangkat dihapus");
  };

  const filteredTools = tools.filter(t => t.mapel === viewMapel);

  const groupedTools = CATEGORY_OPTIONS.reduce((acc, cat) => {
    acc[cat] = filteredTools.filter(t => t.jenis === cat);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Modal isOpen={showModal} onClose={closeModal} title={editingId ? "Edit Dokumen" : "Tambah Dokumen"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">{viewMapel}</div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Dokumen</label>
            <select value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none font-medium">
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nama Spesifik</label>
            <input type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none" placeholder="Cth: Bab 1, Tema 2..." required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tautan / Link GDrive</label>
            <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none" placeholder="https://..." required />
          </div>
          <button type="submit" className={`w-full font-bold py-2.5 rounded-xl transition text-white ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {editingId ? "Simpan Perubahan" : "Simpan Tautan"}
          </button>
        </form>
      </Modal>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Perangkat Mengajar</h2>
          <p className="text-slate-500 font-medium mt-1">Kelola tautan dokumen {ctx.activeSemester} ({ctx.activeTahun})</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <select value={viewMapel} onChange={(e) => setViewMapel(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold outline-none">
            {guruMapelMode
              ? KELAS_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)
              : MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)
            }
          </select>
          <button onClick={() => { setFormData({ nama: '', jenis: 'Modul Ajar', link: '' }); setEditingId(null); setShowModal(true); }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
            <FolderOpen size={16}/> + Tambah Dokumen
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTools.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 font-medium shadow-sm">
            Belum ada dokumen perangkat untuk <b>{viewMapel}</b>.
          </div>
        ) : (
          CATEGORY_OPTIONS.map(cat => {
            const items = groupedTools[cat];
            if(items.length === 0) return null;
            
            const isFolderType = cat === 'Modul Ajar' || cat === 'Kisi-kisi dan soal sumatif';
            const isOpen = openFolders[cat];

            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {isFolderType && (
                  <button onClick={() => toggleFolder(cat)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Folder className="text-amber-500 fill-amber-100" size={24} />
                      <span className="font-black text-slate-700">{cat} <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full ml-2">{items.length}</span></span>
                    </div>
                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {(!isFolderType || isOpen) && (
                  <div className={`p-4 space-y-3 ${!isFolderType && 'pt-4'}`}>
                    {!isFolderType && <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{cat}</h4>}
                    {items.map(t => (
                      <div key={t.id} className="flex items-center gap-4 bg-white border border-slate-100 p-3 rounded-xl hover:shadow-md transition">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                          <FolderOpen size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{t.nama}</h4>
                          <a href={t.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors w-max">
                            <ExternalLink size={12} /> Buka Tautan
                          </a>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(t)} className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ==========================================
// GRADES COMPONENT
// ==========================================
const GradesSection = ({ students, grades, ctx, showToast }) => {
  const [mapelAktif, setMapelAktif] = useState(MAPEL_OPTIONS[0]);

  const handleGradeChange = async (siswaId, field, value) => {
    let existing = grades.find(g => g.siswaId === siswaId && g.mapel === mapelAktif);
    let updatedData = { [field]: value };
    
    if (existing) {
      await setDoc(doc(db, 'users', ctx.dbId, 'grades', existing.id), updatedData, { merge: true });
    } else {
      const newId = generateId();
      await setDoc(doc(db, 'users', ctx.dbId, 'grades', newId), { 
        siswaId, mapel: mapelAktif, 
        kelas: ctx.loggedInKelas, tahun: ctx.activeTahun, semester: ctx.activeSemester, 
        ...updatedData 
      });
    }
  };

  const handleExportGrades = () => {
    if(students.length === 0) return showToast("Tidak ada data siswa", "error");

    const exportData = students.map((s, idx) => {
      const g = grades.find(gd => gd.siswaId === s.id && gd.mapel === mapelAktif) || {};
      
      let sumSumatif = 0; let countSumatif = 0;
      [1,2,3,4,5,6,7,8].forEach(num => {
        if (g[`s${num}`]) { sumSumatif += Number(g[`s${num}`]); countSumatif++; }
      });
      const avgSumatif = countSumatif > 0 ? (sumSumatif / countSumatif) : 0;
      const akhir = Number(g.akhir || 0);
      
      let finalGrade = 0;
      if (avgSumatif > 0 && akhir > 0) finalGrade = Math.round((avgSumatif + akhir) / 2); 
      else if (avgSumatif > 0) finalGrade = Math.round(avgSumatif); 
      else if (akhir > 0) finalGrade = akhir;

      return {
        "No": idx + 1,
        "Nama Lengkap": s.nama,
        "S1": g.s1 || '',
        "S2": g.s2 || '',
        "S3": g.s3 || '',
        "S4": g.s4 || '',
        "S5": g.s5 || '',
        "S6": g.s6 || '',
        "S7": g.s7 || '',
        "S8": g.s8 || '',
        "Asesmen Akhir Sem": g.akhir || '',
        "Nilai Akhir": finalGrade || ''
      };
    });

    exportToExcel(exportData, `Rekap_Nilai_${mapelAktif}_${ctx.loggedInKelas}`, showToast);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Rekap Nilai {ctx.loggedInKelas}</h2>
          <p className="text-slate-500 font-medium mt-1">Penilaian {ctx.activeSemester} ({ctx.activeTahun})</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <select value={mapelAktif} onChange={(e) => setMapelAktif(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-800 w-full md:w-auto px-4 py-2.5 rounded-xl font-bold outline-none">
            {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={handleExportGrades} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
             <Download size={18}/> Export .xlsx
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800 text-slate-100 text-sm">
                <th rowSpan="2" className="p-4 font-bold border-r border-slate-700 w-12 text-center">No</th>
                <th rowSpan="2" className="p-4 font-bold border-r border-slate-700 min-w-[200px]">Nama Lengkap</th>
                <th colSpan="8" className="p-4 font-bold border-r border-slate-700 text-center bg-slate-700">Nilai Sumatif Lingkup Materi</th>
                <th rowSpan="2" className="p-4 font-bold border-r border-slate-700 text-center w-28 bg-indigo-900 leading-tight">Asesmen<br/>Akhir Sem.</th>
                <th rowSpan="2" className="p-4 font-bold text-center w-28 bg-emerald-900 leading-tight group relative cursor-help">
                  Nilai Akhir
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal">
                    Rumus: (Rata-rata Sumatif + Asesmen Akhir Semester) / 2
                  </div>
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-500 text-xs text-center border-b border-slate-200">
                {[1,2,3,4,5,6,7,8].map(num => (
                  <th key={num} className="p-2 font-bold border-r border-slate-200 w-16">S{num}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const g = grades.find(gd => gd.siswaId === s.id && gd.mapel === mapelAktif) || {};
                
                let sumSumatif = 0; let countSumatif = 0;
                [1,2,3,4,5,6,7,8].forEach(num => {
                  if (g[`s${num}`]) { sumSumatif += Number(g[`s${num}`]); countSumatif++; }
                });
                
                const avgSumatif = countSumatif > 0 ? (sumSumatif / countSumatif) : 0;
                const akhir = Number(g.akhir || 0);
                
                let finalGrade = 0;
                if (avgSumatif > 0 && akhir > 0) finalGrade = Math.round((avgSumatif + akhir) / 2); 
                else if (avgSumatif > 0) finalGrade = Math.round(avgSumatif); 
                else if (akhir > 0) finalGrade = akhir; 

                const isRendah = finalGrade > 0 && finalGrade < 70;

                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-100 truncate max-w-[200px]">{s.nama}</td>
                    {[1,2,3,4,5,6,7,8].map(num => (
                      <td key={num} className="p-1 border-r border-slate-100">
                        <input type="number" min="0" max="100" value={g[`s${num}`] || ''} onChange={(e) => handleGradeChange(s.id, `s${num}`, e.target.value)}
                          className="w-12 p-2 text-center bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                      </td>
                    ))}
                    <td className="px-2 py-2 bg-indigo-50/20">
                      <input type="number" min="0" max="100" value={g.akhir || ''} onChange={(e) => handleGradeChange(s.id, 'akhir', e.target.value)}
                          className="w-16 mx-auto block p-2 text-center bg-white border border-indigo-200 rounded-lg text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all" />
                    </td>
                    <td className="px-4 py-3 text-center bg-emerald-50/20 font-black">
                       <span className={`px-4 py-1.5 rounded-lg border block w-14 mx-auto ${isRendah ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                         {finalGrade || '-'}
                       </span>
                    </td>
                  </tr>
                )
              })}
              {students.length === 0 && (
                <tr><td colSpan="13" className="px-4 py-12 text-center text-slate-400 font-medium">Belum ada data siswa.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// GURU MAPEL — DATA SISWA (read-only all kelas)
// ==========================================
const StudentSectionGuruMapel = ({ allStudentsByKelas, ctx }) => {
  const [viewKelas, setViewKelas] = useState(KELAS_OPTIONS[0]);
  const siswaTampil = (allStudentsByKelas[viewKelas] || [])
    .filter(s => s.tahun === ctx.activeTahun)
    .sort((a,b) => a.nama.localeCompare(b.nama));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Data Siswa</h2>
          <p className="text-slate-500 font-medium mt-1">Tahun {ctx.activeTahun} • {siswaTampil.length} Siswa</p>
        </div>
        <select value={viewKelas} onChange={e=>setViewKelas(e.target.value)} className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2.5 rounded-xl font-bold outline-none">
          {KELAS_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-bold w-12 text-center">No</th>
                <th className="p-4 font-bold">Nama Lengkap</th>
                <th className="p-4 font-bold">NIS / NISN</th>
                <th className="p-4 font-bold text-center">L/P</th>
              </tr>
            </thead>
            <tbody>
              {siswaTampil.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Belum ada data siswa di kelas ini.</td></tr>
              ) : siswaTampil.map((s,idx) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="p-4 text-center font-bold text-slate-400">{idx+1}</td>
                  <td className="p-4 font-bold text-slate-800">{s.nama}</td>
                  <td className="p-4 text-slate-600 text-sm">{s.nis||'-'} / {s.nisn||'-'}</td>
                  <td className="p-4 text-center"><span className={`px-2 py-1 rounded-md text-xs font-bold ${s.jk==='L'?'bg-blue-50 text-blue-600':'bg-pink-50 text-pink-600'}`}>{s.jk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// GURU MAPEL — JURNAL (per kelas, bukan per mapel)
// ==========================================
const JournalSectionGuruMapel = ({ journals, allStudentsByKelas, ctx, showToast, settings, profile, mapelGuru }) => {
  const [formData, setFormData] = useState({ tanggal: getTodayDate(), kelas: KELAS_OPTIONS[0], tujuanPembelajaran: '', materi: '', kegiatan: '', asesmen: '' });
  const [exportKelas, setExportKelas] = useState(KELAS_OPTIONS[0]);
  const [viewKelas, setViewKelas] = useState('Semua');
  const [exportMonth, setExportMonth] = useState(getTodayDate().substring(5,7));
  const [exportYear, setExportYear] = useState(getTodayDate().substring(0,4));
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.materi) return showToast("Materi wajib diisi", "error");
    const newId = generateId();
    await setDoc(doc(db, 'users', ctx.dbId, 'journals', newId), {
      ...formData, mapel: mapelGuru,
      tahun: ctx.activeTahun, semester: ctx.activeSemester,
    });
    showToast("Jurnal berhasil disimpan");
    setFormData({ ...formData, tujuanPembelajaran: '', materi: '', kegiatan: '', asesmen: '' });
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', ctx.dbId, 'journals', id));
    showToast("Jurnal dihapus");
  };

  // Filter jurnal untuk tampilan card - normalize kelas field
  const filteredJournals = [...journals]
    .filter(j => {
      if (viewKelas === 'Semua') return true;
      const jKelas = (j.kelas || '').trim();
      return jKelas === viewKelas;
    })
    .sort((a,b) => b.tanggal.localeCompare(a.tanggal));

  const getLastWorkdayOfMonth = (year, month) => {
    let d = new Date(year, month, 0);
    while (d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()-1);
    return d;
  };

  const handleDownloadTemplateJurnal = async () => {
    try {
      const XLSX = await loadXLSX();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Tanggal', 'Kelas', 'TP', 'Materi Pokok', 'Aktivitas Siswa', 'Asesmen'],
        ['2025-07-14', 'Kelas 1', 'Siswa mampu ...', 'Contoh materi', 'Diskusi kelompok', 'Tes lisan'],
      ]);
      ws['A2'] = { t:'s', v:'2025-07-14' };
      ws['!cols'] = [{wch:14},{wch:12},{wch:40},{wch:30},{wch:35},{wch:25}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Jurnal');
      XLSX.writeFile(wb, `Template_Jurnal_${mapelGuru.replace(/\s/g,'_')}.xlsx`);
    } catch(err) { showToast("Gagal membuat template", "error"); }
  };

  const excelSerialToDate = (serial) => {
    const d = new Date((serial-25569)*86400*1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  };

  const handleImportJurnal = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type:'binary', cellDates:false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { raw:true });
          if (data.length===0) return showToast("File Excel kosong","error");
          let count=0;
          for (const row of data) {
            let tanggal = row['Tanggal'];
            if (!tanggal) continue;
            if (typeof tanggal==='number') tanggal = excelSerialToDate(tanggal);
            else tanggal = tanggal.toString().trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) continue;
            const kelas = (row['Kelas']||'').toString().trim() || KELAS_OPTIONS[0];
            const materi = (row['Materi Pokok']||'').toString().trim();
            if (!materi) continue;
            await setDoc(doc(db,'users',ctx.dbId,'journals',generateId()), {
              tanggal, kelas, mapel: mapelGuru,
              tujuanPembelajaran: (row['TP']||'').toString(),
              materi, kegiatan: (row['Aktivitas Siswa']||'').toString(),
              asesmen: (row['Asesmen']||'').toString(),
              tahun: ctx.activeTahun, semester: ctx.activeSemester,
            });
            count++;
          }
          if (count===0) return showToast("Tidak ada data valid. Pastikan format tanggal YYYY-MM-DD","error");
          showToast(`${count} jurnal berhasil diimport!`,"success");
        } catch(err) { showToast("Format file tidak sesuai","error"); }
      };
      reader.readAsBinaryString(file);
    } catch(err) { showToast("Gagal memuat library Excel","error"); }
    e.target.value=null;
  };

  const handleExportJurnal = async () => {
    const year=parseInt(exportYear); const month=parseInt(exportMonth);
    const dataBulan = journals.filter(j => {
      if (!j.tanggal||j.tanggal.length<7) return false;
      return (j.kelas||'').trim()===exportKelas && parseInt(j.tanggal.substring(0,4))===year && parseInt(j.tanggal.substring(5,7))===month;
    });
    if (dataBulan.length===0) { showToast("Tidak ada data jurnal di bulan & kelas ini","error"); return; }
    const bulanNama = new Date(year,month-1,1).toLocaleString('id-ID',{month:'long'});
    const lastWorkday = getLastWorkdayOfMonth(year,month);
    const tanggalTTD = lastWorkday.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const kota=settings.kotaTandatangan||'___________';
    const namaKepala=settings.namaKepalaSekolah||'___________________________';
    const nipKepala=settings.nipKepalaSekolah||'___________________________';
    const namaGuru=profile.nama||'___________________________';
    const nipGuru=profile.nip||'___________________________';
    const namaSekolah=settings.namaSekolah||'SD NEGERI NUSANTARA';
    const sorted=[...dataBulan].sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
    try {
      const JsPDF=await loadJsPDF(); await loadAutoTable();
      const doc=new JsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      const pageW=doc.internal.pageSize.getWidth();
      doc.setFontSize(13);doc.setFont(undefined,'bold');
      doc.text(namaSekolah,pageW/2,14,{align:'center'});
      doc.setFontSize(11);doc.text(`JURNAL MENGAJAR ${mapelGuru.toUpperCase()}`,pageW/2,20,{align:'center'});
      doc.setFont(undefined,'normal');doc.setFontSize(9);
      doc.text(`${exportKelas}  |  Bulan: ${bulanNama} ${year}  |  Semester: ${ctx.activeSemester} (${ctx.activeTahun})`,pageW/2,26,{align:'center'});
      const head=[['No','Tanggal','Kelas','Tujuan Pembelajaran','Materi Pokok','Aktivitas Siswa','Asesmen']];
      const body=sorted.map((j,idx)=>[idx+1,j.tanggal,j.kelas||'-',j.tujuanPembelajaran||'-',j.materi,j.kegiatan||'-',j.asesmen||'-']);
      doc.autoTable({head,body,startY:30,styles:{fontSize:8,cellPadding:2},
        columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:22},2:{cellWidth:18},3:{cellWidth:50},4:{cellWidth:38},5:{cellWidth:55},6:{cellWidth:34}},
        headStyles:{fillColor:[79,70,229],textColor:255},alternateRowStyles:{fillColor:[245,245,255]},margin:{left:10,right:10}});
      const finalY=doc.lastAutoTable.finalY+10;
      const needNew=finalY+38>doc.internal.pageSize.getHeight();
      if(needNew)doc.addPage();
      const sigY=needNew?20:finalY; const left=14; const rightX=pageW/2+10;
      doc.setFontSize(10);
      doc.text('Mengetahui,',left+20,sigY,{align:'center'});doc.text('Kepala Sekolah',left+20,sigY+5,{align:'center'});
      doc.text(`${kota}, ${tanggalTTD}`,rightX+20,sigY,{align:'center'});doc.text(`Guru ${mapelGuru}`,rightX+20,sigY+5,{align:'center'});
      doc.text(namaKepala,left+20,sigY+28,{align:'center'});doc.setDrawColor(0);
      doc.line(left,sigY+29,left+40,sigY+29);doc.text(`NIP. ${nipKepala}`,left+20,sigY+33,{align:'center'});
      doc.text(namaGuru,rightX+20,sigY+28,{align:'center'});doc.line(rightX,sigY+29,rightX+40,sigY+29);doc.text(`NIP. ${nipGuru}`,rightX+20,sigY+33,{align:'center'});
      doc.save(`Jurnal_${mapelGuru.replace(/\s/g,'_')}_${exportKelas.replace(' ','_')}_${bulanNama}_${year}.pdf`);
      showToast(`PDF Jurnal berhasil diunduh!`,"success");
    } catch(err){console.error(err);showToast("Gagal membuat PDF: "+err.message,"error");}
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Form Jurnal Baru — ${mapelGuru}`}>
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={handleDownloadTemplateJurnal} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
            <Download size={14}/> Template XLSX
          </button>
          <label className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-100 transition">
            <Upload size={14}/> Import XLSX
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportJurnal}/>
          </label>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal</label>
            <input type="date" value={formData.tanggal} onChange={e=>setFormData({...formData,tanggal:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kelas</label>
            <select value={formData.kelas} onChange={e=>setFormData({...formData,kelas:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
              {KELAS_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tujuan Pembelajaran</label>
            <textarea placeholder="Siswa mampu..." value={formData.tujuanPembelajaran} onChange={e=>setFormData({...formData,tujuanPembelajaran:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Materi Pokok</label>
            <input type="text" placeholder="Topik hari ini" value={formData.materi} onChange={e=>setFormData({...formData,materi:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none" required/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Aktivitas Siswa</label>
            <textarea placeholder="Siswa melakukan..." value={formData.kegiatan} onChange={e=>setFormData({...formData,kegiatan:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Asesmen / Penilaian</label>
            <input type="text" placeholder="Bentuk penilaian" value={formData.asesmen} onChange={e=>setFormData({...formData,asesmen:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none"/>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-md">Simpan Jurnal</button>
        </form>
      </Modal>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Jurnal Mengajar {mapelGuru}</h2>
          <p className="text-slate-500 font-medium mt-1">Catatan pembelajaran {ctx.activeSemester} ({ctx.activeTahun})</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
            <Edit2 size={16}/> + Tambah Jurnal
          </button>
          <select value={exportKelas} onChange={e=>setExportKelas(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {KELAS_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          <select value={exportMonth} onChange={e=>setExportMonth(e.target.value)} className="bg-slate-50 border border-slate-200 text-indigo-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {Array.from({length:12},(_,i)=>{const m=(i+1).toString().padStart(2,'0');return <option key={m} value={m}>{new Date(2000,i,1).toLocaleString('id-ID',{month:'long'})}</option>})}
          </select>
          <select value={exportYear} onChange={e=>setExportYear(e.target.value)} className="bg-slate-50 border border-slate-200 text-indigo-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {[2025,2026,2027,2028,2029,2030,2031].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExportJurnal} className="flex items-center gap-2 text-sm text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition shadow-sm">
            <Download size={18}/> Unduh Jurnal
          </button>
        </div>
      </div>

      {/* Filter kelas untuk tampilan card */}
      <div className="flex items-center gap-2 flex-wrap">
        {['Semua', ...KELAS_OPTIONS].map(k => {
          const count = k === 'Semua'
            ? journals.length
            : journals.filter(j => (j.kelas || '').trim() === k).length;
          return (
            <button key={k} onClick={() => setViewKelas(k)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${viewKelas === k ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {k} <span className={`ml-1 ${viewKelas === k ? 'text-indigo-200' : 'text-slate-400'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Card list */}
      <div className="space-y-4">
        {filteredJournals.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 font-medium shadow-sm flex flex-col items-center justify-center min-h-[200px]">
            <BookOpen size={48} className="text-slate-200 mb-3"/>Belum ada catatan jurnal untuk periode ini.
          </div>
        )}
        {filteredJournals.map(j=>(
          <div key={j.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition group">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-indigo-100 text-indigo-700">
              <span className="text-lg font-black leading-none">{j.tanggal.substring(8,10)}</span>
              <span className="text-[10px] font-bold uppercase mt-0.5">{new Date(j.tanggal+'T00:00:00').toLocaleString('id-ID',{month:'short'})}</span>
              <span className="text-[9px] font-bold text-indigo-400">{j.tanggal.substring(0,4)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{j.kelas || '-'}</h4>
                  <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{mapelGuru}</span>
                </div>
                <button onClick={()=>handleDelete(j.id)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
              </div>
              {j.tujuanPembelajaran&&<p className="text-indigo-600 font-medium text-xs mt-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 line-clamp-2">🎯 {j.tujuanPembelajaran}</p>}
              <p className="text-slate-600 font-medium text-sm mt-1">{j.materi}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aktivitas</p><p className="text-xs text-slate-700">{j.kegiatan||'-'}</p></div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Asesmen</p><p className="text-xs text-slate-700">{j.asesmen||'-'}</p></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// GURU MAPEL — REKAP NILAI (per kelas 1-6)
// ==========================================
const GradesSectionGuruMapel = ({ allStudentsByKelas, grades, ctx, showToast, mapelGuru }) => {
  const [kelasAktif, setKelasAktif] = useState(KELAS_OPTIONS[0]);

  const students = (allStudentsByKelas[kelasAktif]||[])
    .filter(s=>s.tahun===ctx.activeTahun)
    .sort((a,b)=>a.nama.localeCompare(b.nama));

  const handleGradeChange = async (siswaId, field, value) => {
    let existing = grades.find(g=>g.siswaId===siswaId && g.kelas===kelasAktif);
    if (existing) {
      await setDoc(doc(db,'users',ctx.dbId,'grades',existing.id),{[field]:value},{merge:true});
    } else {
      await setDoc(doc(db,'users',ctx.dbId,'grades',generateId()),{
        siswaId, mapel: mapelGuru, kelas: kelasAktif,
        tahun: ctx.activeTahun, semester: ctx.activeSemester, [field]:value
      });
    }
  };

  const handleExportGrades = () => {
    if (students.length===0) return showToast("Tidak ada data siswa","error");
    const exportData = students.map((s,idx)=>{
      const g=grades.find(gd=>gd.siswaId===s.id&&gd.kelas===kelasAktif)||{};
      let sum=0,cnt=0;
      [1,2,3,4,5,6,7,8].forEach(n=>{if(g[`s${n}`]){sum+=Number(g[`s${n}`]);cnt++;}});
      const avg=cnt>0?sum/cnt:0; const akhir=Number(g.akhir||0);
      let final=0;
      if(avg>0&&akhir>0)final=Math.round((avg+akhir)/2);else if(avg>0)final=Math.round(avg);else if(akhir>0)final=akhir;
      return {"No":idx+1,"Nama":s.nama,"S1":g.s1||'',"S2":g.s2||'',"S3":g.s3||'',"S4":g.s4||'',"S5":g.s5||'',"S6":g.s6||'',"S7":g.s7||'',"S8":g.s8||'',"Asesmen Akhir":g.akhir||'',"Nilai Akhir":final||''};
    });
    exportToExcel(exportData,`Rekap_Nilai_${mapelGuru.replace(/\s/g,'_')}_${kelasAktif.replace(' ','_')}`,showToast);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Rekap Nilai {mapelGuru}</h2>
          <p className="text-slate-500 font-medium mt-1">Penilaian {ctx.activeSemester} ({ctx.activeTahun})</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <select value={kelasAktif} onChange={e=>setKelasAktif(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-800 w-full md:w-auto px-4 py-2.5 rounded-xl font-bold outline-none">
            {KELAS_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={handleExportGrades} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
            <Download size={18}/> Export .xlsx
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800 text-slate-100 text-sm">
                <th rowSpan="2" className="p-4 font-bold border-r border-slate-700 w-12 text-center">No</th>
                <th rowSpan="2" className="p-4 font-bold border-r border-slate-700 min-w-[200px]">Nama Lengkap</th>
                <th colSpan="8" className="p-4 font-bold border-r border-slate-700 text-center bg-slate-700">Nilai Sumatif Lingkup Materi</th>
                <th rowSpan="2" className="p-4 font-bold border-r border-slate-700 text-center w-28 bg-indigo-900 leading-tight">Asesmen<br/>Akhir Sem.</th>
                <th rowSpan="2" className="p-4 font-bold text-center w-28 bg-emerald-900 leading-tight">Nilai Akhir</th>
              </tr>
              <tr className="bg-slate-50 text-slate-500 text-xs text-center border-b border-slate-200">
                {[1,2,3,4,5,6,7,8].map(n=><th key={n} className="p-2 font-bold border-r border-slate-200 w-16">S{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((s,idx)=>{
                const g=grades.find(gd=>gd.siswaId===s.id&&gd.kelas===kelasAktif)||{};
                let sum=0,cnt=0;
                [1,2,3,4,5,6,7,8].forEach(n=>{if(g[`s${n}`]){sum+=Number(g[`s${n}`]);cnt++;}});
                const avg=cnt>0?sum/cnt:0; const akhir=Number(g.akhir||0);
                let final=0;
                if(avg>0&&akhir>0)final=Math.round((avg+akhir)/2);else if(avg>0)final=Math.round(avg);else if(akhir>0)final=akhir;
                const isRendah=final>0&&final<70;
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx+1}</td>
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-100 truncate max-w-[200px]">{s.nama}</td>
                    {[1,2,3,4,5,6,7,8].map(n=>(
                      <td key={n} className="p-1 border-r border-slate-100">
                        <input type="number" min="0" max="100" value={g[`s${n}`]||''} onChange={e=>handleGradeChange(s.id,`s${n}`,e.target.value)} className="w-12 p-2 text-center bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"/>
                      </td>
                    ))}
                    <td className="px-2 py-2 bg-indigo-50/20">
                      <input type="number" min="0" max="100" value={g.akhir||''} onChange={e=>handleGradeChange(s.id,'akhir',e.target.value)} className="w-16 mx-auto block p-2 text-center bg-white border border-indigo-200 rounded-lg text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"/>
                    </td>
                    <td className="px-4 py-3 text-center bg-emerald-50/20 font-black">
                      <span className={`px-4 py-1.5 rounded-lg border block w-14 mx-auto ${isRendah?'bg-rose-100 text-rose-700 border-rose-200':'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{final||'-'}</span>
                    </td>
                  </tr>
                );
              })}
              {students.length===0&&<tr><td colSpan="13" className="px-4 py-12 text-center text-slate-400 font-medium">Belum ada data siswa di kelas ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. SETTINGS COMPONENT
// ==========================================
const SettingsSection = ({ settings, profile, ctx, showToast }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localProfile, setLocalProfile] = useState(profile);

  const handleSave = async () => {
    if(!localSettings.password) {
      return showToast("Password tidak boleh kosong", "error");
    }

    await setDoc(doc(db, 'users', ctx.dbId, 'data', 'settings'), localSettings);
    await setDoc(doc(db, 'users', ctx.dbId, 'data', 'profile'), localProfile);
    
    // Sync LocalStorage untuk nama sekolah secara global agar muncul saat login
    localStorage.setItem('appLogoSekolah', localSettings.logoUrl || '');
    localStorage.setItem('sg_schoolName', localSettings.namaSekolah || '');
    
    showToast("Pengaturan berhasil disimpan");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalProfile(prev => ({ ...prev, foto: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalSettings(prev => ({ ...prev, logoUrl: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800">Pengaturan Sistem</h2>
        <p className="text-slate-500 font-medium mt-1">Sesuaikan data sekolah, profil, dan akses login <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded ml-1 font-bold">{ctx.loggedInKelas}</span></p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Data Sekolah & Autentikasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <Settings className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-lg">Sekolah & Keamanan</h3>
          </div>
          
          <div className="flex flex-col items-start gap-2 mb-2">
            <label className="block text-sm font-bold text-slate-600">Logo Sekolah</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {localSettings.logoUrl ? (
                  <img src={localSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="text-slate-300" />
                )}
              </div>
              <label className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50 transition">
                Upload Logo Baru
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Nama Sekolah</label>
            <input type="text" value={localSettings.namaSekolah || ''} onChange={e => setLocalSettings({...localSettings, namaSekolah: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Cth: SD Negeri Nusantara" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Nama Kepala Sekolah</label>
            <input type="text" value={localSettings.namaKepalaSekolah || ''} onChange={e => setLocalSettings({...localSettings, namaKepalaSekolah: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Beserta Gelar" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">NIP Kepala Sekolah</label>
            <input type="text" value={localSettings.nipKepalaSekolah || ''} onChange={e => setLocalSettings({...localSettings, nipKepalaSekolah: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nomor Induk Pegawai" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Kota Penandatanganan</label>
            <input type="text" value={localSettings.kotaTandatangan || ''} onChange={e => setLocalSettings({...localSettings, kotaTandatangan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Cth: Sumenep" />
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2"><Lock size={16}/> Akses Login {ctx.loggedInKelas}</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Password Baru</label>
              <input type="text" value={localSettings.password || ''} onChange={e => setLocalSettings({...localSettings, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <p className="text-[10px] text-amber-600 mt-2 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100">Simpan perubahan dan gunakan password ini untuk login kelas ini berikutnya.</p>
          </div>
        </div>

        {/* Profil Guru */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <User className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-lg">Profil Guru {ctx.loggedInKelas}</h3>
          </div>
          
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden relative group">
              {localProfile.foto ? (
                <img src={localProfile.foto} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-slate-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                <ImageIcon className="text-white" size={24} />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <p className="text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Klik foto untuk mengubah</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Nama Lengkap Guru</label>
            <input type="text" value={localProfile.nama} onChange={e => setLocalProfile({...localProfile, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Beserta Gelar" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">NIP</label>
            <input type="text" value={localProfile.nip} onChange={e => setLocalProfile({...localProfile, nip: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nomor Induk Pegawai" />
          </div>
        </div>

      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2">
          <Check size={20}/> Simpan Semua Pengaturan
        </button>
      </div>
    </div>
  );
};