import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home, User, Users, CalendarCheck, BookOpen, FolderOpen, Award, 
  Download, AlertCircle, CheckCircle2, Lock,
  Edit2, Trash2, Upload, Image as ImageIcon, Settings, LogOut, Menu, X, Check,
  Zap, Bell, ChevronRight, CheckSquare, Folder, ChevronDown, ExternalLink, Shield,
  TrendingUp, Eye, EyeOff, FileText
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
// ERROR BOUNDARY
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('🔴 ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-lg w-full">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-red-500 text-2xl">⚠</span>
            </div>
            <h2 className="text-lg font-black text-slate-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-slate-500 text-sm mb-4">Aplikasi mengalami error. Silakan refresh halaman.</p>
            <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-red-600 overflow-auto max-h-40 mb-4">
              {this.state.error?.toString()}
            </pre>
            <button onClick={() => window.location.reload()} className="w-full bg-purple-700 text-white font-bold py-2.5 rounded-xl hover:bg-purple-800 transition">
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

// ==========================================
// KOMPONEN UTAMA: RaporView (FINAL REVISI)
// ==========================================
const RaporView = ({ ctx, students, grades, attendance, settings, profile, showToast }) => {
  const [activeSubMenu, setActiveSubMenu] = React.useState('daftar'); // 'daftar' | 'tp' | 'kokurikuler'
  const [tpData, setTpData]               = React.useState({});
  const [raporData, setRaporData]         = React.useState({});
  const [loadingTP, setLoadingTP]         = React.useState(true);
  const [loadingRapor, setLoadingRapor]   = React.useState(true);
  const [loadingRubrik, setLoadingRubrik] = React.useState(true);

  // State rubrik kokurikuler
  const [rubrikKokurikuler, setRubrikKokurikuler] = React.useState([]);
  const [rubrikForm, setRubrikForm] = React.useState({
    dimensi: 'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia',
    aspek: '',
    sangatBaik: '',
    baik: '',
    cukup: '',
    kurang: ''
  });
  const [rubrikEditId, setRubrikEditId] = React.useState(null);
  const [showRubrikModal, setShowRubrikModal] = React.useState(false);

  // Form tambah TP
  const [tpForm, setTpForm]   = React.useState({ mapel: MAPEL_OPTIONS[0], sKey: 's1', deskripsiTP: '' });
  const [tpEditIdx, setTpEditIdx] = React.useState(null);

  // Pilih siswa dan modal
  const [selectedSiswa, setSelectedSiswa] = React.useState(null);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [showEkstraModal, setShowEkstraModal] = React.useState(false);
  const [showKokurikulerModal, setShowKokurikulerModal] = React.useState(false);
  const [ekstraForm, setEkstraForm] = React.useState({ nama: '', predikat: 'A', kompetensi: '' });
  const [ekstraEditIdx, setEkstraEditIdx] = React.useState(null);

  const sKeyOptions = ['s1','s2','s3','s4','s5','s6','s7','s8'];
  const DIMENSI_P5 = [
    'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia',
    'Berkebinekaan Global',
    'Bergotong Royong',
    'Mandiri',
    'Bernalar Kritis',
    'Kreatif'
  ];
  const PREDIKAT_OPTIONS = ['A', 'B', 'C', 'D'];
  const KOKUR_PREDIKAT_OPTIONS = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];

  // Firestore paths
  const pathTP    = `rapor_tp_${ctx.loggedInKelas}_${ctx.activeSemester}_${ctx.activeTahun}`.replace(/[^a-zA-Z0-9_]/g,'_');
  const pathRapor = `rapor_data_${ctx.loggedInKelas}_${ctx.activeSemester}_${ctx.activeTahun}`.replace(/[^a-zA-Z0-9_]/g,'_');
  const pathRubrik = `rapor_kokurikuler_rubrik_${ctx.loggedInKelas}_${ctx.activeSemester}_${ctx.activeTahun}`.replace(/[^a-zA-Z0-9_]/g,'_');

  // Fetch data
  React.useEffect(() => {
    setLoadingTP(true);
    const unsub1 = onSnapshot(doc(db,'raporTP', pathTP), snap => {
      setTpData(snap.exists() ? (snap.data().tpData || {}) : {});
      setLoadingTP(false);
    });
    setLoadingRapor(true);
    const unsub2 = onSnapshot(doc(db,'raporData', pathRapor), snap => {
      setRaporData(snap.exists() ? (snap.data() || {}) : {});
      setLoadingRapor(false);
    });
    return () => { unsub1(); unsub2(); };
  }, [ctx.loggedInKelas, ctx.activeSemester, ctx.activeTahun]);

  React.useEffect(() => {
    setLoadingRubrik(true);
    const unsub = onSnapshot(doc(db, 'raporKokurikulerRubrik', pathRubrik), snap => {
      if (snap.exists()) {
        setRubrikKokurikuler(snap.data().dimensi || []);
      } else {
        setRubrikKokurikuler([]);
      }
      setLoadingRubrik(false);
    });
    return () => unsub();
  }, [ctx.loggedInKelas, ctx.activeSemester, ctx.activeTahun]);

  const saveTP = async (newTpData) => {
    await setDoc(doc(db,'raporTP', pathTP), { tpData: newTpData, updatedAt: new Date().toISOString() });
  };
  const saveRaporData = async (newData) => {
    await setDoc(doc(db,'raporData', pathRapor), { ...newData, updatedAt: new Date().toISOString() });
  };
  const saveRubrik = async (newDimensi) => {
    await setDoc(doc(db, 'raporKokurikulerRubrik', pathRubrik), {
      dimensi: newDimensi,
      updatedAt: new Date().toISOString()
    });
  };

  // ---- HELPER ----
  const getNilaiAkhirMapel = (siswaId, mapel) => {
    const rec = grades.find(g => (g.siswaId === siswaId || g.id === siswaId) && g.mapel === mapel);
    if (!rec) return null;
    const sKeys = ['s1','s2','s3','s4','s5','s6','s7','s8'];
    const vals = sKeys.map(k => parseFloat(rec[k])).filter(v => !isNaN(v));
    if (!vals.length) return null;
    const rata = vals.reduce((a,b)=>a+b,0) / vals.length;
    const akhir = parseFloat(rec.akhir);
    if (!isNaN(akhir)) return (rata + akhir) / 2;
    return rata;
  };
  const getGradeObjMapel = (siswaId, mapel) => {
    return grades.find(g => (g.siswaId === siswaId || g.id === siswaId) && g.mapel === mapel) || {};
  };
  const daftarMapel = ctx.guruMapelMode
    ? [ctx.loggedInKelas.replace('Guru ','')]
    : MAPEL_OPTIONS;
  const getAbsensi = (siswaId) => {
    const recs = attendance.filter(a => a.siswaId === siswaId);
    return {
      hadir: recs.filter(a=>a.status==='Hadir').length,
      sakit: recs.filter(a=>a.status==='Sakit').length,
      izin:  recs.filter(a=>a.status==='Izin').length,
      alpha: recs.filter(a=>a.status==='Alpha').length,
    };
  };
  const buildDeskripsiMapel = (namaDepan, tpMapel, gradeObj) => {
    if (!tpMapel || tpMapel.length === 0) return '-';
    const pasangan = tpMapel
      .map(tp => ({ sKey: tp.sKey, deskripsi: tp.deskripsiTP, nilai: parseFloat(gradeObj[tp.sKey]) }))
      .filter(p => !isNaN(p.nilai));
    if (pasangan.length === 0) return '-';
    const tertinggi = pasangan.reduce((a, b) => a.nilai >= b.nilai ? a : b);
    const terendah  = pasangan.reduce((a, b) => a.nilai <= b.nilai ? a : b);
    if (tertinggi.sKey === terendah.sKey || pasangan.length === 1) {
      return `Ananda ${namaDepan} menunjukkan kemampuan yang baik dalam ${tertinggi.deskripsi}.`;
    } else {
      return `Ananda ${namaDepan} sangat baik dalam ${tertinggi.deskripsi}.\nNamun perlu peningkatan dalam ${terendah.deskripsi}.`;
    }
  };

  // ---- HANDLER TP ----
  const handleSaveTP = async () => {
    if (!tpForm.deskripsiTP.trim()) { showToast('Deskripsi TP tidak boleh kosong','error'); return; }
    const curr = tpData[tpForm.mapel] || [];
    let updated;
    if (tpEditIdx !== null && tpEditIdx.mapel === tpForm.mapel) {
      updated = curr.map((t,i) => i === tpEditIdx.idx ? { sKey: tpForm.sKey, deskripsiTP: tpForm.deskripsiTP } : t);
    } else {
      updated = [...curr, { sKey: tpForm.sKey, deskripsiTP: tpForm.deskripsiTP }];
    }
    const newTpData = { ...tpData, [tpForm.mapel]: updated };
    await saveTP(newTpData);
    showToast('TP berhasil disimpan!','success');
    setTpEditIdx(null);
    setTpForm(f => ({ ...f, deskripsiTP: '' }));
  };
  const handleDeleteTP = async (mapel, idx) => {
    const updated = (tpData[mapel]||[]).filter((_,i)=>i!==idx);
    const newTpData = { ...tpData, [mapel]: updated };
    await saveTP(newTpData);
    showToast('TP dihapus','success');
  };

  // ---- HANDLER RUBRIK ----
  const handleSaveRubrik = async () => {
    if (!rubrikForm.aspek || !rubrikForm.sangatBaik || !rubrikForm.baik || !rubrikForm.cukup || !rubrikForm.kurang) {
      showToast('Semua field harus diisi', 'error');
      return;
    }
    const newDimensi = [...rubrikKokurikuler];
    if (rubrikEditId !== null) {
      const idx = newDimensi.findIndex(d => d.id === rubrikEditId);
      if (idx !== -1) newDimensi[idx] = { id: rubrikEditId, ...rubrikForm };
    } else {
      const id = generateId();
      newDimensi.push({ id, ...rubrikForm });
    }
    await saveRubrik(newDimensi);
    showToast('Rubrik berhasil disimpan', 'success');
    setShowRubrikModal(false);
    setRubrikForm({ dimensi: DIMENSI_P5[0], aspek: '', sangatBaik: '', baik: '', cukup: '', kurang: '' });
    setRubrikEditId(null);
  };
  const handleDeleteRubrik = async (id) => {
    const newDimensi = rubrikKokurikuler.filter(d => d.id !== id);
    await saveRubrik(newDimensi);
    showToast('Rubrik dihapus', 'success');
  };

  // ---- HANDLER EKSTRA ----
  const handleSaveEkstra = async () => {
    if (!selectedSiswa) return;
    if (!ekstraForm.nama || !ekstraForm.kompetensi) {
      showToast('Nama dan kompetensi wajib diisi', 'error');
      return;
    }
    const siswaData = raporData[selectedSiswa.id] || {};
    const currentEkstra = siswaData.ekstrakurikuler || [];
    let newEkstra;
    if (ekstraEditIdx !== null) {
      newEkstra = currentEkstra.map((e, i) => i === ekstraEditIdx ? ekstraForm : e);
    } else {
      newEkstra = [...currentEkstra, ekstraForm];
    }
    const newRaporData = {
      ...raporData,
      [selectedSiswa.id]: { ...siswaData, ekstrakurikuler: newEkstra }
    };
    await saveRaporData(newRaporData);
    showToast('Ekstrakurikuler disimpan', 'success');
    setShowEkstraModal(false);
    setEkstraForm({ nama: '', predikat: 'A', kompetensi: '' });
    setEkstraEditIdx(null);
  };
  const handleDeleteEkstra = async (siswaId, idx) => {
    const siswaData = raporData[siswaId] || {};
    const newEkstra = (siswaData.ekstrakurikuler || []).filter((_, i) => i !== idx);
    const newRaporData = {
      ...raporData,
      [siswaId]: { ...siswaData, ekstrakurikuler: newEkstra }
    };
    await saveRaporData(newRaporData);
    showToast('Ekstrakurikuler dihapus', 'success');
  };

  // ---- HANDLER KOKURIKULER ----
  const handleSaveKokurikuler = async () => {
    if (!selectedSiswa) return;
    const newRaporData = {
      ...raporData,
      [selectedSiswa.id]: {
        ...(raporData[selectedSiswa.id] || {}),
        kokurikuler: selectedSiswa.kokurikulerTemp
      }
    };
    await saveRaporData(newRaporData);
    showToast('Penilaian kokurikuler disimpan', 'success');
    setShowKokurikulerModal(false);
  };

  const handleSaveCatatan = async (siswaId, catatan) => {
    const newData = { ...raporData, [siswaId]: { ...(raporData[siswaId]||{}), catatanGuru: catatan } };
    await saveRaporData(newData);
  };

  const getDeskripsiEkstra = (predikat, kompetensi) => {
    const predText = { 'A':'Sangat baik', 'B':'Baik', 'C':'Cukup', 'D':'Kurang' }[predikat] || '';
    return `${predText} dalam ${kompetensi}.`;
  };

  const generateDeskripsiKokurikuler = (nilaiSiswa, rubrik, namaDepan) => {
    if (!rubrik.length) return 'Belum ada rubrik penilaian kokurikuler.';
    const deskripsi = [];
    rubrik.forEach(r => {
      const predikat = nilaiSiswa?.[r.dimensi];
      if (!predikat) return;
      let teks = '';
      if (predikat === 'Sangat Baik') teks = r.sangatBaik;
      else if (predikat === 'Baik') teks = r.baik;
      else if (predikat === 'Cukup') teks = r.cukup;
      else if (predikat === 'Kurang') teks = r.kurang;
      if (teks) deskripsi.push(`Dalam dimensi ${r.dimensi}, Ananda ${namaDepan} ${teks}`);
    });
    return deskripsi.join(' ') || 'Belum ada penilaian kokurikuler.';
  };

  // ---- CETAK PDF (REVISI FINAL) ----
  const handleCetakPDF = async (siswa) => {
    try {
      showToast('Menyiapkan PDF...','success');
      const JsPDF = await loadJsPDF();
      await loadAutoTable();
      const pdf = new JsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const W = 210; const M = 15;
      const namaSekolah  = settings?.namaSekolah || 'SD NEGERI';
      const namaGuru     = profile?.namaGuru || profile?.nama || '-';
      const nipGuru      = profile?.nip || '-';
      const namaKepsek   = settings?.namaKepsek || profile?.namaKepalaSekolah || '-';
      const nipKepsek    = settings?.nipKepsek  || profile?.nipKepalaSekolah  || '-';
      const kota         = settings?.kotaTandatangan || '';
      const today        = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
      const namaDepan    = siswa.nama.split(' ')[0];
      const absensi      = getAbsensi(siswa.id);
      let y = M;

      // KOP
      const logoSize = 22;
      if (settings?.logoUrl) {
        try { pdf.addImage(settings.logoUrl,'PNG', M, y, logoSize, logoSize); } catch(e) {}
      }
      const kopCenterX = W/2 + (settings?.logoUrl ? 4 : 0);
      pdf.setFontSize(11); pdf.setFont('helvetica','normal'); pdf.setTextColor(15,30,80);
      pdf.text('PEMERINTAH KABUPATEN PAMEKASAN', kopCenterX, y+4, {align:'center'});
      pdf.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', kopCenterX, y+9, {align:'center'});
      pdf.setFontSize(15); pdf.setFont('helvetica','bold');
      pdf.text(namaSekolah.toUpperCase(), kopCenterX, y+16, {align:'center'});
      pdf.setFontSize(10); pdf.setFont('helvetica','normal'); pdf.setTextColor(60,60,60);
      pdf.text('Jl. Raya Pasean Kec. Pasean-Pamekasan (69356)', kopCenterX, y+21, {align:'center'});
      pdf.text('email: sdnegeribindang2@gmail.com', kopCenterX, y+26, {align:'center'});
      y += 30;
      pdf.setLineWidth(1); pdf.setDrawColor(15,30,80);
      pdf.line(M, y, W-M, y);
      pdf.setLineWidth(0.3);
      pdf.line(M, y+1.5, W-M, y+1.5);
      y += 6;

      // JUDUL
      pdf.setFontSize(11); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
      pdf.text('LAPORAN HASIL BELAJAR (RAPOR)', W/2, y, {align:'center'});
      y += 8;

      // IDENTITAS
      pdf.setFillColor(240,245,255);
      pdf.setDrawColor(190,205,240); pdf.setLineWidth(0.3);
      pdf.rect(M, y, W-M*2, 30, 'FD');
      pdf.setFontSize(8.5); pdf.setTextColor(30,30,30);
      const iL = M+3; const iV = 65; const iL2 = 115; const iV2 = 158;
      const idRows = [
        ['Nama Peserta Didik', siswa.nama,                'Kelas',          ctx.loggedInKelas],
        ['NIS / NISN',         `${siswa.nis||'-'} / ${siswa.nisn||'-'}`, 'Semester', ctx.activeSemester],
        ['Tahun Pelajaran',    ctx.activeTahun,            'Jenis Kelamin',  siswa.jk==='L'?'Laki-laki':'Perempuan'],
        ['Nama Sekolah',       namaSekolah,                '',               ''],
      ];
      idRows.forEach((r,i) => {
        const ry = y + 5 + i*6.5;
        pdf.setFont('helvetica','bold');   pdf.text(r[0], iL, ry);
        pdf.setFont('helvetica','normal'); pdf.text(`: ${r[1]}`, iV, ry);
        if (r[2]) {
          pdf.setFont('helvetica','bold');   pdf.text(r[2], iL2, ry);
          pdf.setFont('helvetica','normal'); pdf.text(`: ${r[3]}`, iV2, ry);
        }
      });
      y += 34;

      // TABEL NILAI
      pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
      pdf.text('A. NILAI HASIL BELAJAR', M, y); y += 4;

      const tableRows = daftarMapel.map((mapel, idx) => {
        const nilaiAkhir = getNilaiAkhirMapel(siswa.id, mapel);
        const gradeObj   = getGradeObjMapel(siswa.id, mapel);
        const tpMapel    = tpData[mapel] || [];
        const override   = raporData[siswa.id]?.mapelOverride?.[mapel]?.capaian;
        const deskripsi  = override || buildDeskripsiMapel(namaDepan, tpMapel, gradeObj);
        return [
          `${idx+1}`,
          mapel,
          nilaiAkhir !== null ? nilaiAkhir.toFixed(0) : '-',
          deskripsi === '-' ? 'TP belum diinput' : deskripsi,
        ];
      });

      pdf.autoTable({
        startY: y,
        head: [['No','Muatan Pelajaran','Nilai Akhir','Capaian Kompetensi']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [88,28,135], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 3 },
        bodyStyles: { fontSize: 7.5, textColor: [30,30,30], valign: 'top', cellPadding: 2.5 },
        columnStyles: { 0: { halign:'center', cellWidth: 9 }, 1: { cellWidth: 45 }, 2: { halign:'center', cellWidth: 20 }, 3: { cellWidth: 'auto' } },
        margin: { left: M, right: M },
        didParseCell: (data) => {
          if (data.column.index === 2 && data.section === 'body') {
            const val = parseFloat(data.cell.raw);
            if (!isNaN(val)) {
              if (val >= 91) data.cell.styles.textColor = [5,100,40];
              else if (val >= 81) data.cell.styles.textColor = [10,60,140];
              else if (val >= 71) data.cell.styles.textColor = [140,100,0];
              else data.cell.styles.textColor = [160,30,30];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 9;
            }
          }
          if (data.column.index === 3 && data.section === 'body') {
            const raw = data.cell.raw;
            if (typeof raw === 'string' && raw.includes('\n')) {
              data.cell.text = raw.split('\n');
            }
          }
        },
      });
      y = pdf.lastAutoTable.finalY + 5;

      // KEHADIRAN
      pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
      pdf.text('B. REKAP KEHADIRAN', M, y); y += 4;
      pdf.autoTable({
        startY: y,
        head: [['Hadir','Sakit','Izin','Alpha','Total Hari']],
        body: [[ `${absensi.hadir} hari`, `${absensi.sakit} hari`, `${absensi.izin} hari`, `${absensi.alpha} hari`, `${absensi.hadir+absensi.sakit+absensi.izin+absensi.alpha} hari` ]],
        theme: 'grid',
        headStyles: { fillColor:[88,28,135], textColor:255, fontSize:8, fontStyle:'bold', halign:'center' },
        bodyStyles: { fontSize:9, halign:'center', fontStyle:'bold' },
        margin: { left:M, right:M },
      });
      y = pdf.lastAutoTable.finalY + 5;

      // EKSTRAKURIKULER
      const ekstra = raporData[siswa.id]?.ekstrakurikuler || [];
      if (ekstra.length > 0) {
        pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
        pdf.text('C. EKSTRAKURIKULER', M, y); y += 4;
        pdf.autoTable({
          startY: y,
          head: [['No', 'Kegiatan Ekstrakurikuler', 'Predikat', 'Deskripsi']],
          body: ekstra.map((e, idx) => [ idx+1, e.nama, e.predikat, getDeskripsiEkstra(e.predikat, e.kompetensi) ]),
          theme: 'grid',
          headStyles: { fillColor:[88,28,135], textColor:255, fontSize:8 },
          bodyStyles: { fontSize:8 },
          margin: { left:M, right:M },
        });
        y = pdf.lastAutoTable.finalY + 5;
      }

      // KOKURIKULER (dengan bingkai)
      const kokur = raporData[siswa.id]?.kokurikuler || {};
      if (Object.keys(kokur).length > 0 && rubrikKokurikuler.length > 0) {
        pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
        pdf.text('D. KOKURIKULER', M, y); y += 4;
        const deskripsiKokur = generateDeskripsiKokurikuler(kokur, rubrikKokurikuler, namaDepan);
        const kokurLines = pdf.splitTextToSize(deskripsiKokur, W-M*2-12);
        const kokurH = Math.max(20, kokurLines.length * 5 + 12);
        pdf.setFillColor(245, 245, 255);
        pdf.setDrawColor(15, 30, 80);
        pdf.setLineWidth(0.5);
        pdf.rect(M, y, W-M*2, kokurH, 'FD');
        pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.setTextColor(30,30,30);
        pdf.text(kokurLines, M+6, y+8);
        y += kokurH + 8;
      }

      // CATATAN GURU
      const catatanGuru = raporData[siswa.id]?.catatanGuru || '';
      pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
      pdf.text('E. CATATAN GURU / WALI KELAS', M, y); y += 4;
      const catText = catatanGuru || '...';
      const catLines = pdf.splitTextToSize(catText, W-M*2-6);
      const catH = Math.max(16, catLines.length * 5 + 8);
      pdf.setFillColor(255,252,235); pdf.setDrawColor(220,195,100); pdf.setLineWidth(0.3);
      pdf.rect(M, y, W-M*2, catH, 'FD');
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.setTextColor(50,50,50);
      pdf.text(catLines, M+3, y+6);
      y += catH + 8;

      // TTD
      const ttdL = M + 10;
      const ttdR = W - M - 44;
      pdf.setFontSize(8.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(30,30,30);
      pdf.text(`${kota ? kota+', ' : ''}${today}`, W-M, y, {align:'right'});
      y += 5;
      pdf.text('Orang Tua / Wali Murid,', ttdL, y);
      pdf.text('Guru / Wali Kelas,',       ttdR, y);
      y += 20;
      pdf.text('(________________________)', ttdL, y);
      pdf.setFont('helvetica','bold');
      pdf.text(namaGuru, ttdR, y);
      y += 4;
      pdf.setFont('helvetica','normal');
      pdf.text('NIP. -',            ttdL, y);
      pdf.text(`NIP. ${nipGuru}`,   ttdR, y);
      y += 14;
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5);
      pdf.text('Kepala Sekolah,', W/2, y, {align:'center'});
      y += 20;
      pdf.setFont('helvetica','bold');
      pdf.text(namaKepsek, W/2, y, {align:'center'});
      y += 4;
      pdf.setFont('helvetica','normal');
      pdf.text(`NIP. ${nipKepsek}`, W/2, y, {align:'center'});

      // FOOTER: nama/NISN + halaman
      const nPage = pdf.internal.getNumberOfPages();
      for (let i=1; i<=nPage; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7); pdf.setTextColor(160,160,160);
        pdf.text(
          `${siswa.nama}  ·  ${siswa.nis || '-'}/${siswa.nisn || '-'}  ·  Hal. ${i}/${nPage}`,
          W/2, 292, {align:'center'}
        );
      }

      pdf.save(`Rapor_${siswa.nama.replace(/ /g,'_')}_${ctx.activeSemester}_${ctx.activeTahun}.pdf`);
      showToast(`✅ Rapor ${siswa.nama} berhasil diunduh!`,'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal cetak PDF: '+err.message,'error');
    }
  };

  const handleCetakSemua = async () => {
    if (!students.length) { showToast('Belum ada siswa','error'); return; }
    showToast(`Mencetak ${students.length} rapor...`,'success');
    for (const s of students) {
      await handleCetakPDF(s);
      await new Promise(r=>setTimeout(r,500));
    }
  };

  // ===== RENDER =====
  const renderTPManager = () => (
    <div className="space-y-5">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800">
        💡 Input <strong>Tujuan Pembelajaran (TP)</strong> per mata pelajaran dan per sumatif (S1–S8).
      </div>
      <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">
          {tpEditIdx !== null ? '✏️ Edit Tujuan Pembelajaran' : '➕ Tambah Tujuan Pembelajaran'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Mata Pelajaran *</label>
            <select value={tpForm.mapel} onChange={e=>setTpForm(f=>({...f, mapel:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50">
              {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Sumatif *</label>
            <select value={tpForm.sKey} onChange={e=>setTpForm(f=>({...f, sKey:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50">
              {sKeyOptions.map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="sm:col-span-1 flex items-end">
            <button onClick={handleSaveTP}
              className="w-full bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-800 transition-all">
              {tpEditIdx !== null ? 'Update TP' : 'Simpan TP'}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">Deskripsi Tujuan Pembelajaran *</label>
          <textarea value={tpForm.deskripsiTP}
            onChange={e=>setTpForm(f=>({...f, deskripsiTP:e.target.value}))}
            placeholder="Contoh: menyelesaikan operasi hitung penjumlahan dan pengurangan bilangan cacah"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50" />
          <p className="text-xs text-slate-400 mt-1">Tulis dalam bentuk frasa.</p>
        </div>
        {tpEditIdx !== null && (
          <button onClick={()=>{setTpEditIdx(null);setTpForm(f=>({...f,deskripsiTP:''}));}}
            className="mt-2 text-xs text-slate-500 hover:text-red-500 underline">Batal edit</button>
        )}
      </div>
      {loadingTP ? (
        <div className="text-center py-6 text-slate-400">Memuat data TP...</div>
      ) : (
        <div className="space-y-4">
          {MAPEL_OPTIONS.map(mapel => {
            const tps = tpData[mapel] || [];
            return (
              <div key={mapel} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">{mapel}</span>
                  <span className="text-xs text-slate-400">{tps.length} TP</span>
                </div>
                {tps.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-4 py-3">Belum ada TP untuk mata pelajaran ini.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-600 w-16">Sumatif</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-600">Deskripsi TP</th>
                        <th className="px-3 py-2 w-20 text-center text-xs font-bold text-slate-600">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tps.map((tp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <span className="bg-purple-100 text-purple-800 font-bold text-xs px-2 py-0.5 rounded-lg">{tp.sKey.toUpperCase()}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-700 text-xs leading-relaxed">{tp.deskripsiTP}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={()=>{setTpEditIdx({mapel,idx});setTpForm({mapel,sKey:tp.sKey,deskripsiTP:tp.deskripsiTP});}}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-purple-700 text-base">✏️</button>
                              <button onClick={()=>handleDeleteTP(mapel,idx)}
                                className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 text-base">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderDaftarRapor = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleCetakSemua} className="flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-800 transition-all shadow-md shadow-purple-200">
          🖨️ Cetak Semua Rapor PDF
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 text-xs font-bold text-slate-500 w-8">No</th>
              <th className="text-left p-3 text-xs font-bold text-slate-500">Nama Siswa</th>
              <th className="text-center p-3 text-xs font-bold text-slate-500">NIS</th>
              <th className="text-center p-3 text-xs font-bold text-slate-500">Mapel</th>
              <th className="text-center p-3 text-xs font-bold text-slate-500">Ekstra</th>
              <th className="text-center p-3 text-xs font-bold text-slate-500">P5</th>
              <th className="text-center p-3 text-xs font-bold text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Belum ada data siswa</td></tr>
            ) : students.map((s,idx) => {
              const mapelAdaNilai = daftarMapel.filter(m => getNilaiAkhirMapel(s.id,m) !== null).length;
              const ekstraCount = (raporData[s.id]?.ekstrakurikuler || []).length;
              const kokurCount = Object.keys(raporData[s.id]?.kokurikuler || {}).length;
              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-400 text-xs">{idx+1}</td>
                  <td className="p-3 font-semibold text-slate-800">{s.nama}</td>
                  <td className="p-3 text-center text-slate-500 text-xs">{s.nis||'-'}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      mapelAdaNilai === daftarMapel.length ? 'bg-emerald-100 text-emerald-700' :
                      mapelAdaNilai > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                    }`}>{mapelAdaNilai}/{daftarMapel.length}</span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setSelectedSiswa(s); setShowEkstraModal(true); }}
                      className={`text-xs font-bold px-2 py-1 rounded ${ekstraCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ekstraCount} kegiatan
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setSelectedSiswa({...s, kokurikulerTemp: raporData[s.id]?.kokurikuler || {}}); setShowKokurikulerModal(true); }}
                      className={`text-xs font-bold px-2 py-1 rounded ${kokurCount > 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>
                      {kokurCount} dimensi
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => { setSelectedSiswa(s); setShowPreviewModal(true); }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
                        👁 Preview
                      </button>
                      <button onClick={()=>handleCetakPDF(s)}
                        className="text-xs bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg font-medium">
                        ⬇ PDF
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {students.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 mb-1">📝 Catatan Guru / Wali Kelas</h3>
          <p className="text-xs text-slate-400 mb-4">Catatan ini akan tampil di bagian bawah rapor setiap siswa.</p>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {students.map(s => (
              <div key={s.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-40">
                  <p className="text-xs font-semibold text-slate-700 truncate">{s.nama}</p>
                  <p className="text-xs text-slate-400">{s.nis||'-'}</p>
                </div>
                <textarea
                  defaultValue={raporData[s.id]?.catatanGuru || ''}
                  onBlur={e=>handleSaveCatatan(s.id, e.target.value)}
                  placeholder="Tulis catatan perkembangan..."
                  className="flex-1 text-xs border border-slate-200 rounded-xl p-2.5 resize-none h-14 outline-none focus:ring-2 focus:ring-purple-300 bg-slate-50 hover:bg-white transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Ekstrakurikuler */}
      {showEkstraModal && selectedSiswa && (
        <Modal isOpen={showEkstraModal} onClose={() => { setShowEkstraModal(false); setEkstraEditIdx(null); setEkstraForm({ nama: '', predikat: 'A', kompetensi: '' }); }} title={`Ekstrakurikuler - ${selectedSiswa.nama}`}>
          <div className="space-y-4">
            {raporData[selectedSiswa.id]?.ekstrakurikuler?.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-bold text-slate-500">Sudah Terdaftar:</p>
                {raporData[selectedSiswa.id].ekstrakurikuler.map((e, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                    <div>
                      <span className="font-bold text-sm">{e.nama}</span>
                      <span className="ml-2 text-xs bg-purple-100 px-2 py-0.5 rounded">Predikat {e.predikat}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{e.kompetensi}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEkstraForm(e); setEkstraEditIdx(i); }} className="p-1 text-amber-500 hover:bg-amber-50 rounded">✏️</button>
                      <button onClick={() => handleDeleteEkstra(selectedSiswa.id, i)} className="p-1 text-red-500 hover:bg-red-50 rounded">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t pt-4">
              <p className="text-sm font-bold mb-3">{ekstraEditIdx !== null ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</p>
              <div className="space-y-3">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Nama Kegiatan</label><input type="text" value={ekstraForm.nama} onChange={e => setEkstraForm({...ekstraForm, nama: e.target.value})} className="w-full border p-2 rounded" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Predikat</label><select value={ekstraForm.predikat} onChange={e => setEkstraForm({...ekstraForm, predikat: e.target.value})} className="w-full border p-2 rounded">{PREDIKAT_OPTIONS.map(p => <option key={p} value={p}>{p} - {p==='A'?'Sangat Baik':p==='B'?'Baik':p==='C'?'Cukup':'Kurang'}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Kompetensi</label><textarea value={ekstraForm.kompetensi} onChange={e => setEkstraForm({...ekstraForm, kompetensi: e.target.value})} className="w-full border p-2 rounded h-20" /></div>
                <div className="flex gap-2">
                  {ekstraEditIdx !== null && <button onClick={() => { setEkstraEditIdx(null); setEkstraForm({ nama: '', predikat: 'A', kompetensi: '' }); }} className="flex-1 py-2 border rounded">Batal Edit</button>}
                  <button onClick={handleSaveEkstra} className="flex-1 py-2 bg-purple-700 text-white rounded">{ekstraEditIdx !== null ? 'Update' : 'Simpan'}</button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Kokurikuler */}
      {showKokurikulerModal && selectedSiswa && (
        <Modal isOpen={showKokurikulerModal} onClose={() => setShowKokurikulerModal(false)} title={`Penilaian Kokurikuler - ${selectedSiswa.nama}`}>
          <div className="space-y-4">
            {rubrikKokurikuler.length === 0 ? (
              <p className="text-sm text-amber-600">Belum ada rubrik kokurikuler.</p>
            ) : (
              <>
                {rubrikKokurikuler.map(r => {
                  const currentVal = selectedSiswa.kokurikulerTemp?.[r.dimensi] || '';
                  return (
                    <div key={r.id} className="border-b pb-3">
                      <p className="font-bold text-sm mb-1">{r.dimensi}</p>
                      <p className="text-xs text-slate-500 mb-2">{r.aspek}</p>
                      <select value={currentVal} onChange={e => { const newKokur = { ...selectedSiswa.kokurikulerTemp, [r.dimensi]: e.target.value }; setSelectedSiswa({...selectedSiswa, kokurikulerTemp: newKokur}); }} className="w-full border p-2 rounded text-sm">
                        <option value="">-- Pilih Predikat --</option>
                        {KOKUR_PREDIKAT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      {currentVal && <p className="text-xs text-purple-700 mt-1 italic">{currentVal === 'Sangat Baik' ? r.sangatBaik : currentVal === 'Baik' ? r.baik : currentVal === 'Cukup' ? r.cukup : r.kurang}</p>}
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowKokurikulerModal(false)} className="flex-1 py-2 border rounded">Batal</button>
                  <button onClick={handleSaveKokurikuler} className="flex-1 py-2 bg-purple-700 text-white rounded">Simpan</button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );

  const renderKokurikulerRubrik = () => (
    <div className="space-y-5">
      <div className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-slate-800">Rubrik Penilaian Kokurikuler (P5)</h3>
          <button onClick={() => { setRubrikForm({ dimensi: DIMENSI_P5[0], aspek: '', sangatBaik: '', baik: '', cukup: '', kurang: '' }); setRubrikEditId(null); setShowRubrikModal(true); }}
            className="bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-800">+ Tambah Rubrik</button>
        </div>
        {loadingRubrik ? <div className="text-center py-6">Memuat...</div> : rubrikKokurikuler.length === 0 ? <div className="text-center py-8 text-slate-400">Belum ada rubrik.</div> : (
          <div className="space-y-4">
            {rubrikKokurikuler.map(r => (
              <div key={r.id} className="border p-4 rounded-xl">
                <div className="flex justify-between"><h4 className="font-bold text-purple-800">{r.dimensi}</h4><div className="flex gap-2"><button onClick={() => { setRubrikForm(r); setRubrikEditId(r.id); setShowRubrikModal(true); }} className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded">✏️</button><button onClick={() => handleDeleteRubrik(r.id)} className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded">🗑️</button></div></div>
                <p className="text-sm"><span className="font-bold">Aspek:</span> {r.aspek}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2"><div><span className="font-bold text-emerald-600">Sangat Baik:</span> {r.sangatBaik}</div><div><span className="font-bold text-blue-600">Baik:</span> {r.baik}</div><div><span className="font-bold text-amber-600">Cukup:</span> {r.cukup}</div><div><span className="font-bold text-red-600">Kurang:</span> {r.kurang}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showRubrikModal && (
        <Modal isOpen={showRubrikModal} onClose={() => setShowRubrikModal(false)} title={rubrikEditId ? 'Edit Rubrik' : 'Tambah Rubrik'}>
          <div className="space-y-4">
            <div><label className="block text-xs font-bold mb-1">Dimensi</label><select value={rubrikForm.dimensi} onChange={e => setRubrikForm({...rubrikForm, dimensi: e.target.value})} className="w-full border p-2 rounded">{DIMENSI_P5.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label className="block text-xs font-bold mb-1">Aspek</label><input type="text" value={rubrikForm.aspek} onChange={e => setRubrikForm({...rubrikForm, aspek: e.target.value})} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-xs font-bold mb-1">Sangat Baik</label><textarea value={rubrikForm.sangatBaik} onChange={e => setRubrikForm({...rubrikForm, sangatBaik: e.target.value})} className="w-full border p-2 rounded h-16" /></div>
            <div><label className="block text-xs font-bold mb-1">Baik</label><textarea value={rubrikForm.baik} onChange={e => setRubrikForm({...rubrikForm, baik: e.target.value})} className="w-full border p-2 rounded h-16" /></div>
            <div><label className="block text-xs font-bold mb-1">Cukup</label><textarea value={rubrikForm.cukup} onChange={e => setRubrikForm({...rubrikForm, cukup: e.target.value})} className="w-full border p-2 rounded h-16" /></div>
            <div><label className="block text-xs font-bold mb-1">Kurang</label><textarea value={rubrikForm.kurang} onChange={e => setRubrikForm({...rubrikForm, kurang: e.target.value})} className="w-full border p-2 rounded h-16" /></div>
            <div className="flex gap-2"><button onClick={() => setShowRubrikModal(false)} className="flex-1 py-2 border rounded">Batal</button><button onClick={handleSaveRubrik} className="flex-1 py-2 bg-purple-700 text-white rounded">Simpan</button></div>
          </div>
        </Modal>
      )}
    </div>
  );

  const renderPreviewModal = () => {
    if (!selectedSiswa) return null;
    const absensi = getAbsensi(selectedSiswa.id);
    return (
      <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} title={`Preview Rapor — ${selectedSiswa.nama}`}>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 text-xs">
            {[['Nama',selectedSiswa.nama], ['Kelas',ctx.loggedInKelas], ['NIS/NISN',`${selectedSiswa.nis||'-'} / ${selectedSiswa.nisn||'-'}`], ['Semester',ctx.activeSemester]].map(([l,v])=><div key={l}><span className="text-slate-400 block">{l}</span><span className="font-semibold">{v}</span></div>)}
          </div>
          <div>
            <p className="text-xs font-bold mb-2">Nilai Hasil Belajar:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border rounded-xl overflow-hidden">
                <thead className="bg-slate-800 text-white"><tr><th className="p-2">Mata Pelajaran</th><th className="p-2 text-center w-20">Nilai</th></tr></thead>
                <tbody className="divide-y">{daftarMapel.map(mapel => { const na = getNilaiAkhirMapel(selectedSiswa.id, mapel); return <tr key={mapel}><td className="p-2">{mapel}</td><td className="p-2 text-center font-bold">{na!==null?na.toFixed(0):'-'}</td></tr>; })}</tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">{['Hadir','Sakit','Izin','Alpha'].map(st=><div key={st} className="bg-slate-50 border p-2 rounded"><p className="text-xs text-slate-400">{st}</p><p className="font-bold text-lg">{absensi[st.toLowerCase()]}</p></div>)}</div>
          <div className="flex justify-end gap-2"><button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 border rounded-xl">Tutup</button><button onClick={() => { handleCetakPDF(selectedSiswa); setShowPreviewModal(false); }} className="px-4 py-2 bg-purple-700 text-white rounded-xl font-bold">⬇ Unduh PDF</button></div>
        </div>
      </Modal>
    );
  };

  // MAIN RENDER
  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-fade-in">
      <div className="rounded-2xl p-3 md:p-4" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-white">📄 Rapor Peserta Didik</h2>
            <p className="text-purple-200 text-xs mt-0.5">{ctx.activeSemester} · {ctx.activeTahun} · {ctx.loggedInKelas} · {students.length} Siswa</p>
          </div>
          <div className="flex gap-1 bg-white/20 p-1 rounded-xl">
            {[{ id: 'daftar', label: '📋 Daftar Rapor' },{ id: 'tp', label: '🎯 Kelola TP' },{ id: 'kokurikuler', label: '🧩 Kokurikuler' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveSubMenu(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubMenu === tab.id ? 'bg-white text-purple-800 shadow-sm' : 'text-white/70 hover:text-white'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>
      {activeSubMenu === 'daftar' && renderDaftarRapor()}
      {activeSubMenu === 'tp'     && renderTPManager()}
      {activeSubMenu === 'kokurikuler' && renderKokurikulerRubrik()}
      {renderPreviewModal()}
    </div>
  );
};

// ==========================================
// FITUR KALENDER AKADEMIK + JADWAL PELAJARAN
// ==========================================

const HARI_LIST = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
const MAPEL_OPTIONS_AK = ['Pendidikan Pancasila','Bahasa Indonesia','Matematika',
  'IPAS','Seni Budaya','Bahasa Madura','PAI','PJOK','Bahasa Inggris','Mulok','BK','Upacara','Istirahat'];

// ─────────────────────────────────────────────────────────────
// Helper: generate semua tanggal dalam rentang
// ─────────────────────────────────────────────────────────────
function getDatesInRange(start, end) {
  const dates = [];
  let cur = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (cur <= endD) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
function getMonthsInRange(start, end) {
  const months = [];
  let cur = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (cur <= endD) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`;
    if (!months.includes(key)) months.push(key);
    cur.setMonth(cur.getMonth()+1);
  }
  return months;
}
function getDaysInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const days = [];
  const first = new Date(y, m-1, 1);
  const last  = new Date(y, m, 0);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  const startDow = first.getDay(); // 0=Sun
  return { days, startDow };
}

// ─────────────────────────────────────────────────────────────
// Komponen Utama AkademikView
// ─────────────────────────────────────────────────────────────
const AkademikView = ({ ctx, settings, profile, showToast }) => {
  const [activeMenu, setActiveMenu] = React.useState('kalender');

  // ── State Kalender ──
  const [awal, setAwal]   = React.useState('');
  const [akhir, setAkhir] = React.useState('');
  const [hariMerah,       setHariMerah]       = React.useState({});
  const [hariFakultatif,  setHariFakultatif]  = React.useState({});
  const [selectedDate,    setSelectedDate]    = React.useState(null);
  const [labelInput,      setLabelInput]      = React.useState('');
  const [tipeInput,       setTipeInput]       = React.useState('merah');
  const [loading,         setLoading]         = React.useState(true);

  // ── State Jadwal ──
  const [activeHari,    setActiveHari]    = React.useState('Senin');
  const [jadwal,        setJadwal]        = React.useState(() => {
    const init = {};
    HARI_LIST.forEach(h => { init[h] = []; });
    return init;
  });
  const [copyFrom,      setCopyFrom]      = React.useState(''); // kept to avoid ref errors
  // Modal tambah/edit sesi jadwal
  const [sesiModal,     setSesiModal]     = React.useState(false);
  const [sesiForm,      setSesiForm]      = React.useState({ jamMulai:'07:00', jamSelesai:'07:35', mapel:'', jp:'2', guru:'' });
  const [sesiEditIdx,   setSesiEditIdx]   = React.useState(null);

  // ── Firestore paths ──
  const semKey = `${ctx.activeSemester}${ctx.activeTahun}`.replace(/[^a-zA-Z0-9]/g,'');
  const pathAkademik = semKey || 'default';
  const pathJadwal   = semKey || 'default';

  React.useEffect(() => {
    if (!ctx.dbId) return;
    setLoading(true);
    let unsub1 = () => {}, unsub2 = () => {};
    try {
      unsub1 = onSnapshot(doc(db, 'users', ctx.dbId, 'akademik', pathAkademik), snap => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.awal)            setAwal(d.awal);
          if (d.akhir)           setAkhir(d.akhir);
          if (d.hariMerah)       setHariMerah(d.hariMerah);
          if (d.hariFakultatif)  setHariFakultatif(d.hariFakultatif);
        }
        setLoading(false);
      }, () => setLoading(false));
      unsub2 = onSnapshot(doc(db, 'users', ctx.dbId, 'jadwal', pathJadwal), snap => {
        if (snap.exists() && snap.data().jadwal) {
          setJadwal(snap.data().jadwal);
        }
      }, () => {});
    } catch(e) {
      console.error('AkademikView load error:', e);
      setLoading(false);
    }
    return () => { unsub1(); unsub2(); };
  }, [ctx.dbId, ctx.activeSemester, ctx.activeTahun]);

  const saveKalender = async (newMerah, newFakultatif, newAwal, newAkhir) => {
    await setDoc(doc(db, 'users', ctx.dbId, 'akademik', pathAkademik), {
      awal: newAwal ?? awal, akhir: newAkhir ?? akhir,
      hariMerah: newMerah ?? hariMerah,
      hariFakultatif: newFakultatif ?? hariFakultatif,
      updatedAt: new Date().toISOString(),
    });
  };
  const saveJadwal = async (newJadwal) => {
    await setDoc(doc(db, 'users', ctx.dbId, 'jadwal', pathJadwal), {
      jadwal: newJadwal, updatedAt: new Date().toISOString(),
    });
  };

  // ── Rekap Kalender ──
  const rekapKalender = React.useMemo(() => {
    if (!awal || !akhir) return null;
    const all = getDatesInRange(awal, akhir);
    let efektif = 0, merah = 0, minggu = 0, fakultatif = 0;
    all.forEach(d => {
      const dow = new Date(d + 'T00:00:00').getDay();
      if (dow === 0) { minggu++; return; }
      if (hariMerah[d])      { merah++; return; }
      if (hariFakultatif[d]) { fakultatif++; return; }
      efektif++;
    });
    return { total: all.length, efektif, merah, minggu, fakultatif };
  }, [awal, akhir, hariMerah, hariFakultatif]);

  // ── Handler Klik Tanggal ──
  const handleClickDate = (date) => {
    setSelectedDate(date);
    setLabelInput(hariMerah[date] || hariFakultatif[date] || '');
    setTipeInput(hariMerah[date] ? 'merah' : hariFakultatif[date] ? 'fakultatif' : 'merah');
  };
  const handleSaveDate = async () => {
    if (!labelInput.trim()) { showToast('Isi keterangan terlebih dahulu', 'error'); return; }
    const newMerah = { ...hariMerah };
    const newFak   = { ...hariFakultatif };
    delete newMerah[selectedDate];
    delete newFak[selectedDate];
    if (tipeInput === 'merah') newMerah[selectedDate] = labelInput.trim();
    else newFak[selectedDate] = labelInput.trim();
    setHariMerah(newMerah);
    setHariFakultatif(newFak);
    await saveKalender(newMerah, newFak, null, null);
    showToast('Tanggal berhasil ditandai', 'success');
    setSelectedDate(null); setLabelInput('');
  };
  const handleHapusDate = async () => {
    const newMerah = { ...hariMerah };
    const newFak   = { ...hariFakultatif };
    delete newMerah[selectedDate];
    delete newFak[selectedDate];
    setHariMerah(newMerah);
    setHariFakultatif(newFak);
    await saveKalender(newMerah, newFak, null, null);
    showToast('Penanda dihapus', 'success');
    setSelectedDate(null);
  };

  // ── Handler Jadwal ──
  const openAddSesi = () => {
    setSesiForm({ jamMulai:'07:00', jamSelesai:'07:35', mapel:'', jp:'2', guru:'' });
    setSesiEditIdx(null);
    setSesiModal(true);
  };
  const openEditSesi = (idx) => {
    const s = (jadwal[activeHari]||[])[idx];
    setSesiForm({ jamMulai: s.jamMulai||'07:00', jamSelesai: s.jamSelesai||'07:35', mapel: s.mapel||'', jp: s.jp||'2', guru: s.guru||'' });
    setSesiEditIdx(idx);
    setSesiModal(true);
  };
  const handleSaveSesiModal = () => {
    if (!sesiForm.mapel) { showToast('Pilih mata pelajaran', 'error'); return; }
    const arr = [...(jadwal[activeHari]||[])];
    if (sesiEditIdx !== null) {
      arr[sesiEditIdx] = { ...sesiForm };
    } else {
      arr.push({ ...sesiForm });
    }
    const newJ = { ...jadwal, [activeHari]: arr };
    setJadwal(newJ); saveJadwal(newJ);
    setSesiModal(false);
    showToast(sesiEditIdx !== null ? 'Sesi diperbarui' : 'Sesi ditambahkan', 'success');
  };
  const deleteSesi = (idx) => {
    const arr = (jadwal[activeHari]||[]).filter((_,i) => i !== idx);
    const newJ = { ...jadwal, [activeHari]: arr };
    setJadwal(newJ); saveJadwal(newJ);
    showToast('Sesi dihapus', 'success');
  };
  const handleCopyJadwal = () => {
    if (!copyFrom || copyFrom === activeHari) return;
    const newJ = { ...jadwal, [activeHari]: JSON.parse(JSON.stringify(jadwal[copyFrom]||[])) };
    setJadwal(newJ); saveJadwal(newJ);
    showToast(`Jadwal ${copyFrom} berhasil disalin ke ${activeHari}`, 'success');
    setCopyFrom('');
  };

  // ── Cetak Jadwal PDF ──
  const handleCetakJadwalPDF = async () => {
    try {
      const JsPDF = await loadJsPDF();
      await loadAutoTable();
      const pdf = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297; const M = 12;
      let y = M;

      // KOP
      pdf.setFontSize(13); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
      pdf.text('JADWAL PELAJARAN', W/2, y, {align:'center'}); y += 6;
      pdf.setFontSize(10); pdf.setFont('helvetica','normal'); pdf.setTextColor(60,60,60);
      pdf.text(`${settings?.namaSekolah||'SD NEGERI'}  ·  ${ctx.activeSemester} ${ctx.activeTahun}  ·  ${ctx.loggedInKelas}`, W/2, y, {align:'center'}); y += 8;
      pdf.setLineWidth(0.5); pdf.setDrawColor(15,30,80);
      pdf.line(M, y, W-M, y); y += 5;

      // Tabel per hari
      const cols = ['No','Jam','Mata Pelajaran','Guru/Pengajar'];
      HARI_LIST.forEach((hari, hi) => {
        const sesi = jadwal[hari] || [];
        if (!sesi.length) return;
        if (y > 170) { pdf.addPage(); y = M; }
        pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
        pdf.text(hari.toUpperCase(), M, y); y += 3;
        pdf.autoTable({
          startY: y,
          head: [cols],
          body: sesi.map((s,i) => [`${i+1}`, `${s.jamMulai} – ${s.jamSelesai}`, s.mapel||'-', s.guru||'-']),
          theme: 'grid',
          headStyles: { fillColor:[88,28,135], textColor:255, fontSize:8, fontStyle:'bold', halign:'center', cellPadding:2 },
          bodyStyles: { fontSize:8, cellPadding:2 },
          columnStyles: { 0:{halign:'center',cellWidth:8}, 1:{cellWidth:28}, 2:{cellWidth:60}, 3:{cellWidth:'auto'} },
          margin: { left:M, right:M },
        });
        y = pdf.lastAutoTable.finalY + 6;
      });

      // Footer
      const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
      pdf.setFontSize(7); pdf.setTextColor(160,160,160);
      pdf.text(`Dicetak: ${today}`, W/2, 200, {align:'center'});
      pdf.save(`JadwalPelajaran-${ctx.loggedInKelas}-${ctx.activeSemester}${ctx.activeTahun}.pdf`);
      showToast('Jadwal berhasil diunduh!', 'success');
    } catch(e) {
      showToast('Gagal cetak PDF: ' + e.message, 'error');
    }
  };

  // ── Cetak Kalender PDF ──
  const handleCetakKalenderPDF = async () => {
    if (!awal || !akhir) { showToast('Set rentang semester dulu', 'error'); return; }
    try {
      const JsPDF = await loadJsPDF();
      await loadAutoTable();
      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const M = 15;
      let y = M;
      pdf.setFontSize(13); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
      pdf.text('KALENDER AKADEMIK', W/2, y, {align:'center'}); y += 6;
      pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(60,60,60);
      pdf.text(`${settings?.namaSekolah||'SD NEGERI'}  ·  ${ctx.activeSemester} ${ctx.activeTahun}`, W/2, y, {align:'center'}); y += 5;
      pdf.text(`Periode: ${awal} s.d. ${akhir}`, W/2, y, {align:'center'}); y += 6;
      pdf.setLineWidth(0.5); pdf.setDrawColor(15,30,80);
      pdf.line(M, y, W-M, y); y += 5;

      // Rekap
      if (rekapKalender) {
        pdf.autoTable({
          startY: y,
          head: [['Hari Efektif','Hari Merah','Hari Minggu','Efektif Fakultatif','Total Hari']],
          body: [[rekapKalender.efektif, rekapKalender.merah, rekapKalender.minggu, rekapKalender.fakultatif, rekapKalender.total]],
          theme: 'grid',
          headStyles: { fillColor:[88,28,135], textColor:255, fontSize:8, fontStyle:'bold', halign:'center' },
          bodyStyles: { fontSize:10, halign:'center', fontStyle:'bold' },
          margin: { left:M, right:M },
        });
        y = pdf.lastAutoTable.finalY + 6;
      }

      // Daftar hari merah
      const daftarMerah = Object.entries(hariMerah).sort(([a],[b])=>a.localeCompare(b));
      const daftarFak   = Object.entries(hariFakultatif).sort(([a],[b])=>a.localeCompare(b));
      if (daftarMerah.length) {
        pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
        pdf.text('HARI LIBUR / MERAH', M, y); y += 3;
        pdf.autoTable({
          startY: y,
          head: [['Tanggal','Hari','Keterangan']],
          body: daftarMerah.map(([d,l]) => {
            const dt = new Date(d+'T00:00:00');
            return [d, ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][dt.getDay()], l];
          }),
          theme: 'grid',
          headStyles: { fillColor:[180,0,0], textColor:255, fontSize:8, fontStyle:'bold' },
          bodyStyles: { fontSize:8 },
          margin: { left:M, right:M },
        });
        y = pdf.lastAutoTable.finalY + 6;
      }
      if (daftarFak.length) {
        if (y > 240) { pdf.addPage(); y = M; }
        pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,30,80);
        pdf.text('HARI EFEKTIF FAKULTATIF', M, y); y += 3;
        pdf.autoTable({
          startY: y,
          head: [['Tanggal','Hari','Keterangan']],
          body: daftarFak.map(([d,l]) => {
            const dt = new Date(d+'T00:00:00');
            return [d, ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][dt.getDay()], l];
          }),
          theme: 'grid',
          headStyles: { fillColor:[180,120,0], textColor:255, fontSize:8, fontStyle:'bold' },
          bodyStyles: { fontSize:8 },
          margin: { left:M, right:M },
        });
      }
      const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
      pdf.setFontSize(7); pdf.setTextColor(160,160,160);
      pdf.text(`Dicetak: ${today}`, W/2, 290, {align:'center'});
      pdf.save(`KalenderAkademik-${ctx.activeSemester}${ctx.activeTahun}.pdf`);
      showToast('Kalender berhasil diunduh!', 'success');
    } catch(e) {
      showToast('Gagal cetak: ' + e.message, 'error');
    }
  };

  
  // ─────────────────────────────────────────────────────────────
  // RENDER KALENDER
  // ─────────────────────────────────────────────────────────────
  const renderKalender = () => {
    const months = (awal && akhir) ? getMonthsInRange(awal, akhir) : [];
    return (
      <div className="space-y-5">
        {/* Setting rentang */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-sm">📅</span>
            Rentang Semester
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Mulai Semester</label>
              <input type="date" value={awal} onChange={e => { setAwal(e.target.value); saveKalender(null, null, e.target.value, null); }}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Akhir Semester</label>
              <input type="date" value={akhir} onChange={e => { setAkhir(e.target.value); saveKalender(null, null, null, e.target.value); }}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          {[
            { warna:'bg-emerald-500', label:'Hari Efektif' },
            { warna:'bg-red-500',     label:'Hari Merah / Libur' },
            { warna:'bg-amber-400',   label:'Efektif Fakultatif' },
            { warna:'bg-blue-300',    label:'Hari Minggu' },
            { warna:'bg-slate-200',   label:'Luar Rentang' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${l.warna}`}></span>
              {l.label}
            </div>
          ))}
        </div>

        {/* Rekap */}
        {rekapKalender && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label:'Total Hari',    val: rekapKalender.total,      bg:'bg-slate-50 border-slate-200',      txt:'text-slate-700' },
              { label:'Hari Efektif',  val: rekapKalender.efektif,    bg:'bg-emerald-50 border-emerald-200',  txt:'text-emerald-700' },
              { label:'Hari Merah',    val: rekapKalender.merah,      bg:'bg-red-50 border-red-200',          txt:'text-red-700' },
              { label:'Hari Minggu',   val: rekapKalender.minggu,     bg:'bg-blue-50 border-blue-200',        txt:'text-blue-700' },
              { label:'Fakultatif',    val: rekapKalender.fakultatif, bg:'bg-amber-50 border-amber-200',      txt:'text-amber-700' },
            ].map(r => (
              <div key={r.label} className={`rounded-xl border p-2 text-center ${r.bg}`}>
                <p className="text-[10px] font-bold text-slate-500 mb-0.5">{r.label}</p>
                <p className={`text-xl font-black ${r.txt}`}>{r.val}</p>
                <p className="text-[10px] text-slate-400">hari</p>
              </div>
            ))}
          </div>
        )}

        {/* Grid Kalender */}
        {months.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {months.map(ym => {
              const [y2, m2] = ym.split('-').map(Number);
              const { days, startDow } = getDaysInMonth(ym);
              const dow0 = startDow === 0 ? 7 : startDow; // 1=Sen ... 7=Min
              const blanks = dow0 - 1;
              return (
                <div key={ym} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-purple-700 text-white text-center py-1.5 font-black text-xs">
                    {NAMA_BULAN[m2-1]} {y2}
                  </div>
                  <div className="p-1.5">
                    <div className="grid grid-cols-7 mb-0.5">
                      {['S','S','R','K','J','S','M'].map((d,i) => (
                        <div key={i} className="text-center text-[9px] font-bold text-slate-400 py-0.5">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px">
                      {Array(blanks).fill(null).map((_,i) => <div key={'b'+i}></div>)}
                      {days.map(date => {
                        const dt    = new Date(date + 'T00:00:00');
                        const dow   = dt.getDay(); // 0=Sun
                        const inRange = awal && akhir && date >= awal && date <= akhir;
                        const isMinggu = dow === 0;
                        const isMerah  = !!hariMerah[date];
                        const isFak    = !!hariFakultatif[date];
                        let bg = 'bg-slate-100 text-slate-300 cursor-default';
                        if (inRange) {
                          if (isMinggu)   bg = 'bg-blue-100 text-blue-500 cursor-default';
                          else if (isMerah) bg = 'bg-red-500 text-white cursor-pointer hover:bg-red-600';
                          else if (isFak)   bg = 'bg-amber-400 text-white cursor-pointer hover:bg-amber-500';
                          else              bg = 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200';
                        }
                        const isSelected = selectedDate === date;
                        return (
                          <button key={date}
                            onClick={() => inRange && !isMinggu && handleClickDate(date)}
                            className={`relative w-full aspect-square rounded text-[9px] font-bold flex flex-col items-center justify-center transition-all
                              ${bg} ${isSelected ? 'ring-1 ring-purple-500 ring-offset-0' : ''}
                            `}
                            title={hariMerah[date] || hariFakultatif[date] || ''}
                          >
                            {dt.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!awal || !akhir ? (
          <div className="text-center py-12 text-slate-400 font-medium">
            Atur rentang semester di atas untuk menampilkan kalender akademik.
          </div>
        ) : null}

        {/* Modal tandai tanggal */}
        {selectedDate && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDate(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
              <h3 className="font-black text-slate-800 mb-1">Tandai Tanggal</h3>
              <p className="text-sm text-slate-500 mb-4">
                {new Date(selectedDate+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              </p>
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-500 mb-1">Jenis</label>
                <div className="flex gap-2">
                  {[{v:'merah',label:'🔴 Hari Merah / Libur'},{v:'fakultatif',label:'🟡 Efektif Fakultatif'}].map(t => (
                    <button key={t.v} onClick={() => setTipeInput(t.v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${tipeInput===t.v ? 'bg-purple-700 text-white border-purple-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan</label>
                <input type="text" value={labelInput} onChange={e => setLabelInput(e.target.value)}
                  placeholder="cth: Hari Raya Idul Fitri / Penilaian Akhir Semester"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <div className="flex gap-2">
                {(hariMerah[selectedDate] || hariFakultatif[selectedDate]) && (
                  <button onClick={handleHapusDate}
                    className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50">
                    Hapus Penanda
                  </button>
                )}
                <button onClick={handleSaveDate}
                  className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-bold hover:bg-purple-800">
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tombol PDF Kalender */}
        {awal && akhir && (
          <div className="flex justify-end">
            <button onClick={handleCetakKalenderPDF}
              className="flex items-center gap-1.5 bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-800 shadow-md shadow-purple-200">
              ⬇ PDF
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER JADWAL
  // ─────────────────────────────────────────────────────────────
  const HARI_COLORS = {
    Senin:  { bg:'bg-blue-500',   light:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-700',   badge:'bg-blue-100 text-blue-700' },
    Selasa: { bg:'bg-violet-500', light:'bg-violet-50', border:'border-violet-200', text:'text-violet-700', badge:'bg-violet-100 text-violet-700' },
    Rabu:   { bg:'bg-emerald-500',light:'bg-emerald-50',border:'border-emerald-200',text:'text-emerald-700',badge:'bg-emerald-100 text-emerald-700' },
    Kamis:  { bg:'bg-amber-500',  light:'bg-amber-50',  border:'border-amber-200',  text:'text-amber-700',  badge:'bg-amber-100 text-amber-700' },
    Jumat:  { bg:'bg-rose-500',   light:'bg-rose-50',   border:'border-rose-200',   text:'text-rose-700',   badge:'bg-rose-100 text-rose-700' },
    Sabtu:  { bg:'bg-teal-500',   light:'bg-teal-50',   border:'border-teal-200',   text:'text-teal-700',   badge:'bg-teal-100 text-teal-700' },
  };

  const renderJadwal = () => (
    <div className="space-y-4">
      {/* Tab Hari */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="flex overflow-x-auto border-b border-slate-100">
          {HARI_LIST.map(h => {
            const col = HARI_COLORS[h];
            const active = activeHari === h;
            return (
              <button key={h} onClick={() => setActiveHari(h)}
                className={`px-5 py-3 text-sm font-bold shrink-0 transition-all border-b-2 flex items-center gap-1.5 ${
                  active ? `border-current ${col.text} bg-white` : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                <span className={`w-2 h-2 rounded-full ${active ? col.bg : 'bg-slate-200'}`}></span>
                {h}
                {(jadwal[h]||[]).length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? col.badge : 'bg-slate-100 text-slate-400'}`}>
                    {jadwal[h].length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-3">
          {/* Info JP */}
          <div className="flex justify-end">
            <div className="text-xs text-slate-400 font-medium">
              {(jadwal[activeHari]||[]).length} sesi · {(jadwal[activeHari]||[]).reduce((a,s) => a + (parseInt(s.jp)||0), 0)} JP
            </div>
          </div>

          {/* Tabel Sesi — bersih, tanpa inline edit */}
          {(jadwal[activeHari]||[]).length === 0 ? (
            <div className="text-center py-10 text-slate-300">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm font-medium">Belum ada sesi untuk hari {activeHari}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className={`${HARI_COLORS[activeHari].bg} text-white`}>
                    <th className="px-3 py-2.5 text-center w-8 font-bold">No</th>
                    <th className="px-3 py-2.5 text-left font-bold">Mulai</th>
                    <th className="px-3 py-2.5 text-left font-bold">Selesai</th>
                    <th className="px-3 py-2.5 text-left font-bold">Mata Pelajaran</th>
                    <th className="px-3 py-2.5 text-center w-14 font-bold">JP</th>
                    <th className="px-3 py-2.5 text-left font-bold">Guru / Pengajar</th>
                    <th className="px-3 py-2.5 text-center w-16 font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(jadwal[activeHari]||[]).map((sesi, idx) => (
                    <tr key={idx} className={`${idx%2===0 ? 'bg-white' : HARI_COLORS[activeHari].light} hover:brightness-95 transition-all`}>
                      <td className="px-3 py-2.5 text-center font-black text-slate-400">{idx+1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700">{sesi.jamMulai}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700">{sesi.jamSelesai}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-bold ${HARI_COLORS[activeHari].text}`}>{sesi.mapel||<span className="text-slate-300 italic">—</span>}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-black text-sm px-2 py-0.5 rounded-lg ${HARI_COLORS[activeHari].badge}`}>{sesi.jp||'—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{sesi.guru||<span className="italic text-slate-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openEditSesi(idx)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-purple-100 text-slate-400 hover:text-purple-700 flex items-center justify-center text-xs font-bold transition-all" title="Edit">✏</button>
                          <button onClick={() => deleteSesi(idx)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center text-xs transition-all" title="Hapus">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={openAddSesi}
            className={`w-full py-2.5 border-2 border-dashed rounded-xl text-sm font-bold transition-all ${HARI_COLORS[activeHari].border} ${HARI_COLORS[activeHari].text} hover:opacity-80`}>
            + Tambah Sesi {activeHari}
          </button>
        </div>
      </div>

      {/* Rekap Jadwal Mingguan — grid 3×2 card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs">📋</span>
            Rekap Jadwal Mingguan
          </h3>
          <span className="text-xs text-slate-400">
            {HARI_LIST.reduce((a,h)=>a+(jadwal[h]||[]).reduce((b,s)=>b+(parseInt(s.jp)||0),0),0)} JP/minggu
          </span>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          {HARI_LIST.map(h => {
            const col = HARI_COLORS[h];
            const sesis = jadwal[h] || [];
            const totalJP = sesis.reduce((a,s) => a+(parseInt(s.jp)||0), 0);
            return (
              <div key={h} className={`rounded-xl border ${col.border} overflow-hidden`}>
                {/* Header */}
                <div className={`${col.bg} text-white px-3 py-2 flex items-center justify-between`}>
                  <span className="font-black text-xs">{h}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">{totalJP}JP</span>
                </div>
                {/* Isi sesi */}
                <div className={`p-2 space-y-1 min-h-[60px] ${col.light}`}>
                  {sesis.length === 0
                    ? <p className="text-[10px] text-slate-300 italic text-center py-2">Kosong</p>
                    : sesis.map((s,i) => (
                        <div key={i} className="flex items-start gap-1">
                          <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${col.bg.replace('bg-','bg-')}`}></span>
                          <div>
                            <p className={`text-[10px] font-bold leading-tight ${col.text}`}>{s.mapel||'—'}</p>
                            <p className="text-[9px] text-slate-400">{s.jamMulai}–{s.jamSelesai} · {s.jp||'?'}JP</p>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tombol PDF Jadwal */}
      <div className="flex justify-end">
        <button onClick={handleCetakJadwalPDF}
          className="flex items-center gap-1.5 bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-800 shadow-md shadow-purple-200">
          ⬇ PDF
        </button>
      </div>

      {/* Modal Tambah/Edit Sesi */}
      {sesiModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSesiModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-slate-800">{sesiEditIdx !== null ? 'Edit Sesi' : 'Tambah Sesi'}</h3>
                <p className={`text-xs font-bold mt-0.5 ${HARI_COLORS[activeHari].text}`}>📅 {activeHari}</p>
              </div>
              <button onClick={() => setSesiModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <div className="space-y-4">
              {/* Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Jam Mulai</label>
                  <input type="time" value={sesiForm.jamMulai}
                    onChange={e => setSesiForm(f => ({...f, jamMulai: e.target.value}))}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Jam Selesai</label>
                  <input type="time" value={sesiForm.jamSelesai}
                    onChange={e => setSesiForm(f => ({...f, jamSelesai: e.target.value}))}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>

              {/* Mata Pelajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mata Pelajaran</label>
                <select value={sesiForm.mapel}
                  onChange={e => setSesiForm(f => ({...f, mapel: e.target.value}))}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {MAPEL_OPTIONS_AK.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* JP & Guru */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Jumlah JP</label>
                  <input type="number" min="1" max="12" value={sesiForm.jp}
                    onChange={e => setSesiForm(f => ({...f, jp: e.target.value}))}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Guru / Pengajar</label>
                  <input type="text" value={sesiForm.guru}
                    onChange={e => setSesiForm(f => ({...f, guru: e.target.value}))}
                    placeholder="Nama guru"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setSesiModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleSaveSesiModal}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all ${HARI_COLORS[activeHari].bg} hover:opacity-90`}>
                {sesiEditIdx !== null ? '✓ Perbarui' : '+ Simpan Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
          <div>
            <h2 className="text-base font-black text-white">🗓️ Kalender & Jadwal Akademik</h2>
            <p className="text-purple-200 text-xs mt-0.5">{ctx.activeSemester} · {ctx.activeTahun} · {ctx.loggedInKelas}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white/20 p-1 rounded-xl">
              {[{id:'kalender',label:'📅 Kalender'},{id:'jadwal',label:'📚 Jadwal'}].map(tab => (
                <button key={tab.id} onClick={() => setActiveMenu(tab.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeMenu===tab.id ? 'bg-white text-purple-800 shadow-sm' : 'text-white/70 hover:text-white'
                  }`}>{tab.label}</button>
              ))}
            </div>
          </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Memuat data...</div>
      ) : (
        <>
          {activeMenu === 'kalender' && renderKalender()}
          {activeMenu === 'jadwal'   && renderJadwal()}
        </>
      )}
    </div>
  );
};

// ==========================================
// LIVE CLOCK COMPONENT
// ==========================================
const LiveClock = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const h = time.getHours().toString().padStart(2,'0');
  const m = time.getMinutes().toString().padStart(2,'0');
  return <p className="text-base font-black text-purple-700 leading-none">{h}:{m}</p>;
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
  const [showPass, setShowPass] = useState(false);

  // Sesi Aktif (Setelah Login)
  const [loggedInKelas, setLoggedInKelas] = useState('');
  const [dbId, setDbId] = useState(''); // Contoh: 'db_kelas_1'

  // Global Context Dropdowns (Kelas dihilangkan dari dropdown karena sudah fix per guru)
  const [activeTahun, setActiveTahun] = useState('2025/2026');
  const [activeSemester, setActiveSemester] = useState('Ganjil');
  const [showTahunInput, setShowTahunInput] = useState(false);
  const [customTahunInput, setCustomTahunInput] = useState('');

  // Data States
  const [settings, setSettings] = useState({ 
    logoUrl: '', 
    namaSekolah: 'SD NEGERI NUSANTARA',
    kotaTandatangan: '',
    username: '',
    password: ''
  });
  const [profile, setProfile] = useState({ nama: '', nip: '', foto: '', namaKepalaSekolah: '', nipKepalaSekolah: '' });
  const [students, setStudents] = useState([]);
  const [allStudentsByKelas, setAllStudentsByKelas] = useState({}); // untuk guru mapel
  const [allAttendanceByKelas, setAllAttendanceByKelas] = useState({}); // untuk guru mapel
  const [attendance, setAttendance] = useState([]);
  const [journals, setJournals] = useState([]);
  const [tools, setTools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [jadwalData, setJadwalData] = useState({});

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
    const unsubProfile = onSnapshot(doc(db, 'users', dbId, 'data', `profile_${activeTahun.replace('/', '_')}`), (snap) => {
      if (snap.exists()) setProfile(snap.data());
      else setProfile({ nama: '', nip: '', foto: '' });
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

    // === SUBSCRIPTION JADWAL ===
    const semKey = `${activeSemester}${activeTahun}`.replace(/[^a-zA-Z0-9]/g, '');
    const unsubJadwal = onSnapshot(
      doc(db, 'users', dbId, 'jadwal', semKey),
      (snap) => {
        if (snap.exists() && snap.data().jadwal) {
          setJadwalData(snap.data().jadwal);
        } else {
          setJadwalData({});
        }
      },
      (error) => {
        console.error('Gagal memuat jadwal:', error);
        setJadwalData({});
      }
    );

    return () => {
      unsubSettings();
      unsubTahunSemester();
      unsubProfile();
      unsubStudents();
      unsubAttendance();
      unsubJournals();
      unsubTools();
      unsubGrades();
      unsubJadwal();
    };
  }, [isEntered, dbId, activeTahun, activeSemester]);

  // Fetch semua siswa dan absensi dari kelas 1-6 untuk guru mapel
  useEffect(() => {
    if (!isEntered || !isGuruMapel(loggedInKelas)) return;
    const unsubs = [];
    KELAS_OPTIONS.forEach(kelas => {
      const kelasDbId = `db_${kelas.replace(' ', '_').toLowerCase()}`;
      unsubs.push(onSnapshot(collection(db, 'users', kelasDbId, 'students'), (snap) => {
        const siswa = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllStudentsByKelas(prev => ({ ...prev, [kelas]: siswa }));
      }));
      unsubs.push(onSnapshot(collection(db, 'users', kelasDbId, 'attendance'), (snap) => {
        const att = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllAttendanceByKelas(prev => ({ ...prev, [kelas]: att }));
      }));
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
      <ErrorBoundary>
      <div className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(160deg,#1e0533 0%,#3b0764 55%,#4c1d95 100%)'}}>
        {/* Dekorasi blur background */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-25 pointer-events-none" style={{background:'radial-gradient(circle,#a855f7,transparent)',filter:'blur(80px)'}}></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15 pointer-events-none" style={{background:'radial-gradient(circle,#6d28d9,transparent)',filter:'blur(80px)'}}></div>

        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border border-purple-100 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{background:'radial-gradient(circle,#f5f3ff,transparent)',filter:'blur(30px)',marginRight:-40,marginTop:-40}}></div>

          {/* Logo */}
          <div className="flex justify-center mb-3 relative z-10">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo Sekolah" className="w-20 h-20 object-contain" />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center rounded-2xl" style={{background:'linear-gradient(135deg,#ede9fe,#ddd6fe)'}}>
                <BookOpen size={40} style={{color:'#5b21b6'}} />
              </div>
            )}
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">{settings.namaSekolah}</p>
          <h1 className="text-3xl font-black mb-1 relative z-10" style={{color:'#4c1d95'}}>SIAP GURU</h1>
          <p className="text-slate-500 font-semibold mb-7 relative z-10 text-sm">Portal Manajemen Kelas Terpadu</p>

          <form onSubmit={handleLogin} className="space-y-4 relative z-10 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Masuk Sebagai</label>
              <div className="relative">
                <Shield size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                <select
                  value={loginKelas} onChange={(e)=>setLoginKelas(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 cursor-pointer text-sm transition"
                  style={{background:'#f5f3ff',borderColor:'#ddd6fe',color:'#4c1d95','--tw-ring-color':'#7c3aed'}}
                >
                  {KELAS_OPTIONS.map(k => <option key={k} value={k}>Guru {k}</option>)}
                  {GURU_MAPEL_LIST.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="relative">
              <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'} value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} required
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 text-sm transition"
                style={{'--tw-ring-color':'#7c3aed'}}
                placeholder="Password"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition">
                {showPass ? <EyeOff size={17}/> : <Eye size={17}/>}
              </button>
            </div>

            <button
              type="submit" disabled={isLoggingIn}
              className="w-full text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-1 shadow-lg"
              style={{background: isLoggingIn ? '#6d28d9' : 'linear-gradient(135deg,#5b21b6,#4f46e5)', boxShadow:'0 6px 20px rgba(109,40,217,0.40)'}}
            >
              {isLoggingIn ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span> Memverifikasi...</>
              ) : 'Masuk Aplikasi'}
            </button>

            <div className="mt-4 text-center text-xs font-medium text-slate-400 bg-slate-50 p-3 rounded-xl border border-purple-50">
              Copyright &copy; 2026 Hairur Rahman
            </div>
          </form>
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  const guruMapelMode = isGuruMapel(loggedInKelas);

  const mainNavItems = guruMapelMode
    ? [
        { id: 'dashboard',  icon: Home,         label: 'Dashboard' },
        { id: 'students',   icon: Users,         label: 'Data Siswa' },
        { id: 'attendance', icon: CalendarCheck, label: 'Absensi' },
        { id: 'akademik',   icon: CalendarCheck, label: 'Akademik' },
        { id: 'journal',    icon: BookOpen,      label: 'Jurnal Mengajar' },
        { id: 'grades',     icon: Award,         label: 'Rekap Nilai' },
        { id: 'statistik',  icon: TrendingUp,    label: 'Statistik' },
        { id: 'tools',      icon: FolderOpen,    label: 'Perangkat' },
      ]
    : [
        { id: 'dashboard',  icon: Home,         label: 'Dashboard' },
        { id: 'students',   icon: Users,         label: 'Data Siswa' },
        { id: 'attendance', icon: CalendarCheck, label: 'Absensi' },
        { id: 'akademik',   icon: CalendarCheck, label: 'Akademik' },
        { id: 'journal',    icon: BookOpen,      label: 'Jurnal Mengajar' },
        { id: 'grades',     icon: Award,         label: 'Rekap Nilai' },
        { id: 'statistik',  icon: TrendingUp,    label: 'Statistik' },
        { id: 'tools',      icon: FolderOpen,    label: 'Perangkat' },
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
    <ErrorBoundary>
    <div className="flex flex-col h-screen text-slate-800 font-sans overflow-hidden" style={{fontFamily:"'Inter',system-ui,sans-serif", background:'#f0ebfa'}}>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-bold text-sm pointer-events-auto transition-all animate-fade-in ${t.type === 'error' ? 'bg-red-500 text-white' : 'bg-purple-700 text-white'}`}>
            {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header Atas — Purple Gradient */}
      <header className="shrink-0 z-20 px-4 pt-3 pb-4" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 50%,#4338ca 100%)', boxShadow:'0 4px 20px rgba(109,40,217,0.25)'}}>
        {/* Baris atas: hamburger + logo + jam */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* hamburger hanya desktop sidebar — disembunyikan di mobile karena ada bottom nav */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                {settings.logoUrl
                  ? <img src={settings.logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
                  : <BookOpen size={16} className="text-white" />}
              </div>
              <span className="font-black text-white text-sm tracking-wide hidden sm:block">SIAP GURU</span>
            </div>
          </div>
          {/* Kotak Hari & Jam */}
          <div className="bg-white rounded-xl px-3 py-1.5 text-right shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{['MINGGU','SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'][new Date().getDay()]}</p>
            <LiveClock />
          </div>
        </div>

        {/* Baris bawah: profil guru + selector */}
        <div className="flex items-center gap-3">
          {/* Foto guru */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/40 bg-white/20 flex items-center justify-center">
              {profile?.foto
                ? <img src={profile.foto} alt="Profil" className="w-full h-full object-cover" />
                : <User size={22} className="text-white/70" />}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
          </div>
          {/* Nama & Sekolah */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight truncate">{profile?.nama || loggedInKelas}</p>
            <p className="text-purple-200 text-[10px] font-semibold truncate">
              {guruMapelMode ? `Guru Mapel ${mapelGuru}` : `Guru ${loggedInKelas}`}
            </p>
            <p className="text-purple-300 text-[10px] truncate">{settings.namaSekolah || 'SIAP GURU'}</p>
          </div>
          {/* Selector Tahun & Semester */}
          <div className="flex flex-col gap-1 shrink-0">
            {showTahunInput ? (
              <div className="flex items-center gap-1">
                <input type="text" value={customTahunInput} onChange={e => setCustomTahunInput(e.target.value)} placeholder="2031/2032"
                  className="bg-white/20 border border-white/30 text-white placeholder-white/50 px-2 py-1 rounded-lg text-xs font-bold outline-none w-20" />
                <button onClick={() => { const val=customTahunInput.trim(); if(/^\d{4}\/\d{4}$/.test(val)){setActiveTahun(val);setDoc(doc(db,'users',dbId,'data','tahunSemester'),{tahun:val,semester:activeSemester},{merge:true});setShowTahunInput(false);setCustomTahunInput('');} }} className="bg-white text-purple-700 px-2 py-1 rounded-lg text-xs font-bold">✓</button>
                <button onClick={()=>{setShowTahunInput(false);setCustomTahunInput('');}} className="bg-white/20 text-white px-2 py-1 rounded-lg text-xs font-bold">✕</button>
              </div>
            ) : (
              <select value={activeTahun} onChange={(e)=>{ const val=e.target.value; if(val==='__custom__'){setShowTahunInput(true);return;} setActiveTahun(val); setDoc(doc(db,'users',dbId,'data','tahunSemester'),{tahun:val,semester:activeSemester},{merge:true}); }} className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded-lg text-xs font-semibold outline-none">
                {!TAHUN_OPTIONS.includes(activeTahun)&&<option value={activeTahun}>{activeTahun}</option>}
                {TAHUN_OPTIONS.map(t=><option key={t} value={t} style={{background:'#5b21b6'}}>{t}</option>)}
                <option value="__custom__" style={{background:'#5b21b6'}}>+ Tahun Lain</option>
              </select>
            )}
            <select value={activeSemester} onChange={(e)=>{ const val=e.target.value; setActiveSemester(val); setDoc(doc(db,'users',dbId,'data','tahunSemester'),{tahun:activeTahun,semester:val},{merge:true}); }} className="bg-white/20 border border-white/30 text-white px-2 py-1 rounded-lg text-xs font-semibold outline-none">
              <option value="Ganjil" style={{background:'#5b21b6'}}>Ganjil</option>
              <option value="Genap" style={{background:'#5b21b6'}}>Genap</option>
            </select>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay untuk mobile saat sidebar terbuka */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Sidebar */}
        <aside className={`fixed md:relative inset-y-0 left-0 z-30 w-56 h-full flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`} style={{background:'#faf7ff', borderRight:'1px solid #ede9fe'}}>
          <div className="flex items-center justify-between p-4 md:hidden border-b border-purple-100">
            <span className="font-black text-slate-800 text-sm">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 p-1 bg-purple-50 rounded-lg"><X size={18}/></button>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {mainNavItems.map(item => (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === item.id ? 'text-purple-800' : 'text-slate-500 hover:bg-purple-50 hover:text-slate-700'}`}
                style={activeTab === item.id ? {background:'linear-gradient(135deg,#ede9fe,#ddd6fe)'} : {}}>
                <item.icon size={16} className={activeTab === item.id ? 'text-purple-700' : 'text-slate-400'} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-2 space-y-0.5" style={{borderTop:'1px solid #ede9fe'}}>
            <button onClick={() => handleNavClick('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'settings' ? 'text-purple-800' : 'text-slate-500 hover:bg-purple-50 hover:text-slate-700'}`}
              style={activeTab === 'settings' ? {background:'linear-gradient(135deg,#ede9fe,#ddd6fe)'} : {}}>
              <Settings size={16} className={activeTab === 'settings' ? 'text-purple-700' : 'text-slate-400'} /> Pengaturan
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6" style={{background:'#f0ebfa'}}>
          {activeTab === 'dashboard' && <Dashboard profile={profile} students={guruMapelMode ? Object.values(allStudentsByKelas).flat().filter(s=>s.tahun===activeTahun) : classStudents} attendance={classAttendance} journals={classJournals} grades={classGrades} ctx={filterCtx} setActiveTab={setActiveTab} guruMapelMode={guruMapelMode} jadwalData={jadwalData} />}
          {activeTab === 'students' && !guruMapelMode && <StudentSection students={classStudents} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'students' && guruMapelMode && <StudentSectionGuruMapel allStudentsByKelas={allStudentsByKelas} ctx={filterCtx} />}
          {activeTab === 'attendance' && !guruMapelMode && <AttendanceSection students={classStudents} attendance={classAttendance} ctx={filterCtx} showToast={showToast} settings={settings} profile={profile} />}
          {activeTab === 'attendance' && guruMapelMode && <AttendanceSectionGuruMapel allStudentsByKelas={allStudentsByKelas} allAttendanceByKelas={allAttendanceByKelas} ctx={filterCtx} showToast={showToast} settings={settings} profile={profile} mapelGuru={mapelGuru} />}
          {activeTab === 'journal' && !guruMapelMode && <JournalSection journals={classJournals} attendance={classAttendance} students={classStudents} ctx={filterCtx} showToast={showToast} settings={settings} profile={profile} />}
          {activeTab === 'journal' && guruMapelMode && <JournalSectionGuruMapel journals={classJournals} allStudentsByKelas={allStudentsByKelas} allAttendanceByKelas={allAttendanceByKelas} ctx={filterCtx} showToast={showToast} settings={settings} profile={profile} mapelGuru={mapelGuru} />}
          {activeTab === 'tools' && <ToolsSection tools={classTools} ctx={filterCtx} showToast={showToast} guruMapelMode={guruMapelMode} />}
          {activeTab === 'grades' && !guruMapelMode && <GradesSection students={classStudents} grades={classGrades} attendance={classAttendance} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'grades' && guruMapelMode && <GradesSectionGuruMapel allStudentsByKelas={allStudentsByKelas} grades={classGrades} ctx={filterCtx} showToast={showToast} mapelGuru={mapelGuru} />}
          {activeTab === 'settings' && <SettingsSection settings={settings} profile={profile} ctx={filterCtx} showToast={showToast} />}
          {activeTab === 'akademik' && (
            <AkademikView
              ctx={filterCtx}
              settings={settings}
              profile={profile}
              showToast={showToast}
            />
          )}
          {activeTab === 'statistik' && (
            <StatistikView
              students={guruMapelMode ? Object.values(allStudentsByKelas).flat().filter(s=>s.tahun===activeTahun) : classStudents}
              attendance={classAttendance}
              grades={classGrades}
              journals={classJournals}
              ctx={filterCtx}
              guruMapelMode={guruMapelMode}
            />
          )}
        </main>
      </div>

      {/* ── BOTTOM NAVIGATION — Mobile Only ── */}
      <nav className="md:hidden shrink-0 bg-white border-t border-purple-100 px-1 relative z-20"
        style={{boxShadow:'0 -4px 20px rgba(109,40,217,0.10)'}}>
        <div className="flex items-center justify-around py-1">
          {/* Beranda */}
          <button onClick={() => handleNavClick('dashboard')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${activeTab==='dashboard' ? 'text-purple-700' : 'text-slate-400'}`}>
            <Home size={20} strokeWidth={activeTab==='dashboard' ? 2.5 : 1.8}/>
            <span className="text-[9px] font-black tracking-wide">BERANDA</span>
          </button>

          {/* Profil */}
          <button onClick={() => handleNavClick('settings')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${activeTab==='settings' ? 'text-purple-700' : 'text-slate-400'}`}>
            <User size={20} strokeWidth={activeTab==='settings' ? 2.5 : 1.8}/>
            <span className="text-[9px] font-black tracking-wide">PROFIL</span>
          </button>

          {/* FAB Tengah */}
          <div className="relative flex flex-col items-center" style={{marginTop:'-22px'}}>
            <button onClick={() => handleNavClick('journal')}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow:'0 4px 18px rgba(79,70,229,0.45)'}}>
              <span className="text-white text-3xl font-thin leading-none" style={{marginTop:'-2px'}}>+</span>
            </button>
          </div>

          {/* Statistik */}
          <button onClick={() => handleNavClick('statistik')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${activeTab==='statistik' ? 'text-purple-700' : 'text-slate-400'}`}>
            <TrendingUp size={20} strokeWidth={activeTab==='statistik' ? 2.5 : 1.8}/>
            <span className="text-[9px] font-black tracking-wide">STATISTIK</span>
          </button>

          {/* Keluar */}
          <button onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-400">
            <LogOut size={20} strokeWidth={1.8}/>
            <span className="text-[9px] font-black tracking-wide">KELUAR</span>
          </button>
        </div>
      </nav>
    </div>
    </ErrorBoundary>
  );
}

// ==========================================
// ==========================================
// KKTP CHART COMPONENT (dengan toggle Sumatif / Nilai Akhir)
// ==========================================
const KKTPChart = ({ grades, hasGrades, kktpInterval }) => {
  const KKTP_DEF = [
    { label:'Perlu Bimbingan', color:'#ef4444' },
    { label:'Berkembang',      color:'#f59e0b' },
    { label:'Cakap',           color:'#3b82f6' },
    { label:'Mahir',           color:'#10b981' },
  ];
  const MAPEL_LIST = ['Pendidikan Pancasila','Bahasa Indonesia','Matematika','IPAS','Seni Budaya','Bahasa Madura'];

  // Hitung S_OPTIONS dinamis dari data grades
  const S_OPTIONS = React.useMemo(() => {
    const maxS = Math.max(0, ...grades.map(g => {
      let m = 0;
      for (let n = 1; n <= 8; n++) { if (g[`s${n}`] !== undefined && g[`s${n}`] !== '') m = n; }
      return m;
    }));
    const hasSas = grades.some(g => g.sas !== undefined && g.sas !== '');
    const opts = [];
    for (let i = 1; i <= Math.max(maxS, 1); i++) opts.push({ key: `s${i}`, label: `S${i}` });
    if (hasSas) opts.push({ key: 'sas', label: 'SAS' });
    return opts;
  }, [grades]);

  const [mode, setMode] = useState('akhir'); // 'akhir' | 'sumatif'
  const [selectedS, setSelectedS] = useState('s1');

  // Reset selectedS kalau tidak ada di options
  React.useEffect(() => {
    if (S_OPTIONS.length && !S_OPTIONS.find(o => o.key === selectedS)) {
      setSelectedS(S_OPTIONS[0].key);
    }
  }, [S_OPTIONS]);

  const iv = kktpInterval || [40, 65, 85];
  const getKKTPIdx = (v) => {
    if (v <= iv[0]) return 0;
    if (v <= iv[1]) return 1;
    if (v <= iv[2]) return 2;
    return 3;
  };

  const getVal = (g) => {
    if (mode === 'sumatif') {
      const v = parseFloat(g[selectedS]);
      return isNaN(v) ? null : v;
    }
    const sKeys = ['s1','s2','s3','s4','s5','s6','s7','s8'];
    const vs = sKeys.map(k => parseFloat(g[k])).filter(v => !isNaN(v));
    const avg = vs.length ? vs.reduce((a,b)=>a+b,0)/vs.length : 0;
    const akhir = parseFloat(g.sas ?? g.akhir);
    if (avg > 0 && !isNaN(akhir)) return (avg + akhir) / 2;
    if (avg > 0) return avg;
    if (!isNaN(akhir)) return akhir;
    return null;
  };

  const mapelData = MAPEL_LIST.map(m => {
    const recs = grades.filter(g => g.mapel === m);
    if (!recs.length) return null;
    const counts = [0,0,0,0];
    recs.forEach(g => {
      const v = getVal(g);
      if (v !== null) counts[getKKTPIdx(v)]++;
    });
    const total = counts.reduce((a,b)=>a+b,0);
    if (!total) return null;
    return { mapel: m.replace('Pendidikan ','Pend. ').replace('Bahasa ','B. '), counts, total };
  }).filter(Boolean);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <TrendingUp size={14} className="text-purple-600"/> Distribusi KKTP per Mata Pelajaran
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Kurikulum Merdeka</p>
        </div>
        {/* Toggle mode */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            <button onClick={() => setMode('akhir')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode==='akhir'?'bg-white text-purple-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
              Nilai Akhir
            </button>
            <button onClick={() => setMode('sumatif')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode==='sumatif'?'bg-white text-purple-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
              Sumatif
            </button>
          </div>
          {mode === 'sumatif' && (
            <select value={selectedS} onChange={e => setSelectedS(e.target.value)}
              className="bg-white border border-slate-200 text-purple-800 px-2.5 py-1.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500">
              {S_OPTIONS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          )}
        </div>
      </div>

      {!hasGrades || mapelData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <Award size={32} className="mb-2"/>
          <p className="text-sm text-slate-400 font-medium">Belum ada data nilai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mapelData.map(({ mapel, counts, total }) => (
            <div key={mapel}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-slate-600">{mapel}</span>
                <span className="text-[10px] text-slate-400 font-medium">{total} siswa</span>
              </div>
              <div className="flex h-7 rounded-lg overflow-hidden w-full gap-px">
                {KKTP_DEF.map((k, i) => {
                  const pct = total > 0 ? (counts[i]/total)*100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div key={k.label}
                      title={`${k.label}: ${counts[i]} siswa (${pct.toFixed(0)}%)`}
                      style={{width:`${pct}%`, background: k.color}}
                      className="flex items-center justify-center transition-all relative group/bar">
                      {pct > 8 && <span className="text-white text-[9px] font-black">{counts[i]}</span>}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition pointer-events-none z-10">
                        {k.label}: {counts[i]} ({pct.toFixed(0)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex mt-1.5 gap-3 flex-wrap">
                {KKTP_DEF.map((k, i) => counts[i] > 0 && (
                  <span key={k.label} className="text-[9px] font-bold flex items-center gap-1" style={{color: k.color}}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:k.color}}></span>
                    {k.label} {counts[i]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// KEHADIRAN CHART — pilih bulan, tampil Sakit/Izin/Alpha dalam persen
// ==========================================
const KehadiranChart = ({ attendance }) => {
  const BULAN_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  const ABSEN_STATUS = [
    { key:'sakit', label:'Sakit', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a', textColor:'#92400e' },
    { key:'izin',  label:'Izin',  color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', textColor:'#1e40af' },
    { key:'alpha', label:'Alpha', color:'#ef4444', bg:'#fef2f2', border:'#fecaca', textColor:'#991b1b' },
  ];

  // Kumpulkan semua bulan yang punya data
  const bulanData = {};
  (attendance || []).forEach(a => {
    if (!a.tanggal) return;
    const bKey = a.tanggal.substring(0,7);
    if (!bulanData[bKey]) bulanData[bKey] = { hadir:0, sakit:0, izin:0, alpha:0, siswaAbsen:{} };
    if (a.status==='Hadir') bulanData[bKey].hadir++;
    else if (a.status==='Sakit') { bulanData[bKey].sakit++; if(a.siswaId||a.nama){const id=a.siswaId||a.nama; if(!bulanData[bKey].siswaAbsen[id])bulanData[bKey].siswaAbsen[id]={nama:a.nama||a.siswaId,sakit:0,izin:0,alpha:0}; bulanData[bKey].siswaAbsen[id].sakit++;} }
    else if (a.status==='Izin')  { bulanData[bKey].izin++;  if(a.siswaId||a.nama){const id=a.siswaId||a.nama; if(!bulanData[bKey].siswaAbsen[id])bulanData[bKey].siswaAbsen[id]={nama:a.nama||a.siswaId,sakit:0,izin:0,alpha:0}; bulanData[bKey].siswaAbsen[id].izin++; } }
    else if (a.status==='Alpha') { bulanData[bKey].alpha++; if(a.siswaId||a.nama){const id=a.siswaId||a.nama; if(!bulanData[bKey].siswaAbsen[id])bulanData[bKey].siswaAbsen[id]={nama:a.nama||a.siswaId,sakit:0,izin:0,alpha:0}; bulanData[bKey].siswaAbsen[id].alpha++;} }
  });

  const bulanKeys = Object.keys(bulanData).sort();
  const [selectedBulan, setSelectedBulan] = useState(bulanKeys[bulanKeys.length-1] || '');

  if (bulanKeys.length === 0) return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
      <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
        <CalendarCheck size={14} className="text-emerald-500"/> Ketidakhadiran Bulanan
      </h3>
      <div className="flex flex-col items-center justify-center py-10 text-slate-300">
        <CalendarCheck size={32} className="mb-2"/>
        <p className="text-sm text-slate-400 font-medium">Belum ada data kehadiran.</p>
      </div>
    </div>
  );

  const d = bulanData[selectedBulan] || { hadir:0, sakit:0, izin:0, alpha:0 };
  const totalSiswaHari = d.hadir + d.sakit + d.izin + d.alpha;
  const pctSakit = totalSiswaHari > 0 ? ((d.sakit/totalSiswaHari)*100) : 0;
  const pctIzin  = totalSiswaHari > 0 ? ((d.izin /totalSiswaHari)*100) : 0;
  const pctAlpha = totalSiswaHari > 0 ? ((d.alpha/totalSiswaHari)*100) : 0;
  const pctHadir = totalSiswaHari > 0 ? ((d.hadir/totalSiswaHari)*100) : 0;
  const bulanLabel = selectedBulan ? `${BULAN_ID[parseInt(selectedBulan.split('-')[1])-1]} ${selectedBulan.substring(0,4)}` : '';

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <CalendarCheck size={14} className="text-emerald-500"/> Ketidakhadiran Siswa
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Sakit · Izin · Alpha dalam persen</p>
        </div>
        <select value={selectedBulan} onChange={e => setSelectedBulan(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500">
          {bulanKeys.map(k => (
            <option key={k} value={k}>{BULAN_ID[parseInt(k.split('-')[1])-1]} {k.substring(0,4)}</option>
          ))}
        </select>
      </div>

      {/* Hadir badge */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-700">✓ Hadir — {bulanLabel}</span>
        <span className="text-xl font-black text-emerald-600">{pctHadir.toFixed(1)}%</span>
      </div>

      {/* 3 bar horizontal — Sakit, Izin, Alpha */}
      <div className="space-y-3">
        {[
          { key:'sakit', label:'Sakit', pct:pctSakit, count:d.sakit, ...ABSEN_STATUS[0] },
          { key:'izin',  label:'Izin',  pct:pctIzin,  count:d.izin,  ...ABSEN_STATUS[1] },
          { key:'alpha', label:'Alpha', pct:pctAlpha, count:d.alpha, ...ABSEN_STATUS[2] },
        ].map(s => (
          <div key={s.key}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold" style={{color:s.textColor}}>{s.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black" style={{color:s.color}}>{s.pct.toFixed(1)}%</span>
                <span className="text-[10px] text-slate-400">({s.count} sesi)</span>
              </div>
            </div>
            <div className="h-5 rounded-lg overflow-hidden" style={{background:'#f1f5f9'}}>
              <div className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                style={{width:`${Math.max(s.pct > 0 ? 4 : 0, s.pct)}%`, background:s.color}}>
                {s.pct > 8 && <span className="text-white text-[9px] font-black">{s.pct.toFixed(1)}%</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ringkasan angka */}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
        {ABSEN_STATUS.map(s => (
          <div key={s.key} className="text-center p-2.5 rounded-xl border" style={{background:s.bg, borderColor:s.border}}>
            <p className="text-lg font-black" style={{color:s.color}}>{d[s.key] || 0}</p>
            <p className="text-[9px] font-bold mt-0.5" style={{color:s.textColor}}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// KKTP PER SISWA — seluruh siswa, nilai sumatif S1-S4 per mapel
// ==========================================
const KKTPperSiswa = ({ students, grades, kktpInterval }) => {
  // S_OPTIONS dinamis dari data grades
  const S_OPTIONS = React.useMemo(() => {
    const maxS = Math.max(0, ...grades.map(g => {
      let m = 0;
      for (let n = 1; n <= 8; n++) { if (g[`s${n}`] !== undefined && g[`s${n}`] !== '') m = n; }
      return m;
    }));
    const hasSas = grades.some(g => g.sas !== undefined && g.sas !== '');
    const opts = [];
    for (let i = 1; i <= Math.max(maxS, 1); i++) opts.push({ key: `s${i}`, label: `S${i}` });
    if (hasSas) opts.push({ key: 'sas', label: 'SAS' });
    return opts;
  }, [grades]);

  const [selectedS, setSelectedS] = useState('s1');

  React.useEffect(() => {
    if (S_OPTIONS.length && !S_OPTIONS.find(o => o.key === selectedS)) {
      setSelectedS(S_OPTIONS[0].key);
    }
  }, [S_OPTIONS]);
  const MAPEL_LIST = ['Pendidikan Pancasila','Bahasa Indonesia','Matematika','IPAS','Seni Budaya','Bahasa Madura'];
  const iv = kktpInterval || [40, 65, 85];
  const KKTP = [
    { label:'Perlu Bimbingan', color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
    { label:'Berkembang',      color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
    { label:'Cakap',           color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe' },
    { label:'Mahir',           color:'#10b981', bg:'#ecfdf5', border:'#a7f3d0' },
  ];
  const getKKTP = (v) => v <= iv[0] ? 0 : v <= iv[1] ? 1 : v <= iv[2] ? 2 : 3;

  const siswaNilai = (students||[]).map(s => {
    const mapelNilai = MAPEL_LIST.map(m => {
      const g = (grades||[]).find(gd => gd.siswaId === s.id && gd.mapel === m);
      if (!g) return null;
      const v = parseFloat(g[selectedS]);
      if (isNaN(v)) return null;
      return { mapel: m.replace('Pendidikan ','Pend. ').replace('Bahasa ','B. '), nilai: v, kktp: getKKTP(v) };
    }).filter(Boolean);
    return { ...s, mapelNilai };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Users size={14} className="text-purple-600"/> KKTP per Siswa
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Capaian KKTP seluruh siswa per Sumatif</p>
        </div>
        <select value={selectedS} onChange={e => setSelectedS(e.target.value)}
          className="bg-white border border-slate-200 text-purple-800 px-2.5 py-1.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500">
          {S_OPTIONS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      <div className="p-5">
        {siswaNilai.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300">
            <Users size={32} className="mb-2"/>
            <p className="text-sm text-slate-400 font-medium">Belum ada data siswa.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {siswaNilai.map((s, idx) => (
              <div key={s.id} className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-slate-500">{idx+1}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{s.nama}</p>
                  {s.mapelNilai.length === 0 && <span className="text-[10px] text-slate-400 italic ml-1">— belum ada nilai {S_OPTIONS.find(t=>t.key===selectedS)?.label}</span>}
                </div>
                {s.mapelNilai.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {s.mapelNilai.map(mn => {
                      const k = KKTP[mn.kktp];
                      return (
                        <span key={mn.mapel} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                          style={{background:k.bg, borderColor:k.border, color:k.color}}>
                          {mn.mapel}: {mn.nilai} · {k.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 1. DASHBOARD COMPONENT
// ==========================================
// Komponen GrafikDistribusi
const GrafikDistribusi = ({ students, grades, mapelList }) => {
  const [selectedMapel, setSelectedMapel] = React.useState(mapelList[0] || '');
  const KKM = 70;
  const data = students.map(s => {
    const rec = grades.find(g => (g.siswaId === s.id || g.id === s.id) && g.mapel === selectedMapel);
    if (!rec) return null;
    const sKeys = ['s1','s2','s3','s4','s5','s6','s7','s8'];
    const vs = sKeys.map(k => parseFloat(rec[k])).filter(v => !isNaN(v));
    if (!vs.length) return null;
    const rata = vs.reduce((a,b)=>a+b,0)/vs.length;
    const akhir = parseFloat(rec.akhir);
    const nilai = !isNaN(akhir) ? (rata+akhir)/2 : rata;
    return { nama: s.nama, nilai };
  }).filter(Boolean).sort((a,b) => b.nilai - a.nilai);
  const svgW = 520; const svgH = 185; const padL = 16; const padR = 16; const padT = 24; const padB = 55;
  const chartW = svgW - padL - padR; const chartH = svgH - padT - padB;
  const barW = data.length > 0 ? Math.min(36, Math.floor((chartW - (data.length-1)*4) / data.length)) : 36;
  const totalBarW = data.length * barW + (data.length-1) * 4;
  const startX = padL + (chartW - totalBarW) / 2;
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h4 className="text-sm font-black text-slate-700">Distribusi Nilai Siswa</h4>
        <select value={selectedMapel} onChange={e => setSelectedMapel(e.target.value)}
          className="text-xs border border-slate-200 bg-white rounded-lg px-2 py-1 outline-none font-bold text-slate-600">
          {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">merah = di bawah KKM 70</span>
      </div>
      {data.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-300 text-sm">Belum ada data nilai</div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-3 overflow-x-auto">
          <svg viewBox={'0 0 ' + svgW + ' ' + svgH} className="w-full max-w-lg" style={{minWidth: Math.max(300, data.length*44)}}>
            {[0,25,50,75,100].map(v => {
              const y = padT + chartH - (v/100)*chartH;
              return <line key={v} x1={padL} y1={y} x2={svgW-padR} y2={y} stroke="#e2e8f0" strokeWidth="1"/>;
            })}
            <line x1={padL} y1={padT + chartH - (KKM/100)*chartH} x2={svgW-padR} y2={padT + chartH - (KKM/100)*chartH}
              stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3"/>
            {data.map((d,i) => {
              const x = startX + i*(barW+4);
              const h = Math.max(3, (d.nilai/100)*chartH);
              const y = padT + chartH - h;
              const col = d.nilai >= KKM ? '#4f46e5' : '#ef4444';
              const light = d.nilai >= KKM ? '#eef2ff' : '#fef2f2';
              return (
                <g key={i}>
                  <title>{d.nama}</title>
                  <rect x={x} y={padT} width={barW} height={chartH} fill={light} rx="3"/>
                  <rect x={x} y={y} width={barW} height={h} fill={col} rx="3" opacity="0.85"/>
                  <text x={x+barW/2} y={y-4} fontSize="9" fill={col} textAnchor="middle" fontWeight="800">{d.nilai.toFixed(0)}</text>
                  <text x={x+barW/2} y={padT+chartH+14} fontSize="7.5" fill="#64748b" textAnchor="end" transform={"rotate(-40 " + (x+barW/2) + " " + (padT+chartH+14) + ")"}>{d.nama}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ profile, students, attendance, journals, grades, ctx, setActiveTab, guruMapelMode, jadwalData }) => {
  const today = getTodayDate();
  const todayAttendance = attendance.filter(a => a.tanggal === today);
  const presentToday = todayAttendance.filter(a => a.status === 'Hadir').length;
  const absentToday = students.length - presentToday;
  const isAbsenLengkap = todayAttendance.length === students.length && students.length > 0;
  const todayJournals = journals.filter(j => j.tanggal === today);
  const latestJournals = [...journals].sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal)).slice(0, 3);

  // ============================================================
  // SEMI-AI ANALYSIS
  // ============================================================
  const analysis = (() => {
    // --- Analisis Nilai ---
    let nilaiList = [];
    students.forEach(s => {
      // Ambil semua nilai dari semua mapel untuk siswa ini
      const gradeRecords = grades.filter(g => g.siswaId === s.id);
      gradeRecords.forEach(g => {
        let sum = 0, cnt = 0;
        [1,2,3,4,5,6,7,8].forEach(n => {
          if (g[`s${n}`]) { sum += Number(g[`s${n}`]); cnt++; }
        });
        const avg = cnt > 0 ? sum / cnt : 0;
        const akhir = Number(g.akhir || 0);
        let final = 0;
        if (avg > 0 && akhir > 0) final = (avg + akhir) / 2;
        else if (avg > 0) final = avg;
        else if (akhir > 0) final = akhir;
        if (final > 0) nilaiList.push({ siswaId: s.id, final });
      });
    });

    const rataRataKelas = nilaiList.length > 0
      ? nilaiList.reduce((s, v) => s + v.final, 0) / nilaiList.length
      : null;

    let statusNilai = null;
    if (rataRataKelas !== null) {
      if (rataRataKelas >= 75) statusNilai = 'baik';
      else if (rataRataKelas >= 60) statusNilai = 'cukup';
      else statusNilai = 'perhatian';
    }

    // --- Analisis Absensi per siswa (seluruh semester) ---
    // Hitung semua ketidakhadiran: Alpha + Izin + Sakit
    const absensiPerSiswa = {}; // { siswaId: { total, alpha, izin, sakit } }
    attendance.forEach(a => {
      if (a.status !== 'Hadir') {
        if (!absensiPerSiswa[a.siswaId]) absensiPerSiswa[a.siswaId] = { total: 0, alpha: 0, izin: 0, sakit: 0 };
        absensiPerSiswa[a.siswaId].total++;
        if (a.status === 'Alpha') absensiPerSiswa[a.siswaId].alpha++;
        else if (a.status === 'Izin') absensiPerSiswa[a.siswaId].izin++;
        else if (a.status === 'Sakit') absensiPerSiswa[a.siswaId].sakit++;
      }
    });

    // --- Nilai rendah per siswa per mapel ---
    const nilaiRendahPerSiswa = {}; // { siswaId: [{ mapel, nilai }] }
    const rataPerSiswa = {};        // { siswaId: rataRata }
    students.forEach(s => {
      const gradeRecords = grades.filter(g => g.siswaId === s.id);
      let totalFinal = 0, countFinal = 0;
      gradeRecords.forEach(g => {
        let sum = 0, cnt = 0;
        [1,2,3,4,5,6,7,8].forEach(n => {
          if (g[`s${n}`]) { sum += Number(g[`s${n}`]); cnt++; }
        });
        const avg = cnt > 0 ? sum / cnt : 0;
        const akhir = Number(g.akhir || 0);
        let final = 0;
        if (avg > 0 && akhir > 0) final = (avg + akhir) / 2;
        else if (avg > 0) final = avg;
        else if (akhir > 0) final = akhir;
        if (final > 0) {
          totalFinal += final; countFinal++;
          if (final < 70) {
            if (!nilaiRendahPerSiswa[s.id]) nilaiRendahPerSiswa[s.id] = [];
            nilaiRendahPerSiswa[s.id].push({ mapel: g.mapel || g.kelas || '-', nilai: Math.round(final) });
            // Sort mapel dari nilai terendah
            nilaiRendahPerSiswa[s.id].sort((a, b) => a.nilai - b.nilai);
          }
        }
      });
      if (countFinal > 0) rataPerSiswa[s.id] = totalFinal / countFinal;
    });

    // --- Siswa perlu perhatian: kebalikan dari siswa terbaik ---
    // Urutkan dari skorKebaikan TERENDAH (nilai rendah + absen banyak)
    const siswaPerhatian = students
      .filter(s => rataPerSiswa[s.id] != null || absensiPerSiswa[s.id] != null)
      .map(s => {
        const absen = absensiPerSiswa[s.id];
        const rata = rataPerSiswa[s.id] || 0;
        const absenPenalty = absen ? absen.total * 2 : 0;
        const skorKebaikan = rata - absenPenalty;
        const absenDetail = absen
          ? `Absen ${absen.total}x (S:${absen.sakit} I:${absen.izin} A:${absen.alpha})`
          : null;
        const mapelRendah = nilaiRendahPerSiswa[s.id]
          ? nilaiRendahPerSiswa[s.id].map(m => `${m.mapel} (${m.nilai})`).join(', ')
          : null;
        return {
          ...s, skorKebaikan, rata: Math.round((rata || 0) * 10) / 10,
          absenTotal: absen ? absen.total : 0,
          alasanList: [
            mapelRendah ? `Nilai rendah: ${mapelRendah}` : null,
            absenDetail,
          ].filter(Boolean)
        };
      })
      .sort((a, b) => a.skorKebaikan - b.skorKebaikan) // terendah di atas = paling perlu perhatian
      .slice(0, 5);

    // --- Top Siswa Terbaik: nilai rata-rata tertinggi + absen paling sedikit ---
    const topSiswa = students
      .filter(s => rataPerSiswa[s.id] != null)
      .map(s => {
        const absen = absensiPerSiswa[s.id];
        const rata = rataPerSiswa[s.id];
        // Skor kebaikan: nilai tinggi + absen sedikit
        const absenPenalty = absen ? absen.total * 2 : 0;
        const skorKebaikan = rata - absenPenalty;
        return { ...s, rata: Math.round(rata * 10) / 10, absenTotal: absen ? absen.total : 0, skorKebaikan };
      })
      .sort((a, b) => b.skorKebaikan - a.skorKebaikan) // terbaik di atas
      .slice(0, 5);

    // --- Rekomendasi berbasis KKTP Kurikulum Merdeka ---
    const rekomendasi = [];
    // Hitung distribusi KKTP seluruh kelas
    const kktpCount = [0,0,0,0]; // [PerluBimbingan, Berkembang, Cakap, Mahir]
    nilaiList.forEach(v => {
      if (v <= 40) kktpCount[0]++;
      else if (v <= 65) kktpCount[1]++;
      else if (v <= 85) kktpCount[2]++;
      else kktpCount[3]++;
    });
    if (kktpCount[0] > 0)
      rekomendasi.push({ teks: `${kktpCount[0]} siswa masih Perlu Bimbingan (0–40). Pertimbangkan intervensi intensif.`, warna: 'rose' });
    if (kktpCount[1] > 0)
      rekomendasi.push({ teks: `${kktpCount[1]} siswa dalam fase Berkembang (41–65). Dorong dengan pembelajaran diferensiasi.`, warna: 'amber' });
    if (Object.values(absensiPerSiswa).some(v => v.total > 3))
      rekomendasi.push({ teks: 'Beberapa siswa sering tidak hadir. Koordinasikan dengan orang tua.', warna: 'amber' });
    if (!guruMapelMode && absentToday > 3 && todayAttendance.length > 0)
      rekomendasi.push({ teks: `${absentToday} siswa tidak hadir hari ini. Cek kondisi siswa.`, warna: 'amber' });
    if (kktpCount[2] + kktpCount[3] > 0 && kktpCount[0] === 0 && kktpCount[1] === 0)
      rekomendasi.push({ teks: `Seluruh siswa sudah Cakap/Mahir. Pertahankan strategi pembelajaran!`, warna: 'emerald' });
    if (rekomendasi.length === 0)
      rekomendasi.push({ teks: 'Kondisi kelas stabil. Terus pantau perkembangan setiap siswa.', warna: 'emerald' });

    return { rataRataKelas, statusNilai, siswaPerhatian, topSiswa, rekomendasi, absentToday, hasGrades: nilaiList.length > 0 };
  })();

  // Compute jadwal hari ini
  const HARI_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const hariIniName = HARI_NAMES[new Date().getDay()];
  const jadwalHariIni = (jadwalData && jadwalData[hariIniName]) ? jadwalData[hariIniName] : [];
  const mapelHariIni = [...new Set(jadwalHariIni.filter(j=>j&&j.mapel&&j.mapel.toLowerCase()!=='istirahat'&&j.mapel.toLowerCase()!=='upacara').map(j=>j.mapel))];
  const shortMapel = (m) => m.replace('Pendidikan ','Pend. ').replace('Bahasa ','B. ');

  // Helper greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">

      {/* ── TOP BANNER — Purple Gradient ── */}
      <div className="rounded-3xl overflow-hidden relative" style={{background:'linear-gradient(135deg,#581c87 0%,#6d28d9 55%,#4338ca 100%)'}}>
        {/* Dekorasi blur kanan atas */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-25"
          style={{background:'radial-gradient(circle,#c4b5fd,transparent)',filter:'blur(50px)',marginRight:'-20px',marginTop:'-20px'}}/>
        {/* Gelombang bawah dekoratif */}
        <div className="absolute bottom-0 left-0 right-0 h-20 opacity-10 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
            <path d="M0,40 C60,10 140,70 200,40 C260,10 340,70 400,40 L400,80 L0,80 Z" fill="white"/>
            <path d="M0,55 C80,25 160,75 240,50 C300,30 360,65 400,50 L400,80 L0,80 Z" fill="white" opacity="0.5"/>
          </svg>
        </div>

        <div className="relative z-10 p-5 md:p-6">
          {/* Greeting */}
          <p className="text-yellow-300 text-sm font-semibold mb-0.5 flex items-center gap-1.5">
            ☀️ {getGreeting()},
          </p>
          <h2 className="text-white font-black text-xl md:text-2xl leading-tight mb-4">
            Siap Memulai Kelas Hari Ini?
          </h2>

          {/* Card Jadwal — sub-card semi-transparent */}
          <div className="rounded-2xl p-4 mb-4"
            style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.2)'}}>
            <p className="text-purple-200 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              ≡ JADWAL MENGAJAR ANDA
            </p>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-white font-black text-lg leading-tight">Jadwal Hari Ini</h3>
                <p className="text-purple-200 text-sm mb-2">{hariIniName}</p>
                {jadwalHariIni.length === 0 ? (
                  <p className="text-purple-300 text-sm">Tidak ada jadwal untuk hari ini</p>
                ) : (
                  <div className="space-y-1">
                    {jadwalHariIni.filter(j=>j&&j.mapel&&j.mapel.toLowerCase()!=='istirahat').slice(0,3).map((j,i) => (
                      <p key={i} className="text-white text-xs bg-white/10 rounded-lg px-2 py-1 inline-block mr-1.5">
                        {shortMapel(j.mapel)} {j.jamMulai ? `${j.jamMulai}` : ''}
                      </p>
                    ))}
                    {jadwalHariIni.length > 3 && <p className="text-purple-300 text-xs">+{jadwalHariIni.length - 3} lagi...</p>}
                  </div>
                )}
              </div>
              {/* Bell icon */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{background:'rgba(255,255,255,0.15)'}}>
                <Bell size={22} className="text-yellow-300" fill="currentColor"/>
              </div>
            </div>
          </div>

          {/* Pills info bawah: Tahun Ajaran & Semester */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 flex-1"
              style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)'}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{background:'rgba(255,255,255,0.15)'}}>📅</div>
              <div>
                <p className="text-purple-200 text-[9px] font-bold uppercase tracking-wide">TAHUN AJARAN</p>
                <p className="text-white font-black text-sm leading-tight">{ctx.activeTahun}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 flex-1"
              style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)'}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{background:'rgba(255,255,255,0.15)'}}>📚</div>
              <div>
                <p className="text-purple-200 text-[9px] font-bold uppercase tracking-wide">SEMESTER</p>
                <p className="text-white font-black text-sm leading-tight">{ctx.activeSemester}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MENU LAYANAN — Grid 4 kolom ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{border:'1px solid #ede9fe'}}>
        <h3 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-wider">Menu Layanan</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { id:'students',   icon:Users,         label:'Data Siswa', bg:'#eff6ff', color:'#1d4ed8', iconBg:'#dbeafe' },
            { id:'attendance', icon:CheckSquare,   label:'Absensi',    bg:'#f0fdf4', color:'#15803d', iconBg:'#dcfce7' },
            { id:'akademik',   icon:CalendarCheck, label:'Akademik',   bg:'#f0f9ff', color:'#0369a1', iconBg:'#e0f2fe' },
            { id:'journal',    icon:BookOpen,      label:'Jurnal',     bg:'#fdf4ff', color:'#7e22ce', iconBg:'#f3e8ff' },
            { id:'grades',     icon:Award,         label:'Nilai',      bg:'#fff7ed', color:'#c2410c', iconBg:'#ffedd5' },
            { id:'statistik',  icon:TrendingUp,    label:'Statistik',  bg:'#f5f3ff', color:'#6d28d9', iconBg:'#ede9fe' },
            { id:'tools',      icon:FolderOpen,    label:'Perangkat',  bg:'#fffbeb', color:'#b45309', iconBg:'#fef3c7' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 hover:shadow-md"
              style={{background:item.bg}}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{background:item.iconBg}}>
                <item.icon size={22} style={{color:item.color}}/>
              </div>
              <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ALERTS ── */}
      {(!guruMapelMode && !isAbsenLengkap) || todayJournals.length === 0 ? (
        <div className="flex flex-col sm:flex-row gap-3">
          {!guruMapelMode && !isAbsenLengkap && (
            <div className="flex-1 bg-amber-50 border border-amber-200/60 px-4 py-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0"><Bell size={15} className="text-amber-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-800 text-sm font-bold">Absensi belum lengkap</p>
                <p className="text-amber-600 text-xs">Segera lengkapi absensi siswa hari ini.</p>
              </div>
              <button onClick={() => setActiveTab('attendance')} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-600 transition shrink-0">Isi</button>
            </div>
          )}
          {todayJournals.length === 0 && (
            <div className="flex-1 bg-blue-50 border border-blue-200/60 px-4 py-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><BookOpen size={15} className="text-blue-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-800 text-sm font-bold">Jurnal hari ini kosong</p>
                <p className="text-blue-600 text-xs">Belum ada catatan mengajar hari ini.</p>
              </div>
              <button onClick={() => setActiveTab('journal')} className="text-xs bg-purple-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-800 transition shrink-0">Tambah</button>
            </div>
          )}
        </div>
      ) : null}

    </div>
  );
};

// ==========================================
// STATISTIK VIEW — semua widget analitik
// ==========================================
const StatistikView = ({ students, attendance, grades, journals, ctx, guruMapelMode }) => {
  const [kktpInterval, setKktpInterval] = useState([40, 65, 85]);
  const [editInterval, setEditInterval] = useState(false);
  const [tempInterval, setTempInterval] = useState([40, 65, 85]);

  const analysis = (() => {
    let nilaiList = [];
    students.forEach(s => {
      const gradeRecords = grades.filter(g => g.siswaId === s.id);
      gradeRecords.forEach(g => {
        let sum = 0, cnt = 0;
        [1,2,3,4,5,6,7,8].forEach(n => { if (g[`s${n}`]) { sum += Number(g[`s${n}`]); cnt++; } });
        const avg = cnt > 0 ? sum / cnt : 0;
        const akhir = Number(g.akhir || 0);
        let final = 0;
        if (avg > 0 && akhir > 0) final = (avg + akhir) / 2;
        else if (avg > 0) final = avg;
        else if (akhir > 0) final = akhir;
        if (final > 0) nilaiList.push({ siswaId: s.id, final });
      });
    });
    return { hasGrades: nilaiList.length > 0 };
  })();

  const handleSaveInterval = () => {
    const iv = tempInterval.map(Number);
    if (iv[0] >= iv[1] || iv[1] >= iv[2] || iv.some(v => isNaN(v) || v < 0 || v > 100)) return;
    setKktpInterval(iv);
    setEditInterval(false);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{background:'linear-gradient(135deg,#5b21b6,#4338ca)'}}>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <TrendingUp size={20} className="text-white"/>
        </div>
        <div>
          <h2 className="text-white font-black text-lg leading-tight">Statistik & Analitik</h2>
          <p className="text-purple-200 text-xs">{ctx.activeSemester} · {ctx.activeTahun} · {ctx.loggedInKelas}</p>
        </div>
      </div>

      {/* Interval KKTP + Distribusi KKTP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card Interval KKTP — bisa diedit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-700 text-sm">Interval KKTP</h3>
            <button onClick={() => { setTempInterval([...kktpInterval]); setEditInterval(v => !v); }}
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-1 rounded-lg transition">
              {editInterval ? 'Batal' : '✏ Edit'}
            </button>
          </div>
          {editInterval ? (
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400">Atur batas atas tiap kategori (0–100):</p>
              {[
                { label:'Perlu Bimbingan ≤', idx:0, color:'text-rose-600' },
                { label:'Berkembang ≤',      idx:1, color:'text-amber-600' },
                { label:'Cakap ≤',           idx:2, color:'text-blue-600' },
              ].map(row => (
                <div key={row.idx} className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-32 ${row.color}`}>{row.label}</span>
                  <input type="number" min="0" max="100" value={tempInterval[row.idx]}
                    onChange={e => { const nv=[...tempInterval]; nv[row.idx]=Number(e.target.value); setTempInterval(nv); }}
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-black outline-none focus:ring-2 focus:ring-purple-400"/>
                </div>
              ))}
              <div className="text-[10px] text-slate-400">Mahir: &gt; {tempInterval[2]}</div>
              <button onClick={handleSaveInterval}
                className="w-full bg-purple-700 text-white text-xs font-bold py-2 rounded-xl hover:bg-purple-800 transition">
                Simpan Interval
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label:'Perlu Bimbingan', range:`0 – ${kktpInterval[0]}`,                       color:'bg-rose-500',    light:'bg-rose-50 border-rose-100 text-rose-700' },
                { label:'Berkembang',      range:`${kktpInterval[0]+1} – ${kktpInterval[1]}`,    color:'bg-amber-400',   light:'bg-amber-50 border-amber-100 text-amber-700' },
                { label:'Cakap',           range:`${kktpInterval[1]+1} – ${kktpInterval[2]}`,    color:'bg-blue-500',    light:'bg-blue-50 border-blue-100 text-blue-700' },
                { label:'Mahir',           range:`${kktpInterval[2]+1} – 100`,                   color:'bg-emerald-500', light:'bg-emerald-50 border-emerald-100 text-emerald-700' },
              ].map(k => (
                <div key={k.label} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold ${k.light}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${k.color}`}></span>
                    {k.label}
                  </div>
                  <span className="font-bold">{k.range}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100" style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <KKTPChart grades={grades} hasGrades={analysis.hasGrades} kktpInterval={kktpInterval} />
        </div>
      </div>

      {/* KKTP per Siswa */}
      <KKTPperSiswa students={students} grades={grades} kktpInterval={kktpInterval} />
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
            <input type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
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
          <button type="submit" className="w-full bg-purple-700 text-white font-bold py-3 rounded-xl hover:bg-purple-800 transition">Simpan Siswa</button>
        </form>
      </Modal>

      <div className="rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div>
          <h2 className="text-base font-black text-white">Data Siswa <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm ml-1">{ctx.loggedInKelas}</span></h2>
          <p className="text-purple-200 text-xs mt-0.5">Tahun {ctx.activeTahun} · {students.length} Siswa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold transition hover:bg-purple-50 text-xs shadow-sm">
            <Users size={13} /> + Tambah
          </button>
          <button onClick={handleDownloadTemplateSiswa} className="flex items-center gap-1.5 bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-xl font-bold transition hover:bg-white/30 text-xs">
            <Download size={13} /> Template
          </button>
          <label className="flex items-center gap-1.5 bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-xl cursor-pointer hover:bg-white/30 font-bold transition text-xs">
            <Upload size={13} /> Import XLSX
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
                <th className="p-2 font-bold w-8 text-center">No</th>
                <th className="p-2 font-bold">Nama Lengkap</th>
                <th className="p-2 font-bold">NIS / NISN</th>
                <th className="p-2 font-bold text-center">L/P</th>
                <th className="p-2 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center text-slate-400 text-xs">Belum ada data siswa. Silakan tambah manual atau import dari Excel.</td></tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-2 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                    <td className="p-2 font-bold text-slate-800 text-xs">{s.nama}</td>
                    <td className="p-2 text-slate-500 text-xs">{s.nis || '-'} / {s.nisn || '-'}</td>
                    <td className="p-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.jk === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{s.jk}</span>
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => handleDelete(s.id)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={13}/></button>
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

  const handleBatalHadirSemua = async () => {
    if (students.length === 0) return;
    const toDelete = attendance.filter(a => a.tanggal === date);
    try {
      await Promise.all(toDelete.map(a => deleteDoc(doc(db, 'users', ctx.dbId, 'attendance', a.id))));
      showToast("Presensi hari ini berhasil direset");
    } catch(err) {
      showToast("Gagal mereset presensi", "error");
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
    const namaKepala = profile.namaKepalaSekolah || '___________________________';
    const nipKepala = profile.nipKepalaSekolah || '___________________________';
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
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Header gradient — semua kontrol ada di sini */}
      <div className="rounded-2xl p-3 md:p-4 flex flex-col gap-3" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        {/* Baris 1: Judul + Tombol aksi utama */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base font-black text-white">Presensi {ctx.loggedInKelas}</h2>
            <p className="text-purple-200 text-xs mt-0.5">Kehadiran harian · {ctx.activeSemester}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={handleHadirSemua} className="flex items-center gap-1 bg-emerald-400 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-emerald-500 transition shadow-sm">
              <CheckSquare size={12}/> Hadir Semua
            </button>
            <button onClick={handleBatalHadirSemua} className="flex items-center gap-1 bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-white/30 transition">
              <X size={12}/> Batalkan
            </button>
          </div>
        </div>
        {/* Baris 2: Export controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {Array.from({length: 12}, (_, i) => { const m=(i+1).toString().padStart(2,'0'); return <option key={m} value={m} style={{background:'#5b21b6'}}>{new Date(2000,i,1).toLocaleString('id-ID',{month:'long'})}</option>; })}
          </select>
          <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {[2025,2026,2027,2028,2029,2030,2031].map(y => <option key={y} value={y} style={{background:'#5b21b6'}}>{y}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-1 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-50 transition shadow-sm">
            <Download size={12}/> PDF
          </button>
          <button onClick={handleExportSemester} className="flex items-center gap-1 bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-white/30 transition">
            <Download size={12}/> XLSX
          </button>
        </div>
      </div>

      {/* Pengaturan tanggal — di luar header, baris sendiri */}
      <div className="bg-white rounded-2xl px-4 py-2.5 border border-purple-100 flex items-center justify-between shadow-sm">
        <p className="text-xs font-bold text-slate-500">📅 Tanggal Presensi</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="bg-purple-50 border border-purple-200 text-purple-900 px-3 py-1.5 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-purple-400" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
                <th className="p-2 font-bold w-8 text-center">No</th>
                <th className="p-2 font-bold">Nama Lengkap</th>
                <th className="p-2 font-bold text-center">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const att = attendance.find(a => a.siswaId === s.id && a.tanggal === date);
                const currentStatus = att ? att.status : '';
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-2 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                    <td className="p-2 font-bold text-slate-800 text-xs">{s.nama}</td>
                    <td className="p-2">
                      <div className="flex justify-center gap-1">
                        {['Hadir', 'Sakit', 'Izin', 'Alpha'].map(st => (
                          <button key={st} onClick={() => handleStatusChange(s.id, st)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                              currentStatus === st ?
                                st==='Hadir'?'bg-emerald-500 text-white':st==='Sakit'?'bg-blue-500 text-white':st==='Izin'?'bg-amber-500 text-white':'bg-red-500 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-slate-400 text-xs">Belum ada siswa di kelas ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABEL REKAP ABSENSI PER SISWA ── */}
      {students.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <CalendarCheck size={15} className="text-purple-600"/>
            <h3 className="font-black text-slate-800 text-sm">Rekap Absensi</h3>
            <span className="text-xs text-slate-400 font-medium ml-1">— Total kehadiran yang telah diinput</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800 text-slate-100 text-xs">
                  <th className="p-2.5 font-bold border-r border-slate-700 w-8 text-center">No</th>
                  <th className="p-2.5 font-bold border-r border-slate-700 min-w-[150px]">Nama Siswa</th>
                  <th className="p-2.5 font-bold text-center border-r border-slate-700 bg-emerald-900 w-20">Hadir</th>
                  <th className="p-2.5 font-bold text-center border-r border-slate-700 bg-blue-900 w-20">Sakit</th>
                  <th className="p-2.5 font-bold text-center border-r border-slate-700 bg-amber-900 w-20">Izin</th>
                  <th className="p-2.5 font-bold text-center border-r border-slate-700 bg-red-900 w-20">Alpa</th>
                  <th className="p-2.5 font-bold text-center border-r border-slate-700 w-24">Jml Hari</th>
                  <th className="p-2.5 font-bold text-center w-24">% Hadir</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const hadir = attendance.filter(a => a.siswaId === s.id && a.status === 'Hadir').length;
                  const sakit = attendance.filter(a => a.siswaId === s.id && a.status === 'Sakit').length;
                  const izin  = attendance.filter(a => a.siswaId === s.id && a.status === 'Izin').length;
                  const alpha = attendance.filter(a => a.siswaId === s.id && a.status === 'Alpha').length;
                  const jumlahHari = hadir + sakit + izin + alpha;
                  const hasData = jumlahHari > 0;
                  const persen = hasData ? Math.round((hadir / jumlahHari) * 100) : null;
                  const pColor = persen === null ? '' : persen >= 80 ? 'text-emerald-600' : persen >= 60 ? 'text-amber-600' : 'text-red-600';
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="p-2.5 text-center font-bold text-slate-400 text-xs border-r border-slate-100">{idx+1}</td>
                      <td className="p-2.5 font-bold text-slate-800 text-xs border-r border-slate-100">{s.nama}</td>
                      <td className="p-2.5 text-center border-r border-slate-100 bg-emerald-50/30">
                        {hasData ? <span className="text-sm font-black text-emerald-600">{hadir}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-100 bg-blue-50/20">
                        {hasData ? <span className="text-sm font-black text-blue-600">{sakit}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-100 bg-amber-50/20">
                        {hasData ? <span className="text-sm font-black text-amber-600">{izin}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-100 bg-red-50/20">
                        {hasData ? <span className="text-sm font-black text-red-600">{alpha}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-100">
                        {hasData ? <span className="text-sm font-black text-slate-700">{jumlahHari}</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="p-2.5 text-center">
                        {persen !== null ? <span className={`text-sm font-black ${pColor}`}>{persen}%</span> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {/* Baris Total */}
                {(() => {
                  const tH = attendance.filter(a => a.status === 'Hadir').length;
                  const tS = attendance.filter(a => a.status === 'Sakit').length;
                  const tI = attendance.filter(a => a.status === 'Izin').length;
                  const tA = attendance.filter(a => a.status === 'Alpha').length;
                  const tJml = tH + tS + tI + tA;
                  const tPersen = tJml > 0 ? Math.round((tH / tJml) * 100) : null;
                  return (
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td colSpan={2} className="p-2.5 font-black text-slate-700 text-xs border-r border-slate-300 text-right pr-4">TOTAL</td>
                      <td className="p-2.5 text-center font-black text-emerald-700 border-r border-slate-300 bg-emerald-100">{tH}</td>
                      <td className="p-2.5 text-center font-black text-blue-700 border-r border-slate-300 bg-blue-100">{tS}</td>
                      <td className="p-2.5 text-center font-black text-amber-700 border-r border-slate-300 bg-amber-100">{tI}</td>
                      <td className="p-2.5 text-center font-black text-red-700 border-r border-slate-300 bg-red-100">{tA}</td>
                      <td className="p-2.5 text-center font-black text-slate-700 border-r border-slate-300">{tJml}</td>
                      <td className="p-2.5 text-center font-black text-slate-700">{tPersen !== null ? `${tPersen}%` : '—'}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. JOURNAL COMPONENT (Guru Kelas)
// ==========================================
const JournalSection = ({ journals, attendance, students, ctx, showToast, settings, profile }) => {
  const [formData, setFormData] = useState({ tanggal: getTodayDate(), mapel: MAPEL_OPTIONS[0], tujuanPembelajaran: '', materi: '', kegiatan: '', catatan: '' });
  const [exportMonth, setExportMonth] = useState(getTodayDate().substring(5, 7));
  const [exportYear, setExportYear] = useState(getTodayDate().substring(0, 4));
  const [showModal, setShowModal] = useState(false);

  // Helper: hitung kehadiran siswa untuk tanggal tertentu
  const getKehadiranSummary = (tanggal) => {
    const attTgl = (attendance || []).filter(a => a.tanggal === tanggal);
    const hadir = attTgl.filter(a => a.status === 'Hadir').length;
    const sakit = attTgl.filter(a => a.status === 'Sakit').length;
    const izin  = attTgl.filter(a => a.status === 'Izin').length;
    const alpha = attTgl.filter(a => a.status === 'Alpha').length;
    const total = (students || []).length;
    return { hadir, sakit, izin, alpha, total };
  };

  const getKehadiranText = (tanggal) => {
    const k = getKehadiranSummary(tanggal);
    if (k.total === 0) return '-';
    return `Hadir: ${k.hadir}, Sakit: ${k.sakit}, Izin: ${k.izin}, Alpha: ${k.alpha}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mapel || !formData.materi) return showToast("Mapel dan Materi wajib diisi", "error");
    const newId = generateId();
    const newJournal = { ...formData, kelas: ctx.loggedInKelas, tahun: ctx.activeTahun, semester: ctx.activeSemester };
    await setDoc(doc(db, 'users', ctx.dbId, 'journals', newId), newJournal);
    showToast("Jurnal berhasil disimpan");
    setFormData({ ...formData, tujuanPembelajaran: '', materi: '', kegiatan: '', catatan: '' });
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
      return parseInt(j.tanggal.substring(0,4)) === year && parseInt(j.tanggal.substring(5,7)) === month;
    });
    if (dataBulan.length === 0) { showToast("Tidak ada data jurnal di bulan ini", "error"); return; }

    const bulanNama = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
    const lastWorkday = getLastWorkdayOfMonth(year, month);
    const tanggalTTD = lastWorkday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const kota = settings.kotaTandatangan || '___________';
    const namaKepala = profile.namaKepalaSekolah || '___________________________';
    const nipKepala = profile.nipKepalaSekolah || '___________________________';
    const namaGuru = profile.nama || '___________________________';
    const nipGuru = profile.nip || '___________________________';
    const namaSekolah = settings.namaSekolah || 'SD NEGERI NUSANTARA';
    const sorted = [...dataBulan].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    try {
      const JsPDF = await loadJsPDF();
      await loadAutoTable();
      const pdf = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(13); pdf.setFont(undefined, 'bold');
      pdf.text(namaSekolah, pageW / 2, 14, { align: 'center' });
      pdf.setFontSize(11);
      pdf.text('JURNAL MENGAJAR', pageW / 2, 20, { align: 'center' });
      pdf.setFont(undefined, 'normal'); pdf.setFontSize(9);
      pdf.text(`${ctx.loggedInKelas}  |  Bulan: ${bulanNama} ${year}  |  Semester: ${ctx.activeSemester} (${ctx.activeTahun})`, pageW / 2, 26, { align: 'center' });

      const head = [['No', 'Tanggal', 'Mata Pelajaran', 'Tujuan Pembelajaran', 'Materi Pokok', 'Aktivitas Siswa', 'Kehadiran', 'Catatan']];
      const body = sorted.map((j, idx) => {
        const kh = getKehadiranText(j.tanggal);
        return [
          idx + 1,
          j.tanggal,
          j.mapel || '-',
          j.tujuanPembelajaran || '-',
          j.materi || '-',
          j.kegiatan || '-',
          kh,
          j.catatan || j.asesmen || '-',
        ];
      });

      pdf.autoTable({
        head, body, startY: 30,
        styles: { fontSize: 7.5, cellPadding: 2, valign: 'top' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 20 },
          2: { cellWidth: 28 },
          3: { cellWidth: 48 },
          4: { cellWidth: 32 },
          5: { cellWidth: 48 },
          6: { cellWidth: 30 },
          7: { cellWidth: 30 },
        },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        margin: { left: 8, right: 8 },
      });

      const finalY = pdf.lastAutoTable.finalY + 10;
      const needNewPage = finalY + 38 > pdf.internal.pageSize.getHeight();
      if (needNewPage) pdf.addPage();
      const sigY = needNewPage ? 20 : finalY;
      const left = 14; const rightX = pageW / 2 + 10;
      pdf.setFontSize(10);
      pdf.text('Mengetahui,', left + 20, sigY, { align: 'center' });
      pdf.text('Kepala Sekolah', left + 20, sigY + 5, { align: 'center' });
      pdf.text(`${kota}, ${tanggalTTD}`, rightX + 20, sigY, { align: 'center' });
      pdf.text(`Guru ${ctx.loggedInKelas}`, rightX + 20, sigY + 5, { align: 'center' });
      pdf.text(namaKepala, left + 20, sigY + 28, { align: 'center' });
      pdf.setDrawColor(0);
      pdf.line(left, sigY + 29, left + 40, sigY + 29);
      pdf.text(`NIP. ${nipKepala}`, left + 20, sigY + 33, { align: 'center' });
      pdf.text(namaGuru, rightX + 20, sigY + 28, { align: 'center' });
      pdf.line(rightX, sigY + 29, rightX + 40, sigY + 29);
      pdf.text(`NIP. ${nipGuru}`, rightX + 20, sigY + 33, { align: 'center' });

      pdf.save(`Jurnal_Mengajar_${ctx.loggedInKelas.replace(' ','_')}_${bulanNama}_${year}.pdf`);
      showToast(`PDF Jurnal ${bulanNama} ${year} berhasil diunduh!`, "success");
    } catch(err) {
      console.error(err);
      showToast("Gagal membuat PDF: " + err.message, "error");
    }
  };

  const handleDownloadTemplateJurnal = async () => {
    try {
      const XLSX = await loadXLSX();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Tanggal', 'Mata Pelajaran', 'Tujuan Pembelajaran', 'Materi Pokok', 'Aktivitas Siswa', 'Catatan'],
        ['2025-07-14', MAPEL_OPTIONS[0], 'Siswa mampu ...', 'Contoh materi', 'Diskusi kelompok', 'Catatan guru'],
      ]);
      ws['A2'] = { t: 's', v: '2025-07-14' };
      ws['!cols'] = [{wch:14},{wch:28},{wch:40},{wch:30},{wch:35},{wch:30}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Jurnal');
      XLSX.writeFile(wb, 'Template_Jurnal_Mengajar.xlsx');
    } catch(err) { showToast("Gagal membuat template", "error"); }
  };

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
          const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { raw: true });
          if (data.length === 0) return showToast("File Excel kosong", "error");
          let count = 0, skipped = 0;
          for (const row of data) {
            let tanggal = row['Tanggal'];
            if (!tanggal) continue;
            if (typeof tanggal === 'number') tanggal = excelSerialToDate(tanggal);
            else tanggal = tanggal.toString().trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) continue;
            const mapel = row['Mata Pelajaran'] ? row['Mata Pelajaran'].toString().trim() : '';
            const materi = row['Materi Pokok'] ? row['Materi Pokok'].toString().trim() : '';
            if (!materi) continue;
            const isDuplicate = journals.some(j =>
              j.tanggal === tanggal && (j.mapel||'') === (mapel||MAPEL_OPTIONS[0]) && (j.materi||'') === materi
            );
            if (isDuplicate) { skipped++; continue; }
            const newId = generateId();
            await setDoc(doc(db, 'users', ctx.dbId, 'journals', newId), {
              tanggal, mapel: mapel || MAPEL_OPTIONS[0],
              tujuanPembelajaran: (row['Tujuan Pembelajaran'] || '').toString(),
              materi,
              kegiatan: (row['Aktivitas Siswa'] || '').toString(),
              catatan: (row['Catatan'] || '').toString(),
              kelas: ctx.loggedInKelas, tahun: ctx.activeTahun, semester: ctx.activeSemester,
            });
            count++;
          }
          if (count === 0 && skipped === 0) return showToast("Tidak ada data valid. Format tanggal: YYYY-MM-DD", "error");
          if (count === 0 && skipped > 0) return showToast(`Semua data sudah ada (${skipped} duplikat dilewati)`, "error");
          showToast(`${count} jurnal diimport${skipped > 0 ? `, ${skipped} duplikat dilewati` : ''}!`, "success");
        } catch(err) { showToast("Format file tidak sesuai", "error"); }
      };
      reader.readAsBinaryString(file);
    } catch(err) { showToast("Gagal memuat library Excel", "error"); }
    e.target.value = null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Form Jurnal Mengajar">
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
            <input type="date" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          {/* Preview kehadiran otomatis */}
          {formData.tanggal && (() => {
            const k = getKehadiranSummary(formData.tanggal);
            return (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <CalendarCheck size={14} className="text-purple-600 shrink-0"/>
                <div className="text-xs text-purple-800 font-medium">
                  <span className="font-bold">Kehadiran otomatis:</span> Hadir {k.hadir} · Sakit {k.sakit} · Izin {k.izin} · Alpha {k.alpha}
                  {k.total === 0 && <span className="text-purple-500 ml-1">(absensi belum diinput)</span>}
                </div>
              </div>
            );
          })()}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mata Pelajaran</label>
            <select value={formData.mapel} onChange={e => setFormData({...formData, mapel: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium">
              {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tujuan Pembelajaran</label>
            <textarea placeholder="Siswa mampu..." value={formData.tujuanPembelajaran} onChange={e => setFormData({...formData, tujuanPembelajaran: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-purple-500"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Materi Pokok</label>
            <input type="text" placeholder="Topik hari ini" value={formData.materi} onChange={e => setFormData({...formData, materi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Aktivitas Siswa</label>
            <textarea placeholder="Siswa melakukan..." value={formData.kegiatan} onChange={e => setFormData({...formData, kegiatan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-purple-500"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Catatan</label>
            <textarea placeholder="Catatan guru, kendala, atau hal penting..." value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-purple-500"></textarea>
          </div>
          <button type="submit" className="w-full bg-purple-700 text-white font-bold py-3 rounded-xl hover:bg-purple-800 transition shadow-md">Simpan Jurnal</button>
        </form>
      </Modal>

      <div className="rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div>
          <h2 className="text-base font-black text-white">Jurnal Mengajar <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm ml-1">{ctx.loggedInKelas}</span></h2>
          <p className="text-purple-200 text-xs mt-0.5">Catatan pembelajaran · {ctx.activeSemester} · {ctx.activeTahun}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-50 transition shadow-sm">
            <Edit2 size={13}/> + Tambah Jurnal
          </button>
          <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {Array.from({length: 12}, (_, i) => {
              const m = (i + 1).toString().padStart(2, '0');
              const name = new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' });
              return <option key={m} value={m} style={{background:'#5b21b6'}}>{name}</option>;
            })}
          </select>
          <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {[2025,2026,2027,2028,2029,2030,2031].map(y => <option key={y} value={y} style={{background:'#5b21b6'}}>{y}</option>)}
          </select>
          <button onClick={handleExportJournal} className="flex items-center gap-1.5 text-xs text-white font-bold bg-white/20 border border-white/30 px-3 py-1.5 rounded-xl hover:bg-white/30 transition">
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {journals.length === 0 && (
          <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
            <BookOpen size={36} className="text-slate-200 mb-3" />
            <p className="font-medium text-sm">Belum ada catatan jurnal untuk periode ini.</p>
          </div>
        )}
        {[...journals].sort((a,b) => b.tanggal.localeCompare(a.tanggal)).map(j => {
          const kh = getKehadiranSummary(j.tanggal);
          const catatanVal = j.catatan || j.asesmen || '';
          return (
            <div key={j.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition group overflow-hidden">
              {/* Card header dengan tanggal + mapel */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="w-11 h-11 bg-purple-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-purple-100 text-purple-800">
                  <span className="text-base font-black leading-none">{j.tanggal.substring(8,10)}</span>
                  <span className="text-[9px] font-bold uppercase">{new Date(j.tanggal+'T00:00:00').toLocaleString('id-ID',{month:'short'})}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm truncate">{j.mapel}</h4>
                      {j.tujuanPembelajaran && (
                        <p className="text-purple-700 text-[10px] mt-0.5 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 line-clamp-1 w-fit">🎯 {j.tujuanPembelajaran}</p>
                      )}
                    </div>
                    <button onClick={() => handleDelete(j.id)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 ml-2 shrink-0 p-1"><Trash2 size={13}/></button>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{j.materi}</p>
                </div>
              </div>
              {/* Card body */}
              <div className="grid grid-cols-2 gap-px bg-slate-100">
                <div className="bg-white p-2.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Aktivitas</p>
                  <p className="text-[10px] text-slate-600 line-clamp-2">{j.kegiatan || '—'}</p>
                </div>
                <div className="bg-emerald-50/60 p-2.5">
                  <p className="text-[9px] font-bold text-emerald-500 uppercase mb-1">Kehadiran</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    {kh.total > 0 ? `H:${kh.hadir} S:${kh.sakit} I:${kh.izin} A:${kh.alpha}` : <span className="text-slate-400 font-normal">Belum diinput</span>}
                  </p>
                </div>
              </div>
              {catatanVal && (
                <div className="px-3 py-2 border-t border-slate-50 bg-slate-50/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Catatan</p>
                  <p className="text-[10px] text-slate-600 line-clamp-2">{catatanVal}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// TOOLS COMPONENT
// ==========================================
const ToolsSection = ({ tools, ctx, showToast, guruMapelMode }) => {
  const MAPEL_CATEGORIES = ['ATP', 'Prota', 'Promes', 'Modul Ajar', 'Kisi-kisi dan soal sumatif'];
  const LAINNYA_CATEGORIES = ['Kokurikuler', 'Lainnya'];
  const ALL_CATEGORIES = [...MAPEL_CATEGORIES, ...LAINNYA_CATEGORIES];

  // Tab: nama mapel/kelas, atau 'lainnya'
  const TAB_OPTIONS = guruMapelMode
    ? [...KELAS_OPTIONS, 'Lainnya']
    : [...MAPEL_OPTIONS, 'Lainnya'];

  const [formData, setFormData] = useState({ nama: '', jenis: 'Modul Ajar', link: '' });
  const [viewMapel, setViewMapel] = useState(guruMapelMode ? KELAS_OPTIONS[0] : MAPEL_OPTIONS[0]);
  const [editingId, setEditingId] = useState(null);
  const [openFolders, setOpenFolders] = useState({ 'Modul Ajar': true, 'Kisi-kisi dan soal sumatif': true });
  const [showModal, setShowModal] = useState(false);

  const isLainnyaTab = viewMapel === 'Lainnya';

  const toggleFolder = (cat) => setOpenFolders(prev => ({...prev, [cat]: !prev[cat]}));

  // Kategori yang tersedia di form berdasarkan tab aktif
  const formCategories = isLainnyaTab ? LAINNYA_CATEGORIES : MAPEL_CATEGORIES;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!formData.nama || !formData.link) return showToast("Lengkapi form", "error");
    const saveMapel = isLainnyaTab ? 'Lainnya' : viewMapel;
    if (editingId) {
      await setDoc(doc(db, 'users', ctx.dbId, 'tools', editingId), {
        ...formData,
        mapel: saveMapel
      }, { merge: true });
      showToast("Perangkat berhasil diperbarui");
      setEditingId(null);
    } else {
      const newId = generateId();
      await setDoc(doc(db, 'users', ctx.dbId, 'tools', newId), {
        ...formData,
        mapel: saveMapel,
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
    setFormData({ nama: '', jenis: isLainnyaTab ? 'Kokurikuler' : 'Modul Ajar', link: '' });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', ctx.dbId, 'tools', id));
    showToast("Perangkat dihapus");
  };

  // Filter: tab Lainnya → ambil mapel='Lainnya' ATAU jenis termasuk LAINNYA_CATEGORIES
  // Tab mapel → ambil mapel = viewMapel DAN jenis termasuk MAPEL_CATEGORIES
  const filteredTools = isLainnyaTab
    ? tools.filter(t => t.mapel === 'Lainnya' || LAINNYA_CATEGORIES.includes(t.jenis))
    : tools.filter(t => t.mapel === viewMapel && MAPEL_CATEGORIES.includes(t.jenis));

  const activeCategories = isLainnyaTab ? LAINNYA_CATEGORIES : MAPEL_CATEGORIES;

  const groupedTools = activeCategories.reduce((acc, cat) => {
    acc[cat] = filteredTools.filter(t => t.jenis === cat);
    return acc;
  }, {});

  const folderTypes = ['Modul Ajar', 'Kisi-kisi dan soal sumatif'];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Modal isOpen={showModal} onClose={closeModal} title={editingId ? "Edit Dokumen" : "Tambah Dokumen"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`text-xs font-bold px-3 py-2 rounded-lg ${isLainnyaTab ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'}`}>
            {isLainnyaTab ? '📎 Lainnya (non-mapel)' : viewMapel}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Dokumen</label>
            <select value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none font-medium">
              {formCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
          <button type="submit" className={`w-full font-bold py-2.5 rounded-xl transition text-white ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-700 hover:bg-purple-800'}`}>
            {editingId ? "Simpan Perubahan" : "Simpan Tautan"}
          </button>
        </form>
      </Modal>

      {/* Header */}
      <div className="rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div>
          <h2 className="text-base font-black text-white">Perangkat Mengajar</h2>
          <p className="text-purple-200 text-xs mt-0.5">Kelola tautan dokumen · {ctx.activeSemester} · {ctx.activeTahun}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => { setFormData({ nama: '', jenis: isLainnyaTab ? 'Kokurikuler' : 'Modul Ajar', link: '' }); setEditingId(null); setShowModal(true); }} className="flex items-center gap-1.5 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-50 transition shadow-sm">
            <FolderOpen size={13}/> + Tambah Dokumen
          </button>
        </div>
      </div>

      {/* Tab mapel/kelas + Lainnya */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50">
          {TAB_OPTIONS.map(tab => {
            const isActive = viewMapel === tab;
            const isLainnya = tab === 'Lainnya';
            return (
              <button key={tab} onClick={() => {
                setViewMapel(tab);
                setFormData({ nama: '', jenis: isLainnya ? 'Kokurikuler' : 'Modul Ajar', link: '' });
              }}
                className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex-shrink-0 ${
                  isActive
                    ? isLainnya
                      ? 'border-amber-500 text-amber-700 bg-amber-50'
                      : 'border-purple-600 text-purple-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white'
                }`}>
                {isLainnya ? '📎 Lainnya' : tab}
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-4">
          {isLainnyaTab && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <span className="text-amber-600 text-xs font-bold">📎 Lainnya</span>
              <span className="text-amber-500 text-xs">— Perangkat non-mapel: Kokurikuler, P5, dan lainnya</span>
            </div>
          )}

          {filteredTools.length === 0 ? (
            <div className="py-10 text-center text-slate-400 font-medium text-sm">
              Belum ada dokumen untuk <b>{isLainnyaTab ? 'Lainnya' : viewMapel}</b>.
            </div>
          ) : (
            activeCategories.map(cat => {
              const items = groupedTools[cat];
              if (!items || items.length === 0) return null;
              const isFolderType = folderTypes.includes(cat);
              const isOpen = openFolders[cat];
              return (
                <div key={cat} className="border border-slate-100 rounded-xl overflow-hidden">
                  {isFolderType ? (
                    <button onClick={() => toggleFolder(cat)} className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition">
                      <div className="flex items-center gap-3">
                        <Folder className="text-amber-500 fill-amber-100" size={20} />
                        <span className="font-black text-slate-700 text-sm">{cat}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{items.length}</span>
                      </div>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{cat}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{items.length}</span>
                    </div>
                  )}
                  {(!isFolderType || isOpen) && (
                    <div className="p-3 space-y-2">
                      {items.map(t => (
                        <div key={t.id} className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-xl hover:shadow-sm transition">
                          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                            <FolderOpen size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{t.nama}</h4>
                            <a href={t.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md transition w-max">
                              <ExternalLink size={11}/> Buka Tautan
                            </a>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(t)} className="p-1.5 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition"><Edit2 size={14}/></button>
                            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition"><Trash2 size={14}/></button>
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
// DATA DIMENSI PROFIL LULUSAN (DPL)
// ==========================================
const DPL_DATA = [
  { dimensi: 'Keimanan dan Ketakwaan', subDimensi: ['Hubungan dengan Tuhan Yang Maha Esa','Hubungan dengan Sesama Manusia','Hubungan dengan Lingkungan Alam'] },
  { dimensi: 'Kewargaan', subDimensi: ['Kewargaan Nasional','Kewargaan Global'] },
  { dimensi: 'Penalaran Kritis', subDimensi: ['Penyampaian Argumentasi','Pengambilan Keputusan','Penyelesaian Masalah'] },
  { dimensi: 'Kreativitas', subDimensi: ['Gagasan Baru','Fleksibilitas Berpikir','Karya'] },
  { dimensi: 'Kemandirian', subDimensi: ['Kepemimpinan','Pengembangan Diri'] },
  { dimensi: 'Kolaborasi', subDimensi: ['Peduli','Berbagi','Kerja Sama'] },
  { dimensi: 'Komunikasi', subDimensi: ['Menyimak','Berbicara','Membaca','Menulis'] },
  { dimensi: 'Kesehatan', subDimensi: ['Hidup Bersih dan Sehat','Kebugaran, Kesehatan Fisik, dan Kesehatan Mental','Kesehatan Lingkungan'] },
];

const NILAI_OPTS = ['Berkembang','Cakap','Mahir'];

const generateDeskripsiKokurikuler = (namaSiswa, tema, dplTerpilih, penilaian) => {
  if (!tema || !dplTerpilih || dplTerpilih.length === 0) return '';
  const parts = [];
  dplTerpilih.forEach(({ dimensi, subDimensi }) => {
    const mahir = subDimensi.filter(sd => penilaian[`${dimensi}||${sd}`] === 'Mahir');
    const cakap = subDimensi.filter(sd => penilaian[`${dimensi}||${sd}`] === 'Cakap');
    const berkembang = subDimensi.filter(sd => penilaian[`${dimensi}||${sd}`] === 'Berkembang');
    let kalimat = `Pada dimensi ${dimensi}`;
    const segmen = [];
    if (mahir.length) segmen.push(`${mahir.join(', ')} sudah tercapai dengan sangat baik`);
    if (cakap.length) segmen.push(`${cakap.join(', ')} sudah tercapai dengan baik`);
    if (berkembang.length) segmen.push(`${berkembang.join(', ')} masih dalam tahap berkembang`);
    if (segmen.length === 0) return;
    kalimat += ', ' + segmen.join('; ') + '.';
    parts.push(kalimat);
  });
  if (parts.length === 0) return '';
  return `Dalam kegiatan ${tema}, ${namaSiswa} menunjukkan perkembangan sebagai berikut. ${parts.join(' ')}`;
};

// ==========================================
// KOKURIKULER SECTION
// ==========================================
const KokurikulerSection = ({ students, ctx, showToast }) => {
  const [subTab, setSubTab] = useState('nilai'); // 'tema' | 'nilai'
  const [temaList, setTemaList] = useState([]);
  const [nilaiKoku, setNilaiKoku] = useState([]);
  const [selectedTema, setSelectedTema] = useState('');

  // Form tema
  const [showTemaModal, setShowTemaModal] = useState(false);
  const [temaEditId, setTemaEditId] = useState(null);
  const [temaNama, setTemaNama] = useState('');
  const [temaDpl, setTemaDpl] = useState([]); // [{dimensi, subDimensi:[]}]

  // Load dari Firestore
  React.useEffect(() => {
    if (!ctx.dbId) return;
    const unsub1 = onSnapshot(doc(db,'users',ctx.dbId,'data','kokurikuler_tema'), snap => {
      const list = snap.exists() ? (snap.data().list||[]) : [];
      setTemaList(list);
      if (list.length && !selectedTema) setSelectedTema(list[0].id);
    });
    const unsub2 = onSnapshot(doc(db,'users',ctx.dbId,'data','kokurikuler_nilai'), snap => {
      setNilaiKoku(snap.exists() ? (snap.data().list||[]) : []);
    });
    return () => { unsub1(); unsub2(); };
  }, [ctx.dbId]);

  const saveTemaList = async (list) => {
    setTemaList(list);
    await setDoc(doc(db,'users',ctx.dbId,'data','kokurikuler_tema'), {list});
  };

  const saveNilaiList = async (list) => {
    setNilaiKoku(list);
    await setDoc(doc(db,'users',ctx.dbId,'data','kokurikuler_nilai'), {list});
  };

  // ── Pengaturan DPL di form tema
  const toggleDimensi = (dimensi) => {
    setTemaDpl(prev => {
      const exists = prev.find(d => d.dimensi === dimensi);
      if (exists) return prev.filter(d => d.dimensi !== dimensi);
      return [...prev, { dimensi, subDimensi: [] }];
    });
  };

  const toggleSubDimensi = (dimensi, sd) => {
    setTemaDpl(prev => prev.map(d => {
      if (d.dimensi !== dimensi) return d;
      const has = d.subDimensi.includes(sd);
      return { ...d, subDimensi: has ? d.subDimensi.filter(x=>x!==sd) : [...d.subDimensi, sd] };
    }));
  };

  const openTambahTema = () => {
    setTemaEditId(null); setTemaNama(''); setTemaDpl([]); setShowTemaModal(true);
  };

  const openEditTema = (t) => {
    setTemaEditId(t.id); setTemaNama(t.nama); setTemaDpl(t.dpl||[]); setShowTemaModal(true);
  };

  const handleSaveTema = async () => {
    if (!temaNama.trim()) return showToast('Nama tema wajib diisi','error');
    const dplValid = temaDpl.filter(d => d.subDimensi.length > 0);
    if (!dplValid.length) return showToast('Pilih minimal 1 subdimensi','error');
    if (temaEditId) {
      const list = temaList.map(t => t.id===temaEditId ? {...t, nama:temaNama.trim(), dpl:dplValid} : t);
      await saveTemaList(list);
      showToast('Tema diperbarui');
    } else {
      const newId = 'tema_'+generateId();
      await saveTemaList([...temaList, {id:newId, nama:temaNama.trim(), dpl:dplValid}]);
      setSelectedTema(newId);
      showToast('Tema ditambahkan');
    }
    setShowTemaModal(false);
  };

  const handleDeleteTema = async (id) => {
    await saveTemaList(temaList.filter(t=>t.id!==id));
    if (selectedTema===id) setSelectedTema(temaList.find(t=>t.id!==id)?.id||'');
    showToast('Tema dihapus');
  };

  // ── Input nilai siswa
  const handleNilaiChange = async (siswaId, dimensi, subDimensi, nilai) => {
    const key = `${dimensi}||${subDimensi}`;
    const existing = nilaiKoku.find(n => n.siswaId===siswaId && n.temaId===selectedTema);
    if (existing) {
      const updated = nilaiKoku.map(n => n.siswaId===siswaId && n.temaId===selectedTema
        ? {...n, penilaian:{...n.penilaian, [key]:nilai}}
        : n);
      await saveNilaiList(updated);
    } else {
      await saveNilaiList([...nilaiKoku, {
        siswaId, temaId:selectedTema, kelas:ctx.loggedInKelas,
        tahun:ctx.activeTahun, semester:ctx.activeSemester,
        penilaian:{[key]:nilai}
      }]);
    }
  };

  const tema = temaList.find(t=>t.id===selectedTema);
  const dplTerpilih = tema?.dpl || [];
  // Flatten: semua subdimensi kolom
  const allColumns = dplTerpilih.flatMap(d => d.subDimensi.map(sd => ({dimensi:d.dimensi, sd})));

  return (
    <div className="space-y-4">
      {/* Modal Tema */}
      <Modal isOpen={showTemaModal} onClose={()=>setShowTemaModal(false)} title={temaEditId?'Edit Tema':'Tambah Tema Kokurikuler'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nama Tema / Kegiatan</label>
            <input type="text" value={temaNama} onChange={e=>setTemaNama(e.target.value)}
              placeholder="Cth: P5 Gaya Hidup Berkelanjutan" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Dimensi Profil Lulusan yang Dinilai</label>
            <div className="space-y-3">
              {DPL_DATA.map(d => {
                const dipilih = temaDpl.find(td=>td.dimensi===d.dimensi);
                return (
                  <div key={d.dimensi} className={`rounded-xl border p-3 transition ${dipilih ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input type="checkbox" checked={!!dipilih} onChange={()=>toggleDimensi(d.dimensi)}
                        className="w-4 h-4 accent-purple-600"/>
                      <span className="text-sm font-bold text-slate-800">{d.dimensi}</span>
                    </label>
                    {dipilih && (
                      <div className="ml-6 flex flex-wrap gap-2">
                        {d.subDimensi.map(sd => (
                          <label key={sd} className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                            dipilih.subDimensi.includes(sd)
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'}`}>
                            <input type="checkbox" className="hidden" checked={dipilih.subDimensi.includes(sd)} onChange={()=>toggleSubDimensi(d.dimensi,sd)}/>
                            {sd}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={handleSaveTema} className="w-full bg-purple-700 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-purple-800 transition">
            {temaEditId ? 'Simpan Perubahan' : '+ Simpan Tema'}
          </button>
        </div>
      </Modal>

      {/* Sub-tab Tema / Nilai */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
          {[{id:'nilai',label:'📋 Nilai Siswa'},{id:'tema',label:'⚙ Pengaturan Tema'}].map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${subTab===t.id?'bg-purple-700 text-white shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={openTambahTema} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition">
          + Tema Baru
        </button>
      </div>

      {/* ── TAB PENGATURAN TEMA ── */}
      {subTab==='tema' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">Daftar Tema Kokurikuler</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tiap tema dapat memiliki beberapa Dimensi Profil Lulusan</p>
          </div>
          <div className="p-4 space-y-3">
            {!temaList.length && (
              <div className="py-10 text-center text-slate-400 text-sm">Belum ada tema. Klik <b>"+ Tema Baru"</b> untuk menambahkan.</div>
            )}
            {temaList.map((t,idx) => (
              <div key={t.id} className="border border-slate-200 rounded-xl p-4 hover:border-purple-200 hover:bg-purple-50/30 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Tema {idx+1}</span>
                      <h4 className="font-black text-slate-800 text-sm">{t.nama}</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(t.dpl||[]).map(d => (
                        <div key={d.dimensi}>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-l-lg border border-slate-200">{d.dimensi}:</span>
                          {d.subDimensi.map(sd => (
                            <span key={sd} className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-r-lg mr-1">{sd}</span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={()=>openEditTema(t)} className="p-1.5 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition"><Edit2 size={13}/></button>
                    <button onClick={()=>handleDeleteTema(t.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB NILAI SISWA ── */}
      {subTab==='nilai' && (
        <div className="space-y-3">
          {/* Pilih tema */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold text-slate-600">Tema:</label>
            {temaList.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Belum ada tema — buat dulu di "Pengaturan Tema"</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {temaList.map(t => (
                  <button key={t.id} onClick={()=>setSelectedTema(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${selectedTema===t.id
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-purple-400'}`}>
                    {t.nama}
                  </button>
                ))}
              </div>
            )}
          </div>

          {tema && allColumns.length > 0 && (
            <>
              {/* Info DPL aktif */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-black text-purple-700">DPL:</span>
                {dplTerpilih.map(d => (
                  <span key={d.dimensi} className="text-[10px] font-bold text-purple-600 bg-white border border-purple-200 px-2 py-0.5 rounded-lg">
                    {d.dimensi} ({d.subDimensi.length} subdimensi)
                  </span>
                ))}
              </div>

              {/* Tabel nilai */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      {/* Baris 1: header dimensi (grouped) */}
                      <tr className="bg-slate-900 text-slate-100 text-xs">
                        <th rowSpan={2} className="p-2.5 font-bold border-r border-slate-700 text-center sticky left-0 bg-slate-900 z-10" style={{width:36}}>No</th>
                        <th rowSpan={2} className="p-2.5 font-bold border-r border-slate-700 sticky left-9 bg-slate-900 z-10" style={{width:130}}>Nama Siswa</th>
                        {dplTerpilih.map(d => (
                          <th key={d.dimensi} colSpan={d.subDimensi.length}
                            className="p-2 font-black text-center border-r border-slate-700 bg-purple-900 uppercase tracking-wide text-[10px]">
                            {d.dimensi}
                          </th>
                        ))}
                        <th rowSpan={2} className="p-2.5 font-bold text-center bg-slate-700 text-[10px]" style={{width:'40%',minWidth:220}}>Deskripsi Otomatis</th>
                      </tr>
                      {/* Baris 2: header subdimensi */}
                      <tr className="bg-slate-800 text-slate-200 text-[10px]">
                        {allColumns.map(({dimensi,sd}) => (
                          <th key={`${dimensi}||${sd}`} className="p-2 font-bold text-center border-r border-slate-700 leading-tight" style={{width:88}}>
                            {sd}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s,idx) => {
                        const rec = nilaiKoku.find(n=>n.siswaId===s.id&&n.temaId===selectedTema);
                        const pen = rec?.penilaian || {};
                        const deskripsi = generateDeskripsiKokurikuler(s.nama, tema.nama, dplTerpilih, pen);
                        return (
                          <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                            <td className="p-2 text-center font-bold text-slate-400 text-xs border-r border-slate-100 sticky left-0 bg-white">{idx+1}</td>
                            <td className="p-2 font-bold text-slate-800 text-xs border-r border-slate-100 sticky left-9 bg-white truncate" style={{maxWidth:130}}>{s.nama}</td>
                            {allColumns.map(({dimensi,sd}) => {
                              const key = `${dimensi}||${sd}`;
                              const val = pen[key]||'';
                              return (
                                <td key={key} className="p-1.5 border-r border-slate-100">
                                  <select value={val} onChange={e=>handleNilaiChange(s.id,dimensi,sd,e.target.value)}
                                    className={`w-full text-center rounded-lg px-1 py-1 text-[10px] font-bold outline-none border transition cursor-pointer ${
                                      val==='Mahir'      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                      val==='Cakap'      ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                      val==='Berkembang' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                                           'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    <option value=''>—</option>
                                    {NILAI_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
                                  </select>
                                </td>
                              );
                            })}
                            <td className="p-2 align-top" style={{whiteSpace:'normal',wordBreak:'break-word',width:'40%',minWidth:220}}>
                              <p className="text-[10px] text-slate-600 leading-relaxed">
                                {deskripsi || <span className="italic text-slate-300">Isi nilai untuk generate deskripsi</span>}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                      {!students.length && (
                        <tr><td colSpan={allColumns.length+3} className="p-6 text-center text-slate-400 text-xs">Belum ada siswa.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tema && allColumns.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
              Tema ini belum memiliki subdimensi. Edit tema untuk menambahkan DPL.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// GRADES COMPONENT — Sumatif + Formatif TP
// ==========================================

// Generator deskripsi formatif berdasarkan nilai SB/B/MB per TP
const generateDeskripsiFormatif = (tpList, nilaiPerTP) => {
  if (!tpList || tpList.length === 0) return '';
  const filled = tpList.filter(tp => nilaiPerTP[tp.id]);
  if (filled.length === 0) return '';

  const sbList  = tpList.filter(tp => nilaiPerTP[tp.id] === 'SB');
  const mbList  = tpList.filter(tp => nilaiPerTP[tp.id] === 'MB');
  const bList   = tpList.filter(tp => nilaiPerTP[tp.id] === 'B');

  // Semua SB
  if (sbList.length === filled.length)
    return sbList.map(tp => tp.deskripsi).join(' ');

  // Semua MB
  if (mbList.length === filled.length)
    return mbList.map(tp => `Ananda masih perlu bimbingan dalam: ${tp.deskripsi}`).join(' ');

  // Tidak ada SB → ambil B sebagai tertinggi
  const tertinggiList = sbList.length > 0 ? sbList : bList;

  const parts = [];
  if (tertinggiList.length > 0)
    parts.push(tertinggiList.map(tp => tp.deskripsi).join(' '));
  if (mbList.length > 0)
    parts.push(`Namun masih perlu bimbingan: ${mbList.map(tp => tp.deskripsi).join(', ')}.`);

  return parts.join(' ');
};

const GradesSection = ({ students, grades, attendance, ctx, showToast }) => {
  const [mapelAktif, setMapelAktif]       = useState(MAPEL_OPTIONS[0]);
  const [activeTab, setActiveTab]         = useState('sumatif');
  const [tpList, setTpList]               = useState([]);
  const [nilaiSettings, setNilaiSettings] = useState({ jumlahS: 4, bobotS: 70, bobotSAS: 30 });
  const [showTpModal, setShowTpModal]     = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [tpForm, setTpForm]               = useState({ deskripsi: '' });
  const [tpEditId, setTpEditId]           = useState(null);

  React.useEffect(() => {
    if (!ctx.dbId || !mapelAktif) return;
    const key = mapelAktif.replace(/\s/g,'_');
    const unsub1 = onSnapshot(doc(db,'users',ctx.dbId,'data',`tpSettings_${key}`), snap => {
      setTpList(snap.exists() ? (snap.data().list||[]) : []);
    });
    const unsub2 = onSnapshot(doc(db,'users',ctx.dbId,'data',`nilaiSettings_${key}`), snap => {
      setNilaiSettings(snap.exists()
        ? { jumlahS: snap.data().jumlahS??4, bobotS: snap.data().bobotS??70, bobotSAS: snap.data().bobotSAS??30 }
        : { jumlahS:4, bobotS:70, bobotSAS:30 });
    });
    return () => { unsub1(); unsub2(); };
  }, [ctx.dbId, mapelAktif]);

  const saveNilaiSettings = async (ns) => {
    setNilaiSettings(ns);
    await setDoc(doc(db,'users',ctx.dbId,'data',`nilaiSettings_${mapelAktif.replace(/\s/g,'_')}`), ns, {merge:true});
  };

  const saveTpList = async (list) => {
    setTpList(list);
    await setDoc(doc(db,'users',ctx.dbId,'data',`tpSettings_${mapelAktif.replace(/\s/g,'_')}`), {list});
  };

  const handleTpSave = async () => {
    if (!tpForm.deskripsi.trim()) return showToast('Deskripsi TP wajib diisi','error');
    const newList = tpEditId
      ? tpList.map(tp => tp.id===tpEditId ? {...tp, deskripsi:tpForm.deskripsi.trim()} : tp)
      : [...tpList, {id:'tp_'+generateId(), deskripsi:tpForm.deskripsi.trim()}];
    await saveTpList(newList);
    setShowTpModal(false); setTpForm({deskripsi:''}); setTpEditId(null);
    showToast(tpEditId ? 'TP diperbarui' : 'TP ditambahkan');
  };

  const handleTpDelete = async (id) => { await saveTpList(tpList.filter(tp=>tp.id!==id)); showToast('TP dihapus'); };

  const getNilaiKehadiran = (siswaId) => {
    const att = (attendance||[]).filter(a => a.siswaId===siswaId);
    if (!att.length) return null;
    return Math.round((att.filter(a=>a.status==='Hadir').length / att.length)*100);
  };

  const handleGradeChange = async (siswaId, field, value) => {
    const existing = grades.find(g => g.siswaId===siswaId && g.mapel===mapelAktif);
    if (existing) {
      await setDoc(doc(db,'users',ctx.dbId,'grades',existing.id), {[field]:value}, {merge:true});
    } else {
      await setDoc(doc(db,'users',ctx.dbId,'grades',generateId()), {
        siswaId, mapel:mapelAktif, kelas:ctx.loggedInKelas, tahun:ctx.activeTahun, semester:ctx.activeSemester, [field]:value
      });
    }
  };

  const handleFormatifChange = async (siswaId, tpId, value) => {
    const mapelKey = `__formatif__${mapelAktif}`;
    const existing = grades.find(g => g.siswaId===siswaId && g.mapel===mapelKey);
    if (existing) {
      await setDoc(doc(db,'users',ctx.dbId,'grades',existing.id), {[`tp_${tpId}`]:value}, {merge:true});
    } else {
      await setDoc(doc(db,'users',ctx.dbId,'grades',generateId()), {
        siswaId, mapel:mapelKey, kelas:ctx.loggedInKelas, tahun:ctx.activeTahun, semester:ctx.activeSemester, [`tp_${tpId}`]:value
      });
    }
  };

  const hitungNilaiAkhir = (g) => {
    const {jumlahS, bobotS, bobotSAS} = nilaiSettings;
    let sumS=0, cntS=0;
    for (let n=1; n<=jumlahS; n++) { if(g[`s${n}`]){sumS+=Number(g[`s${n}`]);cntS++;} }
    const avgS = cntS>0 ? sumS/cntS : 0;
    const sas  = Number(g.sas||0);
    if (avgS===0 && sas===0) return null;
    if (sas===0) return Math.round(avgS);
    return Math.round(avgS*(bobotS/100) + sas*(bobotSAS/100));
  };

  const handleExport = () => {
    if (!students.length) return showToast('Tidak ada siswa','error');
    const {jumlahS} = nilaiSettings;
    const rows = students.map((s,i) => {
      const g = grades.find(gd=>gd.siswaId===s.id&&gd.mapel===mapelAktif)||{};
      const row = {No:i+1, Nama:s.nama};
      for (let n=1;n<=jumlahS;n++) row[`S${n}`]=g[`s${n}`]||'';
      row['SAS']=g.sas||''; row['Kehadiran (%)']=getNilaiKehadiran(s.id)??''; row['Nilai Akhir']=hitungNilaiAkhir(g)??'';
      return row;
    });
    exportToExcel(rows, `Sumatif_${mapelAktif}_${ctx.loggedInKelas}`, showToast);
  };

  const {jumlahS, bobotS, bobotSAS} = nilaiSettings;
  const sNums = Array.from({length:jumlahS},(_,i)=>i+1);

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fade-in">

      {/* ── HEADER GRADIENT ── */}
      <div className="rounded-2xl p-3 md:p-4 flex flex-col gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base font-black text-white">Rekap Nilai {ctx.loggedInKelas}</h2>
            <p className="text-purple-200 text-xs mt-0.5">{ctx.activeSemester} · {ctx.activeTahun}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex gap-1 bg-white/20 p-1 rounded-xl">
              {[{id:'sumatif',label:'📊 Sumatif'},{id:'formatif',label:'📋 Formatif'},{id:'kokurikuler',label:'🌱 Kokurikuler'}].map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab===t.id?'bg-white text-purple-800 shadow-sm':'text-white/70 hover:text-white'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <select value={mapelAktif} onChange={e=>setMapelAktif(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
              {MAPEL_OPTIONS.map(m=><option key={m} value={m} style={{background:'#5b21b6'}}>{m}</option>)}
            </select>
            {activeTab==='sumatif' && <>
              <button onClick={()=>setShowSettingsPanel(v=>!v)} className="flex items-center gap-1 bg-white/20 border border-white/30 text-white px-2.5 py-1.5 rounded-xl font-bold text-xs hover:bg-white/30 transition">⚙ Pengaturan</button>
              <button onClick={handleExport} className="flex items-center gap-1 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-50 transition shadow-sm"><Download size={12}/> Export</button>
            </>}
            {activeTab==='formatif' && (
              <button onClick={()=>{setShowTpModal(true);setTpEditId(null);setTpForm({nama:'',deskripsi:''}); }} className="flex items-center gap-1 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-50 transition shadow-sm">+ Kelola TP</button>
            )}
          </div>
        </div>
        {activeTab==='sumatif' && showSettingsPanel && (
          <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-bold">Jumlah Sumatif:</span>
              <div className="flex items-center gap-1">
                <button onClick={()=>saveNilaiSettings({...nilaiSettings,jumlahS:Math.max(1,jumlahS-1)})} className="w-6 h-6 bg-white/20 text-white rounded font-bold text-sm hover:bg-white/30">−</button>
                <span className="text-white font-black text-sm w-6 text-center">{jumlahS}</span>
                <button onClick={()=>saveNilaiSettings({...nilaiSettings,jumlahS:Math.min(8,jumlahS+1)})} className="w-6 h-6 bg-white/20 text-white rounded font-bold text-sm hover:bg-white/30">+</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-bold">Bobot Sumatif:</span>
              <input type="number" min="0" max="100" value={bobotS}
                onChange={e=>saveNilaiSettings({...nilaiSettings,bobotS:Number(e.target.value),bobotSAS:100-Number(e.target.value)})}
                className="w-14 p-1 text-center bg-white/20 border border-white/30 text-white rounded text-xs font-bold outline-none"/>
              <span className="text-purple-200 text-xs">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-bold">Bobot SAS:</span>
              <input type="number" min="0" max="100" value={bobotSAS}
                onChange={e=>saveNilaiSettings({...nilaiSettings,bobotSAS:Number(e.target.value),bobotS:100-Number(e.target.value)})}
                className="w-14 p-1 text-center bg-white/20 border border-white/30 text-white rounded text-xs font-bold outline-none"/>
              <span className="text-purple-200 text-xs">%</span>
            </div>
            <span className="text-purple-200 text-[10px]">* Jika SAS kosong → 100% Sumatif</span>
          </div>
        )}
      </div>

      {/* ── TAB SUMATIF ── */}
      {activeTab==='sumatif' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-800 text-slate-100 text-xs">
                  <th rowSpan="2" className="p-2 font-bold border-r border-slate-700 w-8 text-center">No</th>
                  <th rowSpan="2" className="p-2 font-bold border-r border-slate-700 min-w-[150px]">Nama Lengkap</th>
                  <th colSpan={jumlahS} className="p-2 font-bold border-r border-slate-700 text-center bg-slate-700">Sumatif ({bobotS}%)</th>
                  <th rowSpan="2" className="p-2 font-bold border-r border-slate-700 text-center w-16 bg-purple-900 text-[10px] leading-tight">SAS<br/>({bobotSAS}%)</th>
                  <th rowSpan="2" className="p-2 font-bold text-center w-16 bg-emerald-900 text-[10px] leading-tight">Nilai<br/>Akhir</th>
                </tr>
                <tr className="bg-slate-50 text-slate-500 text-[10px] text-center border-b border-slate-200">
                  {sNums.map(n=><th key={n} className="p-1.5 font-bold border-r border-slate-200 w-12">S{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {students.map((s,idx)=>{
                  const g=grades.find(gd=>gd.siswaId===s.id&&gd.mapel===mapelAktif)||{};
                  const na=hitungNilaiAkhir(g);
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="p-1.5 text-center font-bold text-slate-400 text-xs border-r border-slate-100">{idx+1}</td>
                      <td className="p-1.5 font-bold text-slate-800 text-xs border-r border-slate-100 max-w-[150px] truncate">{s.nama}</td>
                      {sNums.map(n=>(
                        <td key={n} className="p-1 border-r border-slate-100">
                          <input type="number" min="0" max="100" value={g[`s${n}`]||''} onChange={e=>handleGradeChange(s.id,`s${n}`,e.target.value)}
                            className="w-10 p-1 text-center bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"/>
                        </td>
                      ))}
                      <td className="p-1 border-r border-slate-100 bg-purple-50/40">
                        <input type="number" min="0" max="100" value={g.sas||''} onChange={e=>handleGradeChange(s.id,'sas',e.target.value)}
                          className="w-12 mx-auto block p-1 text-center bg-white border border-purple-200 rounded text-xs font-black text-purple-800 outline-none focus:ring-1 focus:ring-purple-500 transition-all"/>
                      </td>
                      <td className="p-1.5 text-center bg-emerald-50/20">
                        <span className={`text-xs font-black px-2 py-0.5 rounded border block w-10 mx-auto ${na!==null?(na<70?'bg-rose-100 text-rose-700 border-rose-200':'bg-emerald-100 text-emerald-700 border-emerald-200'):'text-slate-300 border-transparent'}`}>
                          {na??'—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!students.length&&<tr><td colSpan={jumlahS+4} className="p-6 text-center text-slate-400 text-xs">Belum ada data siswa.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-5 gap-y-1">
            <p className="text-[10px] text-slate-400">* <b>S</b> = Sumatif Lingkup Materi &nbsp;·&nbsp; <b>SAS</b> = Sumatif Akhir Semester</p>
            <p className="text-[10px] text-slate-400">* Jika SAS kosong → nilai akhir = 100% rata-rata Sumatif</p>
          </div>
        </div>
      )}

      {/* ── TAB FORMATIF ── */}
      {activeTab==='formatif' && (
        <div className="space-y-3">
          {tpList.length===0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
              <p className="text-slate-400 text-sm font-medium">Belum ada Tujuan Pembelajaran.</p>
              <p className="text-slate-400 text-xs mt-1">Klik <b>+ Kelola TP</b> di header untuk menambahkan.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-wrap gap-2">
                {tpList.map((tp,i)=>(
                  <div key={tp.id} className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1 max-w-xs">
                    <span className="text-xs font-black text-purple-700 shrink-0">TP{i+1}</span>
                    <span className="text-xs text-purple-600 truncate">{tp.deskripsi ? (tp.deskripsi.length>40?tp.deskripsi.slice(0,40)+'…':tp.deskripsi) : '-'}</span>
                    <button onClick={()=>{setTpEditId(tp.id);setTpForm({deskripsi:tp.deskripsi||''});setShowTpModal(true);}} className="text-purple-400 hover:text-purple-700 ml-1 shrink-0"><Edit2 size={10}/></button>
                    <button onClick={()=>handleTpDelete(tp.id)} className="text-rose-400 hover:text-rose-600 shrink-0"><Trash2 size={10}/></button>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-800 text-slate-100 text-xs">
                        <th className="p-2 font-bold border-r border-slate-700 w-8 text-center">No</th>
                        <th className="p-2 font-bold border-r border-slate-700 min-w-[140px]">Nama Lengkap</th>
                        {tpList.map((tp,i)=>(
                          <th key={tp.id} className="p-2 font-bold border-r border-slate-700 text-center min-w-[70px] text-[10px] leading-tight" title={tp.deskripsi}>
                            TP{i+1}
                          </th>
                        ))}
                        <th className="p-2 font-bold text-center min-w-[200px] bg-slate-700 text-[10px]">Deskripsi Otomatis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s,idx)=>{
                        const gf=grades.find(gd=>gd.siswaId===s.id&&gd.mapel===`__formatif__${mapelAktif}`)||{};
                        const nilaiPerTP={};
                        tpList.forEach(tp=>{nilaiPerTP[tp.id]=gf[`tp_${tp.id}`]||'';});
                        const deskripsi=generateDeskripsiFormatif(tpList,nilaiPerTP);
                        return (
                          <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                            <td className="p-1.5 text-center font-bold text-slate-400 text-xs border-r border-slate-100">{idx+1}</td>
                            <td className="p-1.5 font-bold text-slate-800 text-xs border-r border-slate-100 max-w-[140px] truncate">{s.nama}</td>
                            {tpList.map(tp=>{
                              const val=nilaiPerTP[tp.id];
                              return (
                                <td key={tp.id} className="p-1 border-r border-slate-100 text-center">
                                  <select value={val} onChange={e=>handleFormatifChange(s.id,tp.id,e.target.value)}
                                    className={`w-full p-1 rounded text-[10px] font-bold outline-none border transition-all text-center ${
                                      val==='SB'?'bg-emerald-50 border-emerald-200 text-emerald-700':
                                      val==='B' ?'bg-blue-50 border-blue-200 text-blue-700':
                                      val==='MB'?'bg-amber-50 border-amber-200 text-amber-700':
                                      'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                    <option value="">—</option>
                                    <option value="SB">SB</option>
                                    <option value="B">B</option>
                                    <option value="MB">MB</option>
                                  </select>
                                </td>
                              );
                            })}
                            <td className="p-2 text-[10px] text-slate-600 leading-relaxed max-w-[220px] whitespace-normal">
                              {deskripsi||<span className="text-slate-300 italic">Belum ada nilai</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {!students.length&&<tr><td colSpan={tpList.length+3} className="p-6 text-center text-slate-400 text-xs">Belum ada data siswa.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-5 gap-y-1">
                  <p className="text-[10px] text-slate-400">* <b>SB</b> = Sangat Baik &nbsp;·&nbsp; <b>B</b> = Baik &nbsp;·&nbsp; <b>MB</b> = Mulai Berkembang</p>
                  <p className="text-[10px] text-slate-400">* Deskripsi: sebut TP tertinggi (SB) dan terendah (MB)</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL KELOLA TP ── */}
      {showTpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setShowTpModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between" style={{background:'linear-gradient(135deg,#5b21b6,#4338ca)'}}>
              <h3 className="font-black text-white text-sm">🎯 Kelola TP — {mapelAktif}</h3>
              <button onClick={()=>setShowTpModal(false)} className="text-white/70 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <p className="text-xs font-black text-slate-600 uppercase tracking-wide">{tpEditId?'✏ Edit TP':'+ Tambah TP Baru'}</p>
                <textarea placeholder="Deskripsi TP (cth: Ananda mampu memahami operasi bilangan bulat)" value={tpForm.deskripsi} onChange={e=>setTpForm(f=>({...f,deskripsi:e.target.value}))} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"/>
                <p className="text-[10px] text-slate-400">* Deskripsi ini akan digunakan sebagai output otomatis di kolom deskripsi siswa.</p>
                <div className="flex gap-2">
                  <button onClick={handleTpSave} className="flex-1 bg-purple-700 text-white py-2 rounded-xl font-bold text-sm hover:bg-purple-800 transition">
                    {tpEditId?'Simpan Perubahan':'+ Tambah TP'}
                  </button>
                  {tpEditId&&<button onClick={()=>{setTpEditId(null);setTpForm({deskripsi:''}); }} className="px-4 bg-slate-100 text-slate-600 py-2 rounded-xl font-bold text-sm hover:bg-slate-200 transition">Batal</button>}
                </div>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {!tpList.length&&<p className="text-slate-400 text-xs text-center py-4">Belum ada TP.</p>}
                {tpList.map((tp,i)=>(
                  <div key={tp.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded shrink-0">TP{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-relaxed">{tp.deskripsi||<span className="italic text-slate-400">Belum ada deskripsi</span>}</p>
                    </div>
                    <button onClick={()=>{setTpEditId(tp.id);setTpForm({deskripsi:tp.deskripsi||''});}} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition shrink-0"><Edit2 size={13}/></button>
                    <button onClick={()=>handleTpDelete(tp.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition shrink-0"><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab==='kokurikuler' && (
        <KokurikulerSection students={students} ctx={ctx} showToast={showToast} />
      )}
    </div>
  );
};

// ==========================================
// GURU MAPEL — ABSENSI (view-only, download PDF)
// ==========================================
const AttendanceSectionGuruMapel = ({ allStudentsByKelas, allAttendanceByKelas, ctx, showToast, settings, profile, mapelGuru }) => {
  const [viewKelas, setViewKelas] = useState(KELAS_OPTIONS[0]);
  const [exportMonth, setExportMonth] = useState(getTodayDate().substring(5, 7));
  const [exportYear, setExportYear] = useState(getTodayDate().substring(0, 4));

  const students = (allStudentsByKelas[viewKelas] || [])
    .filter(s => s.tahun === ctx.activeTahun)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const attendance = allAttendanceByKelas[viewKelas] || [];

  // Hitung rekap hari ini untuk tampilan
  const today = getTodayDate();
  const todayAtt = attendance.filter(a => a.tanggal === today);
  const hadirHariIni = todayAtt.filter(a => a.status === 'Hadir').length;

  const getLastWorkdayOfMonth = (year, month) => {
    let d = new Date(year, month, 0);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  };

  const handleDownloadPDF = async () => {
    const year = parseInt(exportYear);
    const month = parseInt(exportMonth);
    const dataBulan = attendance.filter(a => {
      const [y, m] = a.tanggal.split('-').map(Number);
      return y === year && m === month;
    });
    if (dataBulan.length === 0) return showToast("Tidak ada data absensi di bulan & kelas ini", "error");

    const uniqueDates = [...new Set(dataBulan.map(a => a.tanggal))].sort();
    const bulanNama = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
    const lastWorkday = getLastWorkdayOfMonth(year, month);
    const tanggalTTD = lastWorkday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const kota = settings.kotaTandatangan || '___________';
    const namaKepala = profile.namaKepalaSekolah || '___________________________';
    const nipKepala = profile.nipKepalaSekolah || '___________________________';
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
      doc.text(`${viewKelas}  |  Bulan: ${bulanNama} ${year}  |  Semester: ${ctx.activeSemester} (${ctx.activeTahun})`, pageW / 2, 26, { align: 'center' });

      const head = [['No', 'Nama Siswa', ...uniqueDates.map(d => d.substring(8,10)), 'H', 'I', 'S', 'A']];
      const body = students.map((s, idx) => {
        let h=0, i=0, sk=0, a=0;
        const cells = uniqueDates.map(d => {
          const att = dataBulan.find(x => x.siswaId === s.id && x.tanggal === d);
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

      // Blok tanda tangan — menggunakan nama guru MAPEL bersangkutan
      const sigY = finalY + 8;
      const left = 14; const rightX = pageW / 2 + 10;
      doc.setFontSize(10);
      doc.text('Mengetahui,', left + 20, sigY, { align: 'center' });
      doc.text('Kepala Sekolah', left + 20, sigY + 5, { align: 'center' });
      doc.text(`${kota}, ${tanggalTTD}`, rightX + 20, sigY, { align: 'center' });
      doc.text(`Guru ${mapelGuru}`, rightX + 20, sigY + 5, { align: 'center' });
      doc.text(namaKepala, left + 20, sigY + 28, { align: 'center' });
      doc.setDrawColor(0);
      doc.line(left, sigY + 29, left + 40, sigY + 29);
      doc.text(`NIP. ${nipKepala}`, left + 20, sigY + 33, { align: 'center' });
      doc.text(namaGuru, rightX + 20, sigY + 28, { align: 'center' });
      doc.line(rightX, sigY + 29, rightX + 40, sigY + 29);
      doc.text(`NIP. ${nipGuru}`, rightX + 20, sigY + 33, { align: 'center' });

      doc.save(`Rekap_Absensi_${viewKelas.replace(' ','_')}_${mapelGuru.replace(/\s/g,'_')}_${bulanNama}_${year}.pdf`);
      showToast(`PDF Rekap Absensi ${viewKelas} ${bulanNama} ${year} berhasil diunduh!`, "success");
    } catch(err) {
      console.error(err);
      showToast("Gagal membuat PDF: " + err.message, "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div>
          <h2 className="text-base font-black text-white">Absensi Siswa</h2>
          <p className="text-purple-200 text-xs mt-0.5">Data dari guru kelas · Mode lihat saja</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select value={viewKelas} onChange={e => setViewKelas(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {KELAS_OPTIONS.map(k => <option key={k} value={k} style={{background:'#5b21b6'}}>{k}</option>)}
          </select>
          <select value={exportMonth} onChange={e => setExportMonth(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {Array.from({length: 12}, (_, i) => {
              const m = (i+1).toString().padStart(2,'0');
              return <option key={m} value={m} style={{background:'#5b21b6'}}>{new Date(2000,i,1).toLocaleString('id-ID',{month:'long'})}</option>;
            })}
          </select>
          <select value={exportYear} onChange={e => setExportYear(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {[2025,2026,2027,2028,2029,2030,2031].map(y => <option key={y} value={y} style={{background:'#5b21b6'}}>{y}</option>)}
          </select>
          <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-50 transition shadow-sm">
            <Download size={13}/> PDF
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <AlertCircle size={16} className="text-blue-400 shrink-0" />
        <p className="text-xs text-blue-700 font-medium">Data absensi diinput oleh masing-masing guru kelas. Anda hanya dapat melihat dan mengunduh laporan.</p>
      </div>

      {/* Rekap summary hari ini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Hadir','Sakit','Izin','Alpha'].map(st => {
          const count = todayAtt.filter(a => a.status === st).length;
          const colors = { Hadir:'emerald', Sakit:'blue', Izin:'amber', Alpha:'rose' };
          const c = colors[st];
          return (
            <div key={st} className={`bg-${c}-50 border border-${c}-100 p-4 rounded-xl`}>
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{st} Hari Ini</p>
              <p className={`text-2xl font-black text-${c}-700`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Tabel absensi hari ini — view only */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800">{viewKelas} — Absensi Hari Ini</h3>
          <span className="text-xs text-slate-400 font-medium">{today}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-bold w-12 text-center">No</th>
                <th className="p-4 font-bold">Nama Lengkap</th>
                <th className="p-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="3" className="p-8 text-center text-slate-400 font-medium">Belum ada data siswa di kelas ini.</td></tr>
              ) : students.map((s, idx) => {
                const att = todayAtt.find(a => a.siswaId === s.id);
                const st = att ? att.status : '-';
                const stColor = st==='Hadir'?'emerald':st==='Sakit'?'blue':st==='Izin'?'amber':st==='Alpha'?'rose':'slate';
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-4 text-center font-bold text-slate-400">{idx+1}</td>
                    <td className="p-4 font-bold text-slate-800">{s.nama}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold bg-${stColor}-100 text-${stColor}-700`}>{st}</span>
                    </td>
                  </tr>
                );
              })}
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
      <div className="rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div>
          <h2 className="text-base font-black text-white">Data Siswa</h2>
          <p className="text-purple-200 text-xs mt-0.5">Tahun {ctx.activeTahun} · {siswaTampil.length} Siswa</p>
        </div>
        <select value={viewKelas} onChange={e=>setViewKelas(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
          {KELAS_OPTIONS.map(k=><option key={k} value={k} style={{background:'#5b21b6'}}>{k}</option>)}
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
const JournalSectionGuruMapel = ({ journals, allStudentsByKelas, allAttendanceByKelas, ctx, showToast, settings, profile, mapelGuru }) => {
  const [formData, setFormData] = useState({ tanggal: getTodayDate(), kelas: KELAS_OPTIONS[0], tujuanPembelajaran: '', materi: '', kegiatan: '', catatan: '' });
  const [exportKelas, setExportKelas] = useState(KELAS_OPTIONS[0]);
  const [viewKelas, setViewKelas] = useState('Semua');
  const [exportMonth, setExportMonth] = useState(getTodayDate().substring(5,7));
  const [exportYear, setExportYear] = useState(getTodayDate().substring(0,4));
  const [showModal, setShowModal] = useState(false);

  const normalizeKelas = (val) => {
    if (!val) return '';
    const s = val.toString().trim().toLowerCase().replace(/\s+/g, ' ');
    const match = s.match(/(\d+)/);
    if (match) return `Kelas ${match[1]}`;
    return val.toString().trim();
  };

  // Helper: ambil kehadiran dari allAttendanceByKelas untuk kelas & tanggal tertentu
  const getKehadiranSummaryMapel = (kelas, tanggal) => {
    const normKelas = normalizeKelas(kelas);
    const attList = (allAttendanceByKelas && allAttendanceByKelas[normKelas]) ? allAttendanceByKelas[normKelas] : [];
    const attTgl = attList.filter(a => a.tanggal === tanggal);
    const hadir = attTgl.filter(a => a.status === 'Hadir').length;
    const sakit = attTgl.filter(a => a.status === 'Sakit').length;
    const izin  = attTgl.filter(a => a.status === 'Izin').length;
    const alpha = attTgl.filter(a => a.status === 'Alpha').length;
    const totalSiswa = ((allStudentsByKelas && allStudentsByKelas[normKelas]) || []).length;
    return { hadir, sakit, izin, alpha, totalSiswa };
  };

  const getKehadiranText = (kelas, tanggal) => {
    const k = getKehadiranSummaryMapel(kelas, tanggal);
    if (k.hadir + k.sakit + k.izin + k.alpha === 0) return '-';
    return `Hadir: ${k.hadir}, Sakit: ${k.sakit}, Izin: ${k.izin}, Alpha: ${k.alpha}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.materi) return showToast("Materi wajib diisi", "error");
    const newId = generateId();
    await setDoc(doc(db, 'users', ctx.dbId, 'journals', newId), {
      ...formData,
      kelas: normalizeKelas(formData.kelas) || formData.kelas,
      mapel: mapelGuru,
      tahun: ctx.activeTahun, semester: ctx.activeSemester,
    });
    showToast("Jurnal berhasil disimpan");
    setFormData({ ...formData, tujuanPembelajaran: '', materi: '', kegiatan: '', catatan: '' });
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', ctx.dbId, 'journals', id));
    showToast("Jurnal dihapus");
  };

  const filteredJournals = [...journals]
    .filter(j => viewKelas === 'Semua' ? true : normalizeKelas(j.kelas) === viewKelas)
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
        ['Tanggal', 'Kelas', 'Tujuan Pembelajaran', 'Materi Pokok', 'Aktivitas Siswa', 'Catatan'],
        ['2025-07-14', 'Kelas 1', 'Siswa mampu ...', 'Contoh materi', 'Diskusi kelompok', 'Catatan guru'],
      ]);
      ws['A2'] = { t:'s', v:'2025-07-14' };
      ws['!cols'] = [{wch:14},{wch:12},{wch:40},{wch:30},{wch:35},{wch:30}];
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
          let count=0, skipped=0;
          for (const row of data) {
            let tanggal = row['Tanggal'];
            if (!tanggal) continue;
            if (typeof tanggal==='number') tanggal = excelSerialToDate(tanggal);
            else tanggal = tanggal.toString().trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) continue;
            const kelas = normalizeKelas((row['Kelas']||'').toString()) || KELAS_OPTIONS[0];
            const materi = (row['Materi Pokok']||'').toString().trim();
            if (!materi) continue;
            const isDuplicate = journals.some(j =>
              j.tanggal === tanggal && normalizeKelas(j.kelas) === kelas && (j.materi||'') === materi
            );
            if (isDuplicate) { skipped++; continue; }
            await setDoc(doc(db,'users',ctx.dbId,'journals',generateId()), {
              tanggal, kelas, mapel: mapelGuru,
              tujuanPembelajaran: (row['Tujuan Pembelajaran']||'').toString(),
              materi, kegiatan: (row['Aktivitas Siswa']||'').toString(),
              catatan: (row['Catatan']||'').toString(),
              tahun: ctx.activeTahun, semester: ctx.activeSemester,
            });
            count++;
          }
          if (count===0&&skipped===0) return showToast("Tidak ada data valid. Format tanggal: YYYY-MM-DD","error");
          if (count===0&&skipped>0) return showToast(`Semua data sudah ada (${skipped} duplikat dilewati)`,"error");
          showToast(`${count} jurnal diimport${skipped>0?`, ${skipped} duplikat dilewati`:''}!`,"success");
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
      return normalizeKelas(j.kelas)===exportKelas && parseInt(j.tanggal.substring(0,4))===year && parseInt(j.tanggal.substring(5,7))===month;
    });
    if (dataBulan.length===0) { showToast("Tidak ada data jurnal di bulan & kelas ini","error"); return; }
    const bulanNama = new Date(year,month-1,1).toLocaleString('id-ID',{month:'long'});
    const lastWorkday = getLastWorkdayOfMonth(year,month);
    const tanggalTTD = lastWorkday.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const kota=settings.kotaTandatangan||'___________';
    const namaKepala=profile.namaKepalaSekolah||'___________________________';
    const nipKepala=profile.nipKepalaSekolah||'___________________________';
    const namaGuru=profile.nama||'___________________________';
    const nipGuru=profile.nip||'___________________________';
    const namaSekolah=settings.namaSekolah||'SD NEGERI NUSANTARA';
    const sorted=[...dataBulan].sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
    try {
      const JsPDF=await loadJsPDF(); await loadAutoTable();
      const pdf=new JsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      const pageW=pdf.internal.pageSize.getWidth();
      pdf.setFontSize(13); pdf.setFont(undefined,'bold');
      pdf.text(namaSekolah, pageW/2, 14, {align:'center'});
      pdf.setFontSize(11);
      pdf.text(`JURNAL MENGAJAR ${mapelGuru.toUpperCase()}`, pageW/2, 20, {align:'center'});
      pdf.setFont(undefined,'normal'); pdf.setFontSize(9);
      pdf.text(`${exportKelas}  |  Bulan: ${bulanNama} ${year}  |  Semester: ${ctx.activeSemester} (${ctx.activeTahun})`, pageW/2, 26, {align:'center'});

      const head=[['No','Tanggal','Kelas','Tujuan Pembelajaran','Materi Pokok','Aktivitas Siswa','Kehadiran','Catatan']];
      const body=sorted.map((j,idx)=>[
        idx+1, j.tanggal, j.kelas||'-',
        j.tujuanPembelajaran||'-', j.materi,
        j.kegiatan||'-',
        getKehadiranText(j.kelas, j.tanggal),
        j.catatan||j.asesmen||'-',
      ]);
      pdf.autoTable({
        head, body, startY:30,
        styles:{fontSize:7.5, cellPadding:2, valign:'top'},
        columnStyles:{
          0:{cellWidth:8,halign:'center'}, 1:{cellWidth:20}, 2:{cellWidth:16},
          3:{cellWidth:45}, 4:{cellWidth:32}, 5:{cellWidth:45},
          6:{cellWidth:30}, 7:{cellWidth:28},
        },
        headStyles:{fillColor:[88,28,135],textColor:255,fontStyle:'bold'},
        alternateRowStyles:{fillColor:[239,246,255]},
        margin:{left:8,right:8},
      });
      const finalY=pdf.lastAutoTable.finalY+10;
      const needNew=finalY+38>pdf.internal.pageSize.getHeight();
      if(needNew) pdf.addPage();
      const sigY=needNew?20:finalY; const left=14; const rightX=pageW/2+10;
      pdf.setFontSize(10);
      pdf.text('Mengetahui,',left+20,sigY,{align:'center'}); pdf.text('Kepala Sekolah',left+20,sigY+5,{align:'center'});
      pdf.text(`${kota}, ${tanggalTTD}`,rightX+20,sigY,{align:'center'}); pdf.text(`Guru ${mapelGuru}`,rightX+20,sigY+5,{align:'center'});
      pdf.text(namaKepala,left+20,sigY+28,{align:'center'}); pdf.setDrawColor(0);
      pdf.line(left,sigY+29,left+40,sigY+29); pdf.text(`NIP. ${nipKepala}`,left+20,sigY+33,{align:'center'});
      pdf.text(namaGuru,rightX+20,sigY+28,{align:'center'}); pdf.line(rightX,sigY+29,rightX+40,sigY+29); pdf.text(`NIP. ${nipGuru}`,rightX+20,sigY+33,{align:'center'});
      pdf.save(`Jurnal_${mapelGuru.replace(/\s/g,'_')}_${exportKelas.replace(' ','_')}_${bulanNama}_${year}.pdf`);
      showToast(`PDF Jurnal berhasil diunduh!`,"success");
    } catch(err){ console.error(err); showToast("Gagal membuat PDF: "+err.message,"error"); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Form Jurnal — ${mapelGuru}`}>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal</label>
              <input type="date" value={formData.tanggal} onChange={e=>setFormData({...formData,tanggal:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" required/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Kelas</label>
              <select value={formData.kelas} onChange={e=>setFormData({...formData,kelas:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium">
                {KELAS_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          {/* Preview kehadiran otomatis */}
          {formData.tanggal && formData.kelas && (() => {
            const k = getKehadiranSummaryMapel(formData.kelas, formData.tanggal);
            return (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <CalendarCheck size={14} className="text-purple-600 shrink-0"/>
                <div className="text-xs text-purple-800 font-medium">
                  <span className="font-bold">Kehadiran otomatis {formData.kelas}:</span> Hadir {k.hadir} · Sakit {k.sakit} · Izin {k.izin} · Alpha {k.alpha}
                  {k.hadir+k.sakit+k.izin+k.alpha===0 && <span className="text-purple-500 ml-1">(absensi belum diinput)</span>}
                </div>
              </div>
            );
          })()}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tujuan Pembelajaran</label>
            <textarea placeholder="Siswa mampu..." value={formData.tujuanPembelajaran} onChange={e=>setFormData({...formData,tujuanPembelajaran:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-purple-500"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Materi Pokok</label>
            <input type="text" placeholder="Topik hari ini" value={formData.materi} onChange={e=>setFormData({...formData,materi:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" required/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Aktivitas Siswa</label>
            <textarea placeholder="Siswa melakukan..." value={formData.kegiatan} onChange={e=>setFormData({...formData,kegiatan:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-purple-500"></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Catatan</label>
            <textarea placeholder="Catatan guru, kendala, atau hal penting..." value={formData.catatan} onChange={e=>setFormData({...formData,catatan:e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-purple-500"></textarea>
          </div>
          <button type="submit" className="w-full bg-purple-700 text-white font-bold py-3 rounded-xl hover:bg-purple-800 transition shadow-md">Simpan Jurnal</button>
        </form>
      </Modal>

      {/* Header */}
      <div className="rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <div>
          <h2 className="text-base font-black text-white">Jurnal Mengajar <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm ml-1">{mapelGuru}</span></h2>
          <p className="text-purple-200 text-xs mt-0.5">Catatan pembelajaran · {ctx.activeSemester} · {ctx.activeTahun}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-white text-purple-800 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-50 transition shadow-sm">
            <Edit2 size={13}/> + Tambah Jurnal
          </button>
          <select value={exportKelas} onChange={e=>setExportKelas(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {KELAS_OPTIONS.map(k=><option key={k} value={k} style={{background:'#5b21b6'}}>{k}</option>)}
          </select>
          <select value={exportMonth} onChange={e=>setExportMonth(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {Array.from({length:12},(_,i)=>{const m=(i+1).toString().padStart(2,'0');return <option key={m} value={m} style={{background:'#5b21b6'}}>{new Date(2000,i,1).toLocaleString('id-ID',{month:'long'})}</option>})}
          </select>
          <select value={exportYear} onChange={e=>setExportYear(e.target.value)} className="bg-white/20 border border-white/30 text-white px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {[2025,2026,2027,2028,2029,2030,2031].map(y=><option key={y} value={y} style={{background:'#5b21b6'}}>{y}</option>)}
          </select>
          <button onClick={handleExportJurnal} className="flex items-center gap-1.5 text-xs text-white font-bold bg-white/20 border border-white/30 px-3 py-1.5 rounded-xl hover:bg-white/30 transition">
            <Download size={13}/> PDF
          </button>
        </div>
      </div>

      {/* Filter kelas */}
      <div className="flex items-center gap-2 flex-wrap">
        {['Semua', ...KELAS_OPTIONS].map(k => {
          const count = k==='Semua' ? journals.length : journals.filter(j=>normalizeKelas(j.kelas)===k).length;
          return (
            <button key={k} onClick={()=>setViewKelas(k)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${viewKelas===k?'bg-purple-700 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {k} <span className={`ml-1 ${viewKelas===k?'text-purple-200':'text-slate-400'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Card list — 2 per baris */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJournals.length===0 && (
          <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
            <BookOpen size={36} className="text-slate-200 mb-3"/>
            <p className="font-medium text-sm">Belum ada catatan jurnal untuk periode ini.</p>
          </div>
        )}
        {filteredJournals.map(j => {
          const kh = getKehadiranSummaryMapel(j.kelas, j.tanggal);
          const catatanVal = j.catatan || j.asesmen || '';
          return (
            <div key={j.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition group overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="w-11 h-11 bg-purple-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-purple-100 text-purple-800">
                  <span className="text-base font-black leading-none">{j.tanggal.substring(8,10)}</span>
                  <span className="text-[9px] font-bold uppercase">{new Date(j.tanggal+'T00:00:00').toLocaleString('id-ID',{month:'short'})}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-sm">{j.kelas||'—'}</h4>
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{mapelGuru}</span>
                      </div>
                      {j.tujuanPembelajaran && <p className="text-purple-700 text-[10px] mt-0.5 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 line-clamp-1 w-fit">🎯 {j.tujuanPembelajaran}</p>}
                      <p className="text-slate-500 text-xs mt-0.5 truncate">{j.materi}</p>
                    </div>
                    <button onClick={()=>handleDelete(j.id)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 ml-2 shrink-0 p-1"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
              {/* Card body */}
              <div className="grid grid-cols-2 gap-px bg-slate-100">
                <div className="bg-white p-2.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Aktivitas</p>
                  <p className="text-[10px] text-slate-600 line-clamp-2">{j.kegiatan||'—'}</p>
                </div>
                <div className="bg-emerald-50/60 p-2.5">
                  <p className="text-[9px] font-bold text-emerald-500 uppercase mb-1">Kehadiran</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    {kh.hadir+kh.sakit+kh.izin+kh.alpha > 0
                      ? `H:${kh.hadir} S:${kh.sakit} I:${kh.izin} A:${kh.alpha}`
                      : <span className="text-slate-400 font-normal">Belum diinput</span>}
                  </p>
                </div>
              </div>
              {catatanVal && (
                <div className="px-3 py-2 border-t border-slate-50 bg-slate-50/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Catatan</p>
                  <p className="text-[10px] text-slate-600 line-clamp-2">{catatanVal}</p>
                </div>
              )}
            </div>
          );
        })}
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
      [1,2,3,4,5].forEach(n=>{if(g[`s${n}`]){sum+=Number(g[`s${n}`]);cnt++;}});
      const avg=cnt>0?sum/cnt:0; const akhir=Number(g.akhir||0);
      let final=0;
      if(avg>0&&akhir>0)final=Math.round((avg+akhir)/2);else if(avg>0)final=Math.round(avg);else if(akhir>0)final=akhir;
      return {"No":idx+1,"Nama":s.nama,"S1":g.s1||'',"S2":g.s2||'',"S3":g.s3||'',"S4":g.s4||'',"S5":g.s5||'',"Asesmen Akhir":g.akhir||'',"Nilai Akhir":final||''};
    });
    exportToExcel(exportData,`Rekap_Nilai_${mapelGuru.replace(/\s/g,'_')}_${kelasAktif.replace(' ','_')}`,showToast);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fade-in">
      <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base font-black text-slate-800">Rekap Nilai {mapelGuru}</h2>
          <p className="text-slate-500 text-xs mt-0.5">{ctx.activeSemester} · {ctx.activeTahun}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={kelasAktif} onChange={e=>setKelasAktif(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-xl font-bold text-xs outline-none">
            {KELAS_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={handleExportGrades} className="flex items-center gap-1.5 bg-purple-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-purple-800 transition">
            <Download size={13}/> Export .xlsx
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800 text-slate-100 text-xs">
                <th rowSpan="2" className="p-2 font-bold border-r border-slate-700 w-8 text-center">No</th>
                <th rowSpan="2" className="p-2 font-bold border-r border-slate-700 min-w-[160px]">Nama Lengkap</th>
                <th colSpan="5" className="p-2 font-bold border-r border-slate-700 text-center bg-slate-700">Nilai Sumatif (S1–S5)</th>
                <th rowSpan="2" className="p-2 font-bold border-r border-slate-700 text-center w-20 bg-purple-900 leading-tight text-[10px]">Asesmen<br/>Akhir</th>
                <th rowSpan="2" className="p-2 font-bold text-center w-20 bg-emerald-900 leading-tight text-[10px]">Nilai Akhir</th>
              </tr>
              <tr className="bg-slate-50 text-slate-500 text-[10px] text-center border-b border-slate-200">
                {[1,2,3,4,5].map(n=><th key={n} className="p-1.5 font-bold border-r border-slate-200 w-12">S{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((s,idx)=>{
                const g=grades.find(gd=>gd.siswaId===s.id&&gd.kelas===kelasAktif)||{};
                let sum=0,cnt=0;
                [1,2,3,4,5].forEach(n=>{if(g[`s${n}`]){sum+=Number(g[`s${n}`]);cnt++;}});
                const avg=cnt>0?sum/cnt:0; const akhir=Number(g.akhir||0);
                let final=0;
                if(avg>0&&akhir>0)final=Math.round((avg+akhir)/2);else if(avg>0)final=Math.round(avg);else if(akhir>0)final=akhir;
                const isRendah=final>0&&final<70;
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="p-1.5 text-center font-bold text-slate-400 text-xs border-r border-slate-100">{idx+1}</td>
                    <td className="p-1.5 font-bold text-slate-800 text-xs border-r border-slate-100 truncate max-w-[160px]">{s.nama}</td>
                    {[1,2,3,4,5].map(n=>(
                      <td key={n} className="p-1 border-r border-slate-100">
                        <input type="number" min="0" max="100" value={g[`s${n}`]||''} onChange={e=>handleGradeChange(s.id,`s${n}`,e.target.value)} className="w-10 p-1 text-center bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"/>
                      </td>
                    ))}
                    <td className="p-1 bg-purple-50/20">
                      <input type="number" min="0" max="100" value={g.akhir||''} onChange={e=>handleGradeChange(s.id,'akhir',e.target.value)} className="w-12 mx-auto block p-1 text-center bg-white border border-purple-200 rounded text-xs font-black text-purple-800 outline-none focus:ring-1 focus:ring-purple-500 transition-all"/>
                    </td>
                    <td className="p-1.5 text-center bg-emerald-50/20 font-black">
                      <span className={`text-xs px-2 py-0.5 rounded border block w-10 mx-auto ${isRendah?'bg-rose-100 text-rose-700 border-rose-200':'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{final||'—'}</span>
                    </td>
                  </tr>
                );
              })}
              {students.length===0&&<tr><td colSpan="9" className="p-6 text-center text-slate-400 text-xs">Belum ada data siswa di kelas ini.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-5 gap-y-1">
          <p className="text-[10px] text-slate-400">* <b>S</b> = Sumatif Lingkup Materi</p>
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

  // Sync localProfile when profile prop changes (tahun ajaran berubah)
  React.useEffect(() => { setLocalProfile(profile); }, [profile]);
  React.useEffect(() => { setLocalSettings(settings); }, [settings]);

  const profileDocId = `profile_${ctx.activeTahun.replace('/', '_')}`;

  const handleSave = async () => {
    if(!localSettings.password) {
      return showToast("Password tidak boleh kosong", "error");
    }

    // settings global (password, logo, nama sekolah, kota TTD)
    await setDoc(doc(db, 'users', ctx.dbId, 'data', 'settings'), localSettings);
    // profile per tahun ajaran (nama guru, NIP, foto, kepala sekolah, NIP kepsek)
    await setDoc(doc(db, 'users', ctx.dbId, 'data', profileDocId), localProfile);
    
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
      <div className="rounded-2xl p-3 md:p-4" style={{background:'linear-gradient(135deg,#5b21b6 0%,#6d28d9 55%,#4338ca 100%)'}}>
        <h2 className="text-base font-black text-white">Pengaturan Sistem</h2>
        <p className="text-purple-200 text-xs mt-0.5">Sesuaikan data sekolah, profil, dan akses login <span className="bg-white/20 px-1.5 py-0.5 rounded ml-1 font-bold">{ctx.loggedInKelas}</span></p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Data Sekolah & Autentikasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <Settings className="text-purple-700" />
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
            <input type="text" value={localSettings.namaSekolah || ''} onChange={e => setLocalSettings({...localSettings, namaSekolah: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500" placeholder="Cth: SD Negeri Nusantara" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Kota Penandatanganan</label>
            <input type="text" value={localSettings.kotaTandatangan || ''} onChange={e => setLocalSettings({...localSettings, kotaTandatangan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500" placeholder="Cth: Sumenep" />
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2"><Lock size={16}/> Akses Login {ctx.loggedInKelas}</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Password Baru</label>
              <input type="text" value={localSettings.password || ''} onChange={e => setLocalSettings({...localSettings, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <p className="text-[10px] text-amber-600 mt-2 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100">Simpan perubahan dan gunakan password ini untuk login kelas ini berikutnya.</p>
          </div>
        </div>

        {/* Profil Guru & Kepala Sekolah — per tahun ajaran */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <User className="text-purple-700" />
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Profil Guru {ctx.loggedInKelas}</h3>
              <p className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded mt-0.5 w-fit">Tahun Ajaran {ctx.activeTahun}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">Data profil guru & kepala sekolah disimpan per tahun ajaran. Ganti tahun ajaran untuk mengisi data baru.</p>
          
          <div className="flex flex-col items-center gap-3 mb-2">
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
            <input type="text" value={localProfile.nama || ''} onChange={e => setLocalProfile({...localProfile, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500" placeholder="Beserta Gelar" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">NIP Guru</label>
            <input type="text" value={localProfile.nip || ''} onChange={e => setLocalProfile({...localProfile, nip: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500" placeholder="Nomor Induk Pegawai" />
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="font-bold text-slate-700 text-sm">Data Kepala Sekolah</h4>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Nama Kepala Sekolah</label>
              <input type="text" value={localProfile.namaKepalaSekolah || ''} onChange={e => setLocalProfile({...localProfile, namaKepalaSekolah: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500" placeholder="Beserta Gelar" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">NIP Kepala Sekolah</label>
              <input type="text" value={localProfile.nipKepalaSekolah || ''} onChange={e => setLocalProfile({...localProfile, nipKepalaSekolah: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500" placeholder="Nomor Induk Pegawai" />
            </div>
          </div>
        </div>

      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="bg-purple-700 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-purple-800 transition shadow-lg shadow-purple-200 flex items-center gap-2">
          <Check size={20}/> Simpan Semua Pengaturan
        </button>
      </div>
    </div>
  );
};

// end of App