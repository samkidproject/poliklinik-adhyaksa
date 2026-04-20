import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  addDoc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  UserPlus, Stethoscope, Pill, LogOut, 
  Activity, X, ChevronDown, ClipboardList, Package, CheckCircle2,
  Users, UserCheck, Search, Clock, List, ShieldCheck, Download, History, ArrowLeft, User
} from 'lucide-react';
import { auth, db } from './firebase';

// --- ERROR HANDLING ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const appId = 'adhyaksa-klinik-v1';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [data, setData] = useState({
    patients: [],
    queues: [],
    medicines: [], 
    prescriptions: [],
    staffs: []
  });

  const rolesConfig: Record<string, { title: string, icon: React.ReactNode, pass: string }> = {
    pendaftaran: { title: 'Pendaftaran & Admin', icon: <UserPlus />, pass: 'admin123' },
    dokter: { title: 'Layanan Medis (Dokter)', icon: <Stethoscope />, pass: 'dokter123' },
    apoteker: { title: 'Farmasi (Apoteker)', icon: <Pill />, pass: 'obat123' }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Validation Connection test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const paths = {
      patients: collection(db, 'artifacts', appId, 'public', 'data', 'patients'),
      queues: collection(db, 'artifacts', appId, 'public', 'data', 'queues'),
      medicines: collection(db, 'artifacts', appId, 'public', 'data', 'medicines'),
      prescriptions: collection(db, 'artifacts', appId, 'public', 'data', 'prescriptions'),
      staffs: collection(db, 'artifacts', appId, 'public', 'data', 'staffs')
    };

    const unsubscribes = Object.entries(paths).map(([key, colRef]) => {
      return onSnapshot(colRef, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(prev => ({ ...prev, [key]: items }));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `artifacts/${appId}/public/data/${key}`);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const foundRole = Object.keys(rolesConfig).find(key => rolesConfig[key].pass === password);
    if (foundRole) {
      setCurrentRole(foundRole);
      setIsLoggedIn(true);
    } else {
      setError('PIN Akses Salah.');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-[10px] tracking-widest text-slate-400 uppercase">Memuat Sistem...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex flex-col items-center gap-3 mb-8">
            <Activity className="text-slate-900" size={48} />
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
              POLIKLINIK ADHYAKSA
            </h1>
            <h2 className="text-xl font-bold tracking-tight text-slate-500 uppercase">
              Kejaksaan Tinggi Lampung
            </h2>
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border">
            <form onSubmit={handleAuth} className="space-y-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">PIN UNIT</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-6 bg-slate-50 border-2 rounded-[2rem] text-center text-3xl font-mono focus:border-indigo-500 outline-none" placeholder="••••" autoFocus />
              {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}
              <button className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200">Masuk Sistem</button>
            </form>
          </div>
          <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Samkid Project © 2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-80 bg-slate-900 text-white p-8 flex flex-col">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={24} className="text-indigo-400" />
            <h1 className="font-black text-lg tracking-tighter uppercase leading-tight">POLIKLINIK ADHYAKSA</h1>
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Kejaksaan Tinggi Lampung</p>
        </div>
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 mb-6">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Unit Aktif</p>
          <div className="flex items-center gap-3 text-white">
            {rolesConfig[currentRole!].icon}
            <p className="font-bold text-xs uppercase">{rolesConfig[currentRole!].title}</p>
          </div>
        </div>
        <button onClick={() => {setIsLoggedIn(false); setPassword('');}} className="mt-auto flex items-center gap-3 p-4 text-white/30 font-bold text-xs hover:text-red-400 transition-colors uppercase">
          <LogOut size={18} /> Keluar
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        {currentRole === 'pendaftaran' && <PendaftaranView dbData={data} user={user} appId={appId} />}
        {currentRole === 'dokter' && <DokterView dbData={data} user={user} appId={appId} />}
        {currentRole === 'apoteker' && <ApotekerView dbData={data} user={user} appId={appId} />}
      </main>
    </div>
  );
}

// --- VIEW: PENDAFTARAN & ADMIN ---
function PendaftaranView({ dbData, appId }: { dbData: any, user: any, appId: string }) {
  const [activeSubTab, setActiveSubTab] = useState('master'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [patientForm, setPatientForm] = useState({
    nik: '', nama: '', alamat: '', gender: 'Laki-laki', whatsapp: ''
  });

  const [staffForm, setStaffForm] = useState({
    nama: '', profesi: 'Dokter', spesialisasi: '-', status: 'Aktif'
  });

  const [queueForm, setQueueForm] = useState({
    patientId: '', namaPasien: '', poli: 'Umum', keluhan: '', 
    tensi: '', tinggi: '', berat: '', status: 'Menunggu',
    dokterId: '', namaDokter: '', perawatId: '', namaPerawat: ''
  });

  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  const registerPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = `artifacts/${appId}/public/data/patients/${patientForm.nik}`;
    try {
      await setDoc(doc(db, path), {
        ...patientForm, registeredAt: new Date().toISOString()
      });
      alert("Pasien Berhasil Terdaftar!");
      setPatientForm({ nik: '', nama: '', alamat: '', gender: 'Laki-laki', whatsapp: '' });
      setActiveSubTab('antrean'); 
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, path); }
  };

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = `artifacts/${appId}/public/data/staffs`;
    try {
      await addDoc(collection(db, path), {
        ...staffForm, createdAt: new Date().toISOString()
      });
      alert("Data Petugas Berhasil Disimpan!");
      setStaffForm({ nama: '', profesi: 'Dokter', spesialisasi: '-', status: 'Aktif' });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, path); }
  };

  const createQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueForm.patientId) return alert("Pilih pasien terlebih dahulu!");
    const path = `artifacts/${appId}/public/data/queues`;
    try {
      await addDoc(collection(db, path), {
        ...queueForm, timestamp: new Date().toISOString()
      });
      alert("Antrean Berhasil Dibuat!");
      setQueueForm({ patientId: '', namaPasien: '', poli: 'Umum', keluhan: '', tensi: '', tinggi: '', berat: '', status: 'Menunggu', dokterId: '', namaDokter: '', perawatId: '', namaPerawat: '' });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, path); }
  };

  const filteredPatients = dbData.patients.filter((p: any) => p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.nik.includes(searchQuery));
  const filteredQueues = dbData.queues.filter((q: any) => q.status === 'Menunggu');
  const filteredStaffs = dbData.staffs.filter((s: any) => s.nama.toLowerCase().includes(searchQuery.toLowerCase()));

  const listDokter = dbData.staffs.filter((s: any) => s.profesi === 'Dokter');
  const listPerawat = dbData.staffs.filter((s: any) => s.profesi === 'Perawat');

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Administrasi Poliklinik</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Poliklinik Adhyaksa Kejaksaan Tinggi Lampung
          </p>
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-[1.5rem] border shadow-sm">
          <button onClick={() => setActiveSubTab('master')} className={`px-5 py-3 rounded-2xl font-black text-[9px] uppercase transition-all flex items-center gap-2 ${activeSubTab === 'master' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Users size={14}/> Pasien
          </button>
          <button onClick={() => setActiveSubTab('staff')} className={`px-5 py-3 rounded-2xl font-black text-[9px] uppercase transition-all flex items-center gap-2 ${activeSubTab === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
            <ShieldCheck size={14}/> Petugas
          </button>
          <button onClick={() => setActiveSubTab('antrean')} className={`px-5 py-3 rounded-2xl font-black text-[9px] uppercase transition-all flex items-center gap-2 ${activeSubTab === 'antrean' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Clock size={14}/> Antrean
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-7">
          {activeSubTab === 'master' && (
            <div className="bg-white p-10 rounded-[3rem] border space-y-8">
              <div className="flex items-center gap-3 border-b pb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><UserPlus size={20}/></div>
                <h3 className="font-black uppercase text-sm">Registrasi Pasien</h3>
              </div>
              <form onSubmit={registerPatient} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" value={patientForm.nik} onChange={e => setPatientForm({...patientForm, nik: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-indigo-500 font-bold text-sm" placeholder="NIK Pasien" required />
                <input type="text" value={patientForm.nama} onChange={e => setPatientForm({...patientForm, nama: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-indigo-500 font-bold text-sm" placeholder="Nama Lengkap" required />
                <select value={patientForm.gender} onChange={e => setPatientForm({...patientForm, gender: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-indigo-500 font-bold text-sm">
                  <option>Laki-laki</option><option>Perempuan</option>
                </select>
                <input type="tel" value={patientForm.whatsapp} onChange={e => setPatientForm({...patientForm, whatsapp: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-indigo-500 font-bold text-sm" placeholder="WhatsApp" required />
                <textarea value={patientForm.alamat} onChange={e => setPatientForm({...patientForm, alamat: e.target.value})} className="col-span-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-indigo-500 font-bold text-sm min-h-[80px]" placeholder="Alamat lengkap..." required />
                <button className="col-span-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-indigo-100">Simpan Pasien</button>
              </form>
            </div>
          )}

          {activeSubTab === 'staff' && (
            <div className="bg-white p-10 rounded-[3rem] border space-y-8">
              <div className="flex items-center gap-3 border-b pb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><ShieldCheck size={20}/></div>
                <h3 className="font-black uppercase text-sm">Manajemen Petugas Poliklinik</h3>
              </div>
              <form onSubmit={saveStaff} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nama Petugas</label>
                  <input type="text" value={staffForm.nama} onChange={e => setStaffForm({...staffForm, nama: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-blue-500 font-bold text-sm" placeholder="dr. Budi Kusuma" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Profesi</label>
                  <select value={staffForm.profesi} onChange={e => setStaffForm({...staffForm, profesi: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-blue-500 font-bold text-sm">
                    <option>Dokter</option><option>Perawat</option><option>Apoteker</option><option>Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Bidang / Spesialis</label>
                  <input type="text" value={staffForm.spesialisasi} onChange={e => setStaffForm({...staffForm, spesialisasi: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-blue-500 font-bold text-sm" placeholder="Gigi / Umum / KIA" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Status Tugas</label>
                  <select value={staffForm.status} onChange={e => setStaffForm({...staffForm, status: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent focus:border-blue-500 font-bold text-sm">
                    <option>Aktif</option><option>Cuti</option>
                  </select>
                </div>
                <button className="col-span-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-blue-100">Simpan Petugas</button>
              </form>
            </div>
          )}

          {activeSubTab === 'antrean' && (
            <div className="bg-white p-10 rounded-[3rem] border space-y-8">
               <div className="flex items-center gap-3 border-b pb-6">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><UserCheck size={20}/></div>
                <h3 className="font-black uppercase text-sm">Input Antrean Pasien</h3>
              </div>
              <form onSubmit={createQueue} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full space-y-1 relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Pilih Pasien Terdaftar</label>
                  <button type="button" onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-slate-200 flex justify-between items-center font-bold text-sm uppercase">
                    {queueForm.namaPasien || "Cari Nama Pasien..."}
                    <ChevronDown size={18} className="text-slate-400" />
                  </button>
                  {isPatientDropdownOpen && (
                    <div className="absolute top-[105%] left-0 w-full bg-white border shadow-2xl rounded-[1.5rem] z-50 p-2 max-h-60 overflow-y-auto space-y-1">
                      {dbData.patients.map((p: any) => (
                        <button key={p.nik} type="button" onClick={() => { setQueueForm({...queueForm, patientId: p.nik, namaPasien: p.nama}); setIsPatientDropdownOpen(false); }} className="w-full p-4 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between group">
                          <span className="font-bold text-xs uppercase group-hover:text-indigo-600">{p.nama}</span>
                          <span className="text-[8px] font-black text-slate-300 uppercase">{p.nik}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Poli Tujuan</label>
                  <select value={queueForm.poli} onChange={e => setQueueForm({...queueForm, poli: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold text-sm">
                    <option>Umum</option><option>Gigi</option><option>KIA</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Dokter Pemeriksa</label>
                  <select value={queueForm.dokterId} onChange={e => {
                    const docItem = listDokter.find((d: any) => d.id === e.target.value);
                    setQueueForm({...queueForm, dokterId: e.target.value, namaDokter: docItem?.nama || ''});
                  }} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold text-sm" required>
                    <option value="">-- Pilih Dokter --</option>
                    {listDokter.map((d: any) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tensi Darah</label>
                  <input type="text" value={queueForm.tensi} onChange={e => setQueueForm({...queueForm, tensi: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold text-sm" placeholder="120/80" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Perawat Pendamping</label>
                  <select value={queueForm.perawatId} onChange={e => {
                    const nurseItem = listPerawat.find((n: any) => n.id === e.target.value);
                    setQueueForm({...queueForm, perawatId: e.target.value, namaPerawat: nurseItem?.nama || ''});
                  }} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold text-sm">
                    <option value="">-- Pilih Perawat --</option>
                    {listPerawat.map((n: any) => <option key={n.id} value={n.id}>{n.nama}</option>)}
                  </select>
                </div>
                <textarea value={queueForm.keluhan} onChange={e => setQueueForm({...queueForm, keluhan: e.target.value})} className="col-span-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold text-sm" placeholder="Tuliskan keluhan pasien..." required />
                <button className="col-span-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg shadow-emerald-100">Kirim ke Poli</button>
              </form>
            </div>
          )}
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border shadow-sm min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <List size={18} className="text-slate-400"/>
                <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400">
                  {activeSubTab === 'master' ? 'Database Pasien' : activeSubTab === 'staff' ? 'Data Petugas Klinik' : 'Monitoring Antrean'}
                </h3>
              </div>
            </div>

            <div className="relative mb-6">
              <input type="text" placeholder="Cari data..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-slate-100 outline-none text-xs font-bold" />
              <Search className="absolute left-4 top-4 text-slate-300" size={16}/>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {activeSubTab === 'staff' ? (
                filteredStaffs.map((s: any) => (
                  <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border flex items-center gap-4 group hover:bg-white hover:border-indigo-200 transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${s.profesi === 'Dokter' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {s.profesi.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-xs uppercase leading-tight group-hover:text-indigo-600">{s.nama}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{s.profesi} • {s.spesialisasi}</p>
                    </div>
                  </div>
                ))
              ) : activeSubTab === 'master' ? (
                filteredPatients.map((p: any) => (
                  <div key={p.nik} className="p-4 bg-slate-50 rounded-2xl border">
                    <p className="font-black text-xs uppercase text-slate-900">{p.nama}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">NIK: {p.nik} • {p.gender}</p>
                  </div>
                ))
              ) : (
                filteredQueues.map((q: any, idx: number) => (
                  <div key={q.id} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="font-black text-xs uppercase text-emerald-900">{q.namaPasien}</p>
                      <p className="text-[8px] font-bold text-emerald-600/60 uppercase">Poli: {q.poli} • Dr. {q.namaDokter || '-'}</p>
                    </div>
                    <span className="text-[8px] font-black bg-white px-2 py-1 rounded-lg text-emerald-600 border border-emerald-100 uppercase">{idx + 1}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VIEW: DOKTER ---
function DokterView({ dbData, appId }: { dbData: any, user: any, appId: string }) {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState('');
  
  const listDokter = dbData.staffs.filter((s: any) => s.profesi === 'Dokter' && s.status === 'Aktif');
  
  // Filter queues based on selected doctor
  const myQueues = dbData.queues.filter((q: any) => 
    q.status === 'Menunggu' && 
    (selectedDoctor ? q.dokterId === selectedDoctor.id : true)
  );

  const getPatientHistory = (patientId: string) => {
    return dbData.prescriptions
      .filter((p: any) => p.patientId === patientId)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const downloadHistory = (patientName: string, patientId: string) => {
    const history = getPatientHistory(patientId);
    if (history.length === 0) {
      alert("Belum ada riwayat medis untuk pasien ini.");
      return;
    }

    let content = `RIWAYAT MEDIS POLIKLINIK ADHYAKSA\n`;
    content += `====================================\n`;
    content += `Pasien: ${patientName}\n`;
    content += `NIK: ${patientId}\n`;
    content += `Dicetak pada: ${new Date().toLocaleString()}\n\n`;

    history.forEach((h: any, idx: number) => {
      content += `Kunjungan #${history.length - idx}\n`;
      content += `Tanggal: ${new Date(h.timestamp).toLocaleDateString()}\n`;
      content += `Dokter: ${h.dokterNama || '-'}\n`;
      content += `Hasil/Resep:\n${h.diagnosis}\n`;
      content += `------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Riwayat_Medis_${patientName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const finishExam = async () => {
    if (!selected) return;
    const qPath = `artifacts/${appId}/public/data/queues/${selected.id}`;
    const pPath = `artifacts/${appId}/public/data/prescriptions`;
    try {
      await updateDoc(doc(db, qPath), { status: 'Selesai' });
      await addDoc(collection(db, pPath), {
        patientId: selected.patientId,
        nama: selected.namaPasien,
        diagnosis,
        status: 'Diproses Farmasi',
        dokterNama: selectedDoctor ? selectedDoctor.nama : selected.namaDokter,
        timestamp: new Date().toISOString()
      });
      setSelected(null);
      setDiagnosis('');
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, qPath); }
  };

  // 1. Doctor Selection Screen
  if (!selectedDoctor) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-4">
            <Stethoscope size={32} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Pilih Identitas Dokter</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Silakan pilih nama Anda untuk melihat antrean pasien yang ditugaskan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listDokter.map((doc: any) => (
            <button 
              key={doc.id} 
              onClick={() => setSelectedDoctor(doc)}
              className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
                <User size={24} />
              </div>
              <h4 className="font-black text-sm uppercase group-hover:text-indigo-600">{doc.nama}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{doc.spesialisasi || 'Umum'}</p>
            </button>
          ))}
          {listDokter.length === 0 && (
            <div className="col-span-full p-12 text-center bg-white rounded-[3rem] border border-dashed text-slate-400 italic text-xs uppercase font-black">
              Belum ada data dokter aktif. Silakan hubungi Admin.
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Main Doctor Workspace
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedDoctor(null); setSelected(null); }} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-slate-600">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Bertugas Sebagai:</p>
            <h3 className="font-black text-xs uppercase text-indigo-600">{selectedDoctor.nama}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Antrean:</p>
            <p className="font-black text-xs text-slate-900">{myQueues.length} Pasien</p>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <Clock size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Queue List */}
        <div className="xl:col-span-3 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Antrean Pasien</p>
          <div className="space-y-3">
            {myQueues.map((q: any) => (
              <button 
                key={q.id} 
                onClick={() => setSelected(q)} 
                className={`w-full p-6 rounded-[2rem] border-2 transition-all group text-left shadow-sm ${selected?.id === q.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-transparent hover:border-indigo-200'}`}
              >
                <h4 className={`font-black text-sm uppercase ${selected?.id === q.id ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'}`}>{q.namaPasien}</h4>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Poli {q.poli}</p>
                </div>
              </button>
            ))}
            {myQueues.length === 0 && (
              <div className="p-10 bg-white/50 rounded-[2.5rem] border-2 border-dashed text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Antrean Kosong
              </div>
            )}
          </div>
        </div>

        {/* Examination Pane */}
        <div className="xl:col-span-9">
          {selected ? (
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
              {/* Diagnosis Form */}
              <div className="lg:col-span-6 bg-white p-10 rounded-[3rem] border space-y-8 shadow-sm">
                <div className="flex justify-between items-start border-b pb-6">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{selected.namaPasien}</h3>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Status: Pemeriksaan Berjalan</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase">No. Antrean</p>
                    <p className="font-mono font-black text-lg">#{selected.id.slice(-4).toUpperCase()}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-wrap gap-6">
                   <div className="flex-1 min-w-[100px]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tensi</p><p className="font-black text-sm">{selected.tensi || '-'}</p></div>
                   <div className="flex-1 min-w-[100px]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TB / BB</p><p className="font-black text-sm">{selected.tinggi || '-'}cm / {selected.berat || '-'}kg</p></div>
                   <div className="flex-1 min-w-[100px]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Keluhan</p><p className="font-black text-xs text-slate-500">{selected.keluhan || '-'}</p></div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Input Hasil Pemeriksaan & Resep</label>
                  <textarea 
                    value={diagnosis} 
                    onChange={e => setDiagnosis(e.target.value)} 
                    className="w-full p-8 bg-slate-50 rounded-[2.5rem] h-60 outline-none border-2 border-transparent focus:border-indigo-500 font-bold text-sm shadow-inner" 
                    placeholder="Contoh: Diagnosis Gastritis. Resep: Antasida 3x1, Paracetamol 500mg (jika demam) 3x1..." 
                  />
                </div>
                
                <button onClick={finishExam} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-black transition-all">
                  Kirim Hasil & Selesaikan
                </button>
              </div>

              {/* Patient History Sidebar */}
              <div className="lg:col-span-4 bg-slate-100/50 p-8 rounded-[3rem] border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <History size={18} className="text-slate-400" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500">Riwayat Medis</h4>
                  </div>
                  <button 
                    onClick={() => downloadHistory(selected.namaPasien, selected.patientId)}
                    className="p-3 bg-white text-indigo-600 rounded-2xl border hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    title="Download Riwayat"
                  >
                    <Download size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {getPatientHistory(selected.patientId).length > 0 ? (
                    getPatientHistory(selected.patientId).map((h: any) => (
                      <div key={h.id} className="p-5 bg-white rounded-2xl border shadow-sm space-y-2 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2 mb-2">
                          <p className="text-[10px] font-black text-slate-900">{new Date(h.timestamp).toLocaleDateString()}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">dr. {h.dokterNama?.split(' ')[0]}</p>
                        </div>
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed line-clamp-4">{h.diagnosis}</p>
                      </div>
                    ))
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-50 italic">
                      <p className="text-[9px] font-black uppercase">Belum ada riwayat</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[600px] border-4 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300 px-10 text-center space-y-4">
              <div className="p-8 bg-slate-100 rounded-full animate-pulse">
                <Activity size={64} className="opacity-20 text-slate-900" />
              </div>
              <h3 className="font-black uppercase text-sm tracking-[0.3em] text-slate-400">Siap Melayani Pasien</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest max-w-[280px]">Pilih antrean di sebelah kiri untuk memulai proses konsultasi medis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- VIEW: FARMASI ---
function ApotekerView({ dbData, appId }: { dbData: any, user: any, appId: string }) {
  const [activeTab, setActiveTab] = useState('resep');
  const [showStockModal, setShowStockModal] = useState(false);
  const [showRefModal, setShowRefModal] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [stockAmount, setStockAmount] = useState(0);
  
  const [refForm, setRefForm] = useState({ nama: '', kategori: 'Tablet', stok_min: 5 });

  const applyStockUpdate = async () => {
    if (!selectedMed || stockAmount <= 0) return;
    const path = `artifacts/${appId}/public/data/medicines/${selectedMed.id}`;
    try {
      const medRef = doc(db, path);
      const currentStok = parseInt(selectedMed.stok || 0);
      await updateDoc(medRef, { stok: currentStok + parseInt(stockAmount.toString()) });
      setShowStockModal(false);
      setSelectedMed(null);
      setStockAmount(0);
      setIsDropdownOpen(false);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, path); }
  };

  const saveReference = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = `artifacts/${appId}/public/data/medicines`;
    try {
      await addDoc(collection(db, path), { ...refForm, stok: 0 });
      setShowRefModal(false);
      setRefForm({ nama: '', kategori: 'Tablet', stok_min: 5 });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, path); }
  };

  const finishPrescription = async (id: string) => {
    const path = `artifacts/${appId}/public/data/prescriptions/${id}`;
    try {
      await updateDoc(doc(db, path), { status: 'Selesai' });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, path); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Layanan Farmasi</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Poliklinik Adhyaksa Kejati Lampung</p>
          <div className="flex gap-4 mt-4">
            <button onClick={() => setActiveTab('resep')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'resep' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>
              <ClipboardList size={16}/> Resep Masuk
            </button>
            <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === 'inventory' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>
              <Package size={16}/> Gudang Obat
            </button>
          </div>
        </div>
        
        {activeTab === 'inventory' && (
          <div className="flex gap-3">
            <button onClick={() => setShowRefModal(true)} className="px-6 py-3 bg-white border-2 border-slate-900 rounded-2xl font-black text-[10px] uppercase">Tambah Obat</button>
            <button onClick={() => setShowStockModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">Update Stok</button>
          </div>
        )}
      </div>

      {activeTab === 'resep' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dbData.prescriptions.filter((p: any) => p.status !== 'Selesai').length > 0 ? (
            dbData.prescriptions.filter((p: any) => p.status !== 'Selesai').map((p: any) => (
              <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4 hover:border-indigo-100 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tight">{p.nama}</h4>
                    <p className="text-[9px] font-bold text-indigo-500 uppercase">Dokter: {p.dokterNama || '-'}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-3 py-1 rounded-full uppercase">Pending</span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Resep Obat:</p>
                  <p className="text-sm font-bold leading-relaxed">{p.diagnosis}</p>
                </div>
                <button onClick={() => finishPrescription(p.id)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                  <CheckCircle2 size={14}/> Serahkan Obat
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full h-64 border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-slate-300">
               <ClipboardList size={48} className="mb-4 opacity-10"/>
               <p className="font-black uppercase text-xs tracking-[0.2em]">Tidak ada resep baru</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Nama Obat</th>
                <th className="px-8 py-6">Kategori</th>
                <th className="px-8 py-6">Stok Tersedia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-xs">
              {dbData.medicines.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 uppercase">{m.nama}</td>
                  <td className="px-8 py-6 uppercase">{m.kategori}</td>
                  <td className={`px-8 py-6 text-lg font-mono font-black ${m.stok < 10 ? 'text-red-500' : 'text-slate-900'}`}>{m.stok}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL UPDATE STOK */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl space-y-8 animate-in zoom-in-95">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Tambah Stok Obat</h3>
                 <button onClick={() => setShowStockModal(false)}><X size={24}/></button>
              </div>
              <div className="space-y-6">
                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest mb-1 block">Pilih Produk</label>
                  <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-6 bg-slate-50 rounded-[2rem] border-2 font-black flex justify-between items-center">
                    <span className="uppercase text-sm">{selectedMed ? selectedMed.nama : "Cari Obat..."}</span>
                    <ChevronDown size={20}/>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-[110%] left-0 w-full max-h-60 bg-white border-2 rounded-[2rem] shadow-2xl overflow-y-auto z-[110] p-2 space-y-1">
                       {dbData.medicines.map((m: any) => (
                         <button key={m.id} onClick={() => {setSelectedMed(m); setIsDropdownOpen(false);}} className="w-full p-4 text-left rounded-2xl hover:bg-slate-50 font-bold text-xs uppercase">{m.nama}</button>
                       ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest block">Jumlah Penambahan</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border-2">
                      <button onClick={() => setStockAmount(Math.max(0, stockAmount - 1))} className="w-12 h-12 bg-white rounded-2xl font-black text-xl shadow-sm hover:bg-slate-100">-</button>
                      <input type="number" value={stockAmount} onChange={e => setStockAmount(parseInt(e.target.value) || 0)} className="flex-1 bg-transparent text-center font-black text-3xl outline-none" />
                      <button onClick={() => setStockAmount(stockAmount + 1)} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">+</button>
                  </div>
                </div>
                <button onClick={applyStockUpdate} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase shadow-xl hover:bg-black transition-all">Konfirmasi Update Stok</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL REFERENSI BARU */}
      {showRefModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
           <form onSubmit={saveReference} className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
              <h3 className="text-xl font-black uppercase text-center">Master Obat Baru</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Nama Obat" value={refForm.nama} onChange={e => setRefForm({...refForm, nama: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 focus:border-indigo-500 font-bold" required />
                <select value={refForm.kategori} onChange={e => setRefForm({...refForm, kategori: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 focus:border-indigo-500 font-bold">
                  <option>Tablet</option><option>Sirup</option><option>Kapsul</option><option>Salep</option><option>Injeksi</option>
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-lg shadow-indigo-100">Daftarkan Obat</button>
              <button type="button" onClick={() => setShowRefModal(false)} className="w-full text-[10px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors">Batal</button>
           </form>
        </div>
      )}
    </div>
  );
}
