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

// ==========================================
// MAIN APP COMPONENT
// ==========================================
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
  const [activeTahun, setActiveTahun] = useState('2026/2027');
  const [activeSemester, setActiveSemester] = useState('Ganjil');

  // Data States
  const [settings, setSettings] = useState({ 
    logoUrl: '', 
    namaSekolah: 'SD NEGERI NUSANTARA',
    username: '',
    password: ''
  });
  const [profile, setProfile] = useState({ nama: '', nip: '', foto: '' });
  const [students, setStudents] = useState([]);
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
      unsubSettings(); unsubProfile(); unsubStudents(); unsubAttendance(); unsubJournals(); unsubTools(); unsubGrades();
    };
  }, [isEntered, dbId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      // Buat ID Database berdasarkan kelas yang dipilih (ex: db_kelas_1)
      const targetDbId = `db_${loginKelas.replace(' ', '_').toLowerCase()}`;
      const settingsRef = doc(db, 'users', targetDbId, 'data', 'settings');
      const docSnap = await getDoc(settingsRef);

      let isLoginValid = false;
      const kelasNumber = loginKelas.split(' ')[1]; // Ambil angka kelas
      const defaultUserPass = `guru${kelasNumber}`; // ex: guru1

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.username === loginUser && data.password === loginPass) {
          isLoginValid = true;
        }
      } else {
        // Jika belum pernah disetting, gunakan password default
        if (loginUser === defaultUserPass && loginPass === defaultUserPass) {
          isLoginValid = true;
          // Buat doc default agar tidak error
          await setDoc(settingsRef, {
             username: defaultUserPass, 
             password: defaultUserPass,
             namaSekolah: settings.namaSekolah
          }, { merge: true });
        }
      }

      if (isLoginValid) {
        setLoggedInKelas(loginKelas);
        setDbId(targetDbId);
        setIsEntered(true);
        showToast(`Berhasil masuk sebagai Guru ${loginKelas}`);
      } else {
        showToast("Username atau Password salah!", "error");
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
                </select>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-slate-400" />
              </div>
              <input 
                type="text" value={loginUser} onChange={(e)=>setLoginUser(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Username" 
              />
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

  const mainNavItems = [
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

  const filterCtx = { activeTahun, activeSemester, loggedInKelas, dbId };

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

          <select value={activeTahun} onChange={(e)=>setActiveTahun(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-indigo-500">
            {['2026/2027','2027/2028','2028/2029','2029/2030'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={activeSemester} onChange={(e)=>setActiveSemester(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-indigo-500">
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
          {activeTab === 'dashboard' && <Dashboard profile={profile} students={classStudents} attendance={classAttendance} journals={classJournals} ctx={filterCtx} setActiveTab={setActiveTab} />}
          {activeTab === 'students' && <StudentSection students={classStudents} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'attendance' && <AttendanceSection students={classStudents} attendance={classAttendance} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'journal' && <JournalSection journals={classJournals} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'tools' && <ToolsSection tools={classTools} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'grades' && <GradesSection students={classStudents} grades={classGrades} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'settings' && <SettingsSection settings={settings} profile={profile} ctx={filterCtx} showToast={showToast} />}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 1. DASHBOARD COMPONENT
// ==========================================
const Dashboard = ({ profile, students, attendance, journals, ctx, setActiveTab }) => {
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
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">{profile?.nama || `Guru ${ctx.loggedInKelas}`}</h2>
          <p className="text-slate-500 font-bold mb-4">
            NIP. {profile?.nip || '-'} <span className="mx-2 text-slate-300">|</span> Wali {ctx.loggedInKelas}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
             <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
               <span className="block text-[10px] uppercase font-bold text-indigo-400">Total Siswa</span>
               <span className="text-lg font-black text-indigo-700">{students.length} Anak</span>
             </div>
             <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
               <span className="block text-[10px] uppercase font-bold text-emerald-400">Hadir Hari Ini</span>
               <span className="text-lg font-black text-emerald-700">{presentToday} Anak</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> Aksi Cepat</h3>
            <div className="space-y-3">
              <button onClick={() => setActiveTab('attendance')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100 hover:border-indigo-100 rounded-xl transition font-bold text-slate-600 text-sm">
                <div className="flex items-center gap-3"><CalendarCheck size={18} /> Isi Absensi Kelas</div>
                <ChevronRight size={16} />
              </button>
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
                    <h4 className="font-bold text-slate-800 text-base truncate">{j.mapel}</h4>
                    <p className="text-slate-500 text-sm truncate">{j.materi}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-4">
        {!isAbsenLengkap && (
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama) return showToast("Nama wajib diisi", "error");
    const newId = generateId();
    const newStudent = { ...formData, kelas: ctx.loggedInKelas, tahun: ctx.activeTahun };
    await setDoc(doc(db, 'users', ctx.dbId, 'students', newId), newStudent);
    showToast("Data siswa berhasil ditambahkan");
    setFormData({ nisn: '', nis: '', nama: '', jk: 'L' });
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Data Siswa <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-lg ml-2">{ctx.loggedInKelas}</span></h2>
          <p className="text-slate-500 font-medium mt-1">Tahun {ctx.activeTahun} • Total: {students.length} Siswa</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
           <label className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-100 font-bold transition border border-emerald-100">
              <Upload size={18} /> Import Excel (.xlsx)
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
           </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-800 mb-2">Tambah Siswa Baru</h3>
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
        </div>

        <div className="lg:col-span-2">
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
      </div>
    </div>
  );
};

// ==========================================
// 3. ATTENDANCE COMPONENT
// ==========================================
const AttendanceSection = ({ students, attendance, ctx, showToast }) => {
  const [date, setDate] = useState(getTodayDate());
  const [exportMonth, setExportMonth] = useState(getTodayDate().substring(5, 7));

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

  const handleExport = () => {
    const dataBulanIni = attendance.filter(a => a.tanggal.substring(5, 7) === exportMonth);
    if (dataBulanIni.length === 0) return showToast("Tidak ada data absensi di bulan ini", "error");

    const uniqueDates = [...new Set(dataBulanIni.map(a => a.tanggal))];
    const exportData = students.map(s => {
      let hadir=0, sakit=0, ijin=0, alpa=0; 
      uniqueDates.forEach(d => {
        const att = dataBulanIni.find(a => a.siswaId === s.id && a.tanggal === d);
        const st = att ? att.status : '-';
        if(st==='Hadir') hadir++; if(st==='Sakit') sakit++; if(st==='Izin') ijin++; if(st==='Alpha') alpa++; 
      });
      return { "Nama Siswa": s.nama, "Hadir": hadir, "Ijin": ijin, "Sakit": sakit, "Alpa": alpa };
    });
    exportToExcel(exportData, `Rekap_Absensi_${ctx.loggedInKelas}_Bulan_${exportMonth}`, showToast);
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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="bg-white border border-indigo-200 text-indigo-800 px-3 py-2 rounded-xl font-bold text-sm outline-none">
            {Array.from({length: 12}, (_, i) => {
              const m = (i + 1).toString().padStart(2, '0');
              const name = new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' });
              return <option key={m} value={m}>{name}</option>
            })}
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
             <Download size={16}/> Export .xlsx
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
const JournalSection = ({ journals, ctx, showToast }) => {
  const [formData, setFormData] = useState({ tanggal: getTodayDate(), mapel: MAPEL_OPTIONS[0], materi: '', kegiatan: '', asesmen: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mapel || !formData.materi) return showToast("Mapel dan Materi wajib diisi", "error");
    const newId = generateId();
    const newJournal = { ...formData, kelas: ctx.loggedInKelas, tahun: ctx.activeTahun, semester: ctx.activeSemester };
    await setDoc(doc(db, 'users', ctx.dbId, 'journals', newId), newJournal);
    showToast("Jurnal berhasil disimpan");
    setFormData({ ...formData, materi: '', kegiatan: '', asesmen: '' });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', ctx.dbId, 'journals', id));
    showToast("Jurnal dihapus");
  };

  const handleExportJournal = () => {
    if(journals.length === 0) return showToast("Tidak ada data jurnal", "error");
    const exportData = journals.map(j => ({
      "Tanggal": j.tanggal, "Mata Pelajaran": j.mapel, "Materi": j.materi,
      "Aktivitas": j.kegiatan || '-', "Asesmen": j.asesmen || '-'
    }));
    exportToExcel(exportData, `Jurnal_Mengajar_${ctx.loggedInKelas}`, showToast);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Jurnal Mengajar {ctx.loggedInKelas}</h2>
          <p className="text-slate-500 font-medium mt-1">Catatan pembelajaran {ctx.activeSemester} ({ctx.activeTahun})</p>
        </div>
        <button onClick={handleExportJournal} className="flex items-center gap-2 text-sm text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition shadow-sm">
          <Download size={18} /> Export (.xlsx)
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit2 size={18} className="text-indigo-600"/> Form Jurnal Baru</h3>
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
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {journals.length === 0 && (
             <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 font-medium shadow-sm flex flex-col items-center justify-center min-h-[300px]">
               <BookOpen size={48} className="text-slate-200 mb-3" />
               Belum ada catatan jurnal untuk periode ini.
             </div>
          )}
          {journals.map(j => (
            <div key={j.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition group">
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-indigo-100 text-indigo-700">
                <span className="text-lg font-black leading-none">{j.tanggal.substring(8,10)}</span>
                <span className="text-[10px] font-bold uppercase mt-1">{new Date(j.tanggal).toLocaleString('id-ID', { month: 'short' })}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 text-lg truncate pr-4">{j.mapel}</h4>
                  <button onClick={() => handleDelete(j.id)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                </div>
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
    </div>
  );
};

// ==========================================
// TOOLS COMPONENT
// ==========================================
const ToolsSection = ({ tools, ctx, showToast }) => {
  const CATEGORY_OPTIONS = ['ATP', 'Prota', 'Promes', 'Modul Ajar', 'Kisi-kisi dan soal sumatif', 'Kokurikuler'];
  
  const [formData, setFormData] = useState({ nama: '', jenis: 'Modul Ajar', link: '' });
  const [viewMapel, setViewMapel] = useState(MAPEL_OPTIONS[0]);
  const [editingId, setEditingId] = useState(null);
  const [openFolders, setOpenFolders] = useState({ 'Modul Ajar': true, 'Kisi-kisi dan soal sumatif': true });

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
  };

  const handleEdit = (t) => {
    setFormData({ nama: t.nama, jenis: t.jenis, link: t.link });
    setEditingId(t.id);
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Perangkat Mengajar</h2>
          <p className="text-slate-500 font-medium mt-1">Kelola tautan dokumen {ctx.activeSemester} ({ctx.activeTahun})</p>
        </div>
        <select value={viewMapel} onChange={(e) => setViewMapel(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold outline-none">
           {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
             <h3 className="font-bold text-slate-800 mb-2 flex flex-col gap-1">
                <span className="flex items-center justify-between">
                  {editingId ? "Edit Dokumen" : "Tambah Dokumen"}
                  {editingId && <button type="button" onClick={()=>{setEditingId(null); setFormData({ nama: '', jenis: 'Modul Ajar', link: '' });}} className="text-xs text-red-500 hover:underline">Batal</button>}
                </span>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">{viewMapel}</span>
             </h3>
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
        </div>
        
        <div className="md:col-span-2 space-y-4">
          {filteredTools.length === 0 ? (
             <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 font-medium shadow-sm">
               Belum ada dokumen perangkat untuk mapel <b>{viewMapel}</b>.
             </div>
          ) : (
            CATEGORY_OPTIONS.map(cat => {
              const items = groupedTools[cat];
              if(items.length === 0) return null;
              
              const isFolderType = cat === 'Modul Ajar' || cat === 'Kisi-kisi dan soal sumatif';
              const isOpen = openFolders[cat];

              return (
                <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  {/* Folder Header */}
                  {isFolderType && (
                    <button onClick={() => toggleFolder(cat)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <Folder className="text-amber-500 fill-amber-100" size={24} />
                        <span className="font-black text-slate-700">{cat} <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full ml-2">{items.length}</span></span>
                      </div>
                      <ChevronDown size={20} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}

                  {/* List Item */}
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
// 5. SETTINGS COMPONENT
// ==========================================
const SettingsSection = ({ settings, profile, ctx, showToast }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localProfile, setLocalProfile] = useState(profile);

  const handleSave = async () => {
    if(!localSettings.username || !localSettings.password) {
      return showToast("Username dan Password tidak boleh kosong", "error");
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
          
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2"><Lock size={16}/> Akses Login {ctx.loggedInKelas}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Username Baru</label>
                <input type="text" value={localSettings.username || ''} onChange={e => setLocalSettings({...localSettings, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Password Baru</label>
                <input type="text" value={localSettings.password || ''} onChange={e => setLocalSettings({...localSettings, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <p className="text-[10px] text-amber-600 mt-2 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100">Simpan perubahan dan gunakan username/password ini untuk login kelas ini berikutnya.</p>
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
