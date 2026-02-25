/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  ChevronDown,
  BarChart3,
  X,
  Wallet,
  ArrowLeft,
  Trash2,
  Edit2,
  TrendingDown,
  Star,
  Loader2,
  RefreshCw,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Search
} from 'lucide-react';

interface ExpenseRecord {
  id: string;
  name: string;
  amount: number;
  date: string; // ISO string
}

interface ProcessRecord {
  id: string;
  tanggalProses: string;
  namaWajibPajak: string;
  nopol: string;
  biayaAwal: number;
  biayaProses: number;
  sisaJasa: number;
  keterangan: string;
  catatan: string;
  diprosesOleh: string;
}

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [processRecords, setProcessRecords] = useState<ProcessRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
  const [listDate, setListDate] = useState(new Date());
  const [isListPickerOpen, setIsListPickerOpen] = useState(false);
  
  // Jasa Samsat Form State
  const [isProcessInputOpen, setIsProcessInputOpen] = useState(false);
  const [editingProcessRecord, setEditingProcessRecord] = useState<ProcessRecord | null>(null);
  const [deletingProcessRecord, setDeletingProcessRecord] = useState<ProcessRecord | null>(null);
  const [processForm, setProcessForm] = useState({
    tanggalProses: new Date().toISOString().split('T')[0],
    namaWajibPajak: '',
    nopol: '',
    biayaAwal: '',
    biayaProses: '',
    keterangan: 'Pengesahan',
    catatan: '',
    diprosesOleh: ''
  });
  const [processFormErrors, setProcessFormErrors] = useState<Record<string, string>>({});

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuth') === 'true';
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Custom Dropdown States
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isKeteranganDropdownOpen, setIsKeteranganDropdownOpen] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Fetch records from Supabase
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecords();
    }
  }, [isAuthenticated]);

  const fetchRecords = async () => {
    setIsLoading(true);
    setDbError(null);

    try {
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (expensesError) {
        console.error('Fetch Expenses Error:', expensesError);
        setDbError(`Gagal mengambil data pengeluaran: ${expensesError.message}.`);
      } else {
        setRecords(expensesData || []);
      }

      const { data: processData, error: processError } = await supabase
        .from('process_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (processError) {
        console.error('Fetch Process Error:', processError);
        // Don't overwrite dbError if it's already set by expenses error
        if (!dbError) {
          if (processError.message.includes('Could not find the table')) {
            setDbError(`Tabel 'process_records' belum ada di Supabase. Silakan buat tabel tersebut di SQL Editor.`);
          } else {
            setDbError(`Gagal mengambil data jasa samsat: ${processError.message}.`);
          }
        }
      } else {
        // Map database fields to frontend interface
        const mappedProcessData = (processData || []).map(item => ({
          id: item.id,
          tanggalProses: item.tanggal_proses,
          namaWajibPajak: item.nama_wajib_pajak,
          nopol: item.nopol,
          biayaAwal: item.biaya_awal,
          biayaProses: item.biaya_proses,
          sisaJasa: item.sisa_jasa,
          keterangan: item.keterangan,
          catatan: item.catatan,
          diprosesOleh: item.diproses_oleh
        }));
        setProcessRecords(mappedProcessData);
      }
    } catch (err: any) {
      console.error('Connection Error:', err);
      if (err.message.includes('Failed to fetch')) {
        setDbError(`Koneksi gagal (Failed to fetch). Ini biasanya terjadi jika: 1. Project Supabase Anda sedang "Paused" (karena versi gratis). Silakan buka dashboard Supabase dan klik "Restore Project". 2. Anda tidak memiliki koneksi internet.`);
      } else {
        setDbError(`Koneksi gagal: ${err.message}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Form State
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Calendar Logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const handleAddRecord = async () => {
    if (!expenseName || !expenseAmount) return;
    
    // Gunakan format YYYY-MM-DD waktu lokal
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('expenses')
          .update({
            name: expenseName,
            amount: parseInt(expenseAmount)
          })
          .eq('id', editingRecord.id);

        if (error) throw error;

        setRecords(records.map(r => r.id === editingRecord.id ? {
          ...r,
          name: expenseName,
          amount: parseInt(expenseAmount)
        } : r));
        setEditingRecord(null);
        setIsInputOpen(false);
        showNotification('Berhasil diubah!');
      } else {
        const newRecord = {
          name: expenseName,
          amount: parseInt(expenseAmount),
          date: dateStr
        };

        const { data, error } = await supabase
          .from('expenses')
          .insert([newRecord])
          .select();

        if (error) throw error;

        if (data) {
          setRecords([data[0], ...records]);
          setIsInputOpen(false);
          showNotification('Berhasil ditambahkan!');
        }
      }
      setExpenseName('');
      setExpenseAmount('');
      setIsDetailOpen(true);
    } catch (error: any) {
      console.error('Supabase Error:', error);
      showNotification(`Gagal menyimpan: ${error.message}`, 'error');
    }
  };

  const handleEditRecord = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setExpenseName(record.name);
    setExpenseAmount(record.amount.toString());
    setIsInputOpen(true);
  };

  const openNewInput = () => {
    setEditingRecord(null);
    setExpenseName('');
    setExpenseAmount('');
    setIsInputOpen(true);
  };

  const openProcessInput = () => {
    setEditingProcessRecord(null);
    setProcessForm({
      tanggalProses: new Date().toISOString().split('T')[0],
      namaWajibPajak: '',
      nopol: '',
      biayaAwal: '',
      biayaProses: '',
      keterangan: 'Pengesahan',
      catatan: '',
      diprosesOleh: ''
    });
    setProcessFormErrors({});
    setIsProcessInputOpen(true);
  };

  const handleAddProcessRecord = async () => {
    const errors: Record<string, string> = {};
    if (!processForm.tanggalProses) errors.tanggalProses = 'Tanggal wajib diisi';
    if (!processForm.namaWajibPajak) errors.namaWajibPajak = 'Nama wajib diisi';
    if (!processForm.nopol) errors.nopol = 'Nopol wajib diisi';
    if (!processForm.biayaAwal) errors.biayaAwal = 'Biaya awal wajib diisi';
    if (!processForm.biayaProses) errors.biayaProses = 'Biaya proses wajib diisi';
    if (!processForm.diprosesOleh) errors.diprosesOleh = 'Nama pemroses wajib diisi';

    if (Object.keys(errors).length > 0) {
      setProcessFormErrors(errors);
      return;
    }

    const biayaAwal = parseInt(processForm.biayaAwal);
    const biayaProses = parseInt(processForm.biayaProses);
    const sisaJasa = biayaAwal - biayaProses;

    const newRecordDb = {
      tanggal_proses: processForm.tanggalProses,
      nama_wajib_pajak: processForm.namaWajibPajak,
      nopol: processForm.nopol,
      biaya_awal: biayaAwal,
      biaya_proses: biayaProses,
      sisa_jasa: sisaJasa,
      keterangan: processForm.keterangan,
      catatan: processForm.catatan,
      diproses_oleh: processForm.diprosesOleh
    };

    try {
      if (editingProcessRecord) {
        const { error } = await supabase
          .from('process_records')
          .update(newRecordDb)
          .eq('id', editingProcessRecord.id);

        if (error) throw error;

        setProcessRecords(processRecords.map(r => r.id === editingProcessRecord.id ? {
          ...r,
          tanggalProses: processForm.tanggalProses,
          namaWajibPajak: processForm.namaWajibPajak,
          nopol: processForm.nopol,
          biayaAwal,
          biayaProses,
          sisaJasa,
          keterangan: processForm.keterangan,
          catatan: processForm.catatan,
          diprosesOleh: processForm.diprosesOleh
        } : r));
        setEditingProcessRecord(null);
        setIsProcessInputOpen(false);
        showNotification('Berhasil diubah!');
      } else {
        const { data, error } = await supabase
          .from('process_records')
          .insert([newRecordDb])
          .select();

        if (error) throw error;

        if (data) {
          const mappedRecord: ProcessRecord = {
            id: data[0].id,
            tanggalProses: data[0].tanggal_proses,
            namaWajibPajak: data[0].nama_wajib_pajak,
            nopol: data[0].nopol,
            biayaAwal: data[0].biaya_awal,
            biayaProses: data[0].biaya_proses,
            sisaJasa: data[0].sisa_jasa,
            keterangan: data[0].keterangan,
            catatan: data[0].catatan,
            diprosesOleh: data[0].diproses_oleh
          };
          setProcessRecords([mappedRecord, ...processRecords]);
          setIsProcessInputOpen(false);
          showNotification('Berhasil ditambahkan!');
        }
      }
    } catch (error: any) {
      console.error('Supabase Error:', error);
      showNotification(`Gagal menyimpan: ${error.message}`, 'error');
    }
  };

  const closeInput = () => {
    setIsInputOpen(false);
    setEditingRecord(null);
    setExpenseName('');
    setExpenseAmount('');
  };

  const deleteRecord = async (id: string) => {
    // Optimistic UI Update: Hapus dari layar seketika
    const previousRecords = [...records];
    setRecords(records.filter(r => r.id !== id));

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting record:', error);
      showNotification('Gagal menghapus data. Data dikembalikan.', 'error');
      // Rollback jika gagal di database
      setRecords(previousRecords);
    } else {
      showNotification('Berhasil dihapus!');
    }
  };

  const filteredRecords = records.filter(r => {
    const recordDate = new Date(r.date).toDateString();
    return recordDate === selectedDate.toDateString();
  });
  const totalExpense = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

  const getMonthlyTotal = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    return records
      .filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const getMonthlyStats = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const monthRecords = records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const total = monthRecords.reduce((sum, r) => sum + r.amount, 0);
    const daysWithRecords = new Set(monthRecords.map(r => new Date(r.date).toDateString())).size;
    const average = daysWithRecords > 0 ? total / daysWithRecords : 0;
    
    // Find highest spending day
    const dailyMap: { [key: string]: number } = {};
    monthRecords.forEach(r => {
      const dStr = new Date(r.date).toDateString();
      dailyMap[dStr] = (dailyMap[dStr] || 0) + r.amount;
    });
    
    let maxDay = { date: '-', amount: 0 };
    Object.entries(dailyMap).forEach(([date, amount]) => {
      if (amount > maxDay.amount) {
        maxDay = { date, amount };
      }
    });

    return { total, average, maxDay, count: monthRecords.length };
  };

  const getProcessMonthlyStats = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const monthRecords = processRecords.filter(r => {
      const d = new Date(r.tanggalProses);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const total = monthRecords.reduce((sum, r) => sum + r.sisaJasa, 0);
    
    // Find highest transaction day
    const dailyMap: { [key: string]: number } = {};
    monthRecords.forEach(r => {
      const dStr = new Date(r.tanggalProses).toDateString();
      dailyMap[dStr] = (dailyMap[dStr] || 0) + r.sisaJasa;
    });
    
    let maxDay = { date: '-', amount: 0 };
    Object.entries(dailyMap).forEach(([date, amount]) => {
      if (amount > maxDay.amount) {
        maxDay = { date, amount };
      }
    });

    return { total, maxDay, count: monthRecords.length };
  };

  const getDayTotal = (dateString: string) => {
    const targetDate = new Date(dateString).toDateString();
    return records
      .filter(r => new Date(r.date).toDateString() === targetDate)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const getDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hari Ini';
    if (date.toDateString() === tomorrow.toDateString()) return 'Besok';
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Custom Validation
    if (!loginUser.trim()) {
      setLoginError('Username tidak boleh kosong!');
      return;
    }
    if (!loginPass.trim()) {
      setLoginError('Password tidak boleh kosong!');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      // Cek ke tabel 'users' di Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginUser)
        .eq('password', loginPass)
        .single();

      if (error || !data) {
        setLoginError('Username atau password salah!');
      } else {
        setIsAuthenticated(true);
        localStorage.setItem('isAuth', 'true');
        setLoginError('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuth');
    setLoginUser('');
    setLoginPass('');
    setShowLogoutConfirm(false);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const calendarDays = [];

    for (let i = 0; i < startDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-14 w-full"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = dateObj.toDateString();
      const isToday = dateStr === new Date().toDateString();
      const isSelected = dateStr === selectedDate.toDateString();
      const dayTotal = getDayTotal(dateStr);

      calendarDays.push(
        <motion.button
          key={day}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setSelectedDate(dateObj);
            setIsDetailOpen(true);
          }}
          className={`h-14 w-full flex flex-col items-center justify-center rounded-2xl transition-all relative
            ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-700 hover:bg-slate-100'}
            ${isToday && !isSelected ? 'text-indigo-600 border border-indigo-100' : ''}
          `}
        >
          <span className="text-sm font-bold">{day}</span>
          {dayTotal > 0 && (
            <span className={`text-[8px] font-bold mt-0.5 truncate max-w-full px-1 ${isSelected ? 'text-indigo-100' : 'text-rose-500'}`}>
              {dayTotal >= 1000000 ? `${(dayTotal/1000000).toFixed(1)}M` : dayTotal >= 1000 ? `${(dayTotal/1000).toFixed(0)}k` : dayTotal}
            </span>
          )}
          {isToday && !isSelected && dayTotal === 0 && (
            <div className="absolute bottom-1.5 w-1 h-1 bg-indigo-600 rounded-full"></div>
          )}
        </motion.button>
      );
    }

    return calendarDays;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative">
        {/* Notifications for Login */}
        <div className="absolute top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-md mx-auto">
          <AnimatePresence>
            {notifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={`px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 ${
                  notification.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}
              >
                {notification.type === 'success' ? (
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle size={14} className="text-rose-600" strokeWidth={3} />
                  </div>
                )}
                <span className="text-sm font-bold">{notification.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[320px] bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Lock size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Pembukuan Arha</h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">Masuk untuk melanjutkan</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <AnimatePresence>
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-rose-100">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{loginError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 ml-1">Username</label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => {
                  setLoginUser(e.target.value);
                  setLoginError('');
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium text-slate-700"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPass}
                  onChange={(e) => {
                    setLoginPass(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium text-slate-700"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors active:scale-[0.98] mt-2 shadow-md shadow-indigo-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? <Loader2 size={20} className="animate-spin" /> : 'Masuk'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden font-sans">
      {/* Notifications */}
      <div className="absolute top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 ${
                notification.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              {notification.type === 'success' ? (
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle size={14} className="text-rose-600" strokeWidth={3} />
                </div>
              )}
              <span className="text-sm font-bold">{notification.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="p-4 pt-8 flex justify-between items-center bg-white border-b border-slate-100 shrink-0 z-10">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-900">Pembukuan Arha</h1>
          <p className="text-slate-500 text-xs font-medium">Catat pembukuanmu hari ini</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchRecords}
            disabled={isLoading}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setIsReportOpen(true)}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="Laporan"
          >
            <BarChart3 size={20} />
          </button>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition-colors"
            title="Keluar"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white px-4 py-2 border-b border-slate-100 flex gap-2 shrink-0 relative z-10">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${activeTab === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          Pengeluaran
        </button>
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${activeTab === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          Jasa Samsat
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <motion.div
          animate={{ x: activeTab === 'calendar' ? '0%' : '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex w-[200%] h-full"
        >
          {/* Page 1: Calendar */}
          <div className="w-1/2 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {dbError && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-600 text-xs font-medium flex items-start gap-3 shrink-0">
                  <div className="mt-0.5">⚠️</div>
                  <p>{dbError}</p>
                </div>
              )}

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Memuat data...</p>
                </div>
              ) : (
                <>
                  {/* Calendar Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 shrink-0"
                  >
          {/* Month/Year Picker Header */}
          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-xl transition-colors"
            >
              <h2 className="text-lg font-display font-bold text-slate-800">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isPickerOpen ? (
              <motion.div 
                key="picker"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-3 gap-2 h-[280px] overflow-y-auto pr-2 custom-scrollbar"
              >
                {monthNames.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => {
                      setCurrentDate(new Date(currentDate.getFullYear(), idx, 1));
                      setIsPickerOpen(false);
                    }}
                    className={`p-3 rounded-xl text-sm font-bold ${idx === currentDate.getMonth() ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {name.substring(0, 3)}
                  </button>
                ))}
                <div className="col-span-3 border-t border-slate-100 my-2"></div>
                {Array.from({ length: 10 }, (_, i) => 2020 + i).map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setCurrentDate(new Date(year, currentDate.getMonth(), 1));
                      setIsPickerOpen(false);
                    }}
                    className={`p-3 rounded-xl text-sm font-bold ${year === currentDate.getFullYear() ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {year}
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="calendar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-7 mb-4">
                  {days.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendar()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </>
    )}
  </div>
</div>

{/* Page 2: List */}
  <div className="w-1/2 h-full flex flex-col">
    <div className="p-6 pb-2 shrink-0 bg-slate-50 z-10 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="w-full bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none shadow-sm flex items-center justify-between text-left"
            >
              <span className="truncate">{monthNames[listDate.getMonth()]}</span>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </button>
            
            <AnimatePresence>
              {isMonthDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMonthDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {monthNames.map((name, idx) => (
                      <button
                        key={name}
                        onClick={() => {
                          setListDate(new Date(listDate.getFullYear(), idx, 1));
                          setIsMonthDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                          idx === listDate.getMonth() ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="relative w-[100px]">
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="w-full bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none shadow-sm flex items-center justify-between text-left"
            >
              <span>{listDate.getFullYear()}</span>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </button>
            
            <AnimatePresence>
              {isYearDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setListDate(new Date(year, listDate.getMonth(), 1));
                          setIsYearDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                          year === listDate.getFullYear() ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2.5 rounded-2xl transition-colors shadow-sm border ${isSearchOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <Search size={18} />
          </button>
          <button 
            onClick={openProcessInput}
            className="p-2.5 rounded-2xl bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative pt-1 pb-1 px-0.5">
              <div className="relative flex items-center">
                <div className="absolute left-3 w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 pointer-events-none">
                  <Search size={16} strokeWidth={2.5} />
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nopol atau nama..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-12 py-3 text-sm font-semibold text-slate-700 focus:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 w-8 h-8 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    
    <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 custom-scrollbar">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-400 text-sm font-medium">Memuat data...</p>
        </div>
      ) : processRecords.filter(record => {
        const recordDate = new Date(record.tanggalProses);
        const matchesDate = recordDate.getMonth() === listDate.getMonth() && recordDate.getFullYear() === listDate.getFullYear();
        const matchesSearch = record.nopol.toLowerCase().includes(searchQuery.toLowerCase()) || record.namaWajibPajak.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesDate && matchesSearch;
      }).length > 0 ? (
        processRecords.filter(record => {
          const recordDate = new Date(record.tanggalProses);
          const matchesDate = recordDate.getMonth() === listDate.getMonth() && recordDate.getFullYear() === listDate.getFullYear();
          const matchesSearch = record.nopol.toLowerCase().includes(searchQuery.toLowerCase()) || record.namaWajibPajak.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesDate && matchesSearch;
        }).map(record => (
          <motion.div 
            key={record.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-[15px] truncate">{record.nopol}</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5 truncate">{record.namaWajibPajak}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                  {new Date(record.tanggalProses).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setEditingProcessRecord(record);
                      setProcessForm({
                        tanggalProses: record.tanggalProses,
                        namaWajibPajak: record.namaWajibPajak,
                        nopol: record.nopol,
                        biayaAwal: record.biayaAwal.toString(),
                        biayaProses: record.biayaProses.toString(),
                        keterangan: record.keterangan,
                        catatan: record.catatan,
                        diprosesOleh: record.diprosesOleh
                      });
                      setProcessFormErrors({});
                      setIsProcessInputOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => setDeletingProcessRecord(record)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-50">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">Biaya Awal</p>
                <p className="text-xs font-bold text-slate-700 truncate" title={`Rp ${record.biayaAwal.toLocaleString('id-ID')}`}>Rp {record.biayaAwal.toLocaleString('id-ID')}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">Biaya Proses</p>
                <p className="text-xs font-bold text-rose-600 truncate" title={`Rp ${record.biayaProses.toLocaleString('id-ID')}`}>Rp {record.biayaProses.toLocaleString('id-ID')}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">Sisa Jasa</p>
                <p className="text-xs font-bold text-emerald-600 truncate" title={`Rp ${record.sisaJasa.toLocaleString('id-ID')}`}>Rp {record.sisaJasa.toLocaleString('id-ID')}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-end gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 truncate"><span className="text-slate-400">Ket:</span> {record.keterangan}</p>
                <p className="text-[10px] font-bold text-slate-500 truncate"><span className="text-slate-400">Catatan:</span> {record.catatan}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Diproses Oleh</p>
                <p className="text-xs font-bold text-indigo-600 truncate max-w-[100px]">{record.diprosesOleh}</p>
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 mb-4 shadow-sm">
            <CalendarIcon size={32} />
          </div>
          <p className="text-slate-400 text-sm font-medium">Belum ada data<br/>untuk bulan ini.</p>
        </div>
      )}
    </div>
  </div>
</motion.div>
</div>

      {/* Daily Detail Sheet */}
      <AnimatePresence>
        {isDetailOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-30"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[40px] max-h-[85%] flex flex-col z-40 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
              
              <div className="p-6 pt-2 flex items-center justify-between shrink-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {getDateLabel(selectedDate)}
                    </span>
                    {totalExpense > 0 && (
                      <span className="text-rose-600 text-sm font-bold">
                        • Rp {totalExpense.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-display font-bold text-slate-800">
                    {selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h2>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="p-2 bg-white rounded-full text-slate-400 shadow-sm">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4 custom-scrollbar">
                {filteredRecords.length > 0 ? (
                  <div className="space-y-3 pb-20">
                    {filteredRecords.map((record) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                            <Wallet size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{record.name}</h4>
                            <p className="text-rose-600 font-bold text-xs">Rp {record.amount.toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEditRecord(record)}
                            className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => deleteRecord(record.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 mb-4 shadow-sm">
                      <CalendarIcon size={32} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Belum ada catatan pembukuan<br/>untuk hari ini.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                <button 
                  onClick={openNewInput}
                  className="w-full bg-indigo-600 text-white rounded-2xl p-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <Plus size={20} /> Tambah Catatan Baru
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input Overlay */}
      <AnimatePresence>
        {isInputOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInputOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[60] shadow-2xl max-h-[90%] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-8 mb-6 shrink-0" />
              
              <div className="flex items-center justify-between px-8 mb-6 shrink-0">
                <h2 className="text-xl font-display font-bold text-slate-800">
                  {editingRecord ? 'Ubah Pengeluaran' : 'Catat Pengeluaran'}
                </h2>
                <button 
                  onClick={closeInput} 
                  className="p-2 bg-slate-50 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 px-8 pb-8 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nama Pengeluaran</label>
                  <input 
                    type="text" 
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    placeholder="Contoh: Makan Siang"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nominal (Rp)</label>
                  <input 
                    type="number" 
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-bold text-2xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                  />
                </div>

                <button 
                  onClick={handleAddRecord}
                  disabled={!expenseName || !expenseAmount}
                  className="w-full bg-indigo-600 text-white rounded-2xl p-5 font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 mt-4"
                >
                  {editingRecord ? 'Simpan Perubahan' : 'Simpan Catatan'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Process Input Overlay */}
      <AnimatePresence>
        {isProcessInputOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProcessInputOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[60] shadow-2xl max-h-[90%] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-8 mb-6 shrink-0" />
              
              <div className="flex items-center justify-between px-8 mb-6 shrink-0">
                <h2 className="text-xl font-display font-bold text-slate-800">
                  {editingProcessRecord ? 'Ubah Jasa Samsat' : 'Tambah Jasa Samsat'}
                </h2>
                <button 
                  onClick={() => setIsProcessInputOpen(false)} 
                  className="p-2 bg-slate-50 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 px-8 pb-8 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Tanggal Proses</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={processForm.tanggalProses}
                      onChange={(e) => {
                        setProcessForm({...processForm, tanggalProses: e.target.value});
                        if (processFormErrors.tanggalProses) setProcessFormErrors({...processFormErrors, tanggalProses: ''});
                      }}
                      className={`w-full bg-slate-50 border border-transparent rounded-2xl p-4 pr-12 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${processFormErrors.tanggalProses ? 'ring-2 ring-rose-500' : ''}`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown size={16} className="text-slate-400" />
                    </div>
                  </div>
                  {processFormErrors.tanggalProses && <p className="text-rose-500 text-xs font-medium ml-1">{processFormErrors.tanggalProses}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nama Wajib Pajak</label>
                  <input 
                    type="text" 
                    value={processForm.namaWajibPajak}
                    onChange={(e) => {
                      setProcessForm({...processForm, namaWajibPajak: e.target.value});
                      if (processFormErrors.namaWajibPajak) setProcessFormErrors({...processFormErrors, namaWajibPajak: ''});
                    }}
                    placeholder="Masukkan nama"
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 ${processFormErrors.namaWajibPajak ? 'ring-2 ring-rose-500' : ''}`}
                  />
                  {processFormErrors.namaWajibPajak && <p className="text-rose-500 text-xs font-medium ml-1">{processFormErrors.namaWajibPajak}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nopol</label>
                  <input 
                    type="text" 
                    value={processForm.nopol}
                    onChange={(e) => {
                      setProcessForm({...processForm, nopol: e.target.value.toUpperCase()});
                      if (processFormErrors.nopol) setProcessFormErrors({...processFormErrors, nopol: ''});
                    }}
                    placeholder="Contoh: DK1234UAD"
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 ${processFormErrors.nopol ? 'ring-2 ring-rose-500' : ''}`}
                  />
                  {processFormErrors.nopol && <p className="text-rose-500 text-xs font-medium ml-1">{processFormErrors.nopol}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Biaya Awal</label>
                    <input 
                      type="number" 
                      value={processForm.biayaAwal}
                      onChange={(e) => {
                        setProcessForm({...processForm, biayaAwal: e.target.value});
                        if (processFormErrors.biayaAwal) setProcessFormErrors({...processFormErrors, biayaAwal: ''});
                      }}
                      placeholder="0"
                      className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 ${processFormErrors.biayaAwal ? 'ring-2 ring-rose-500' : ''}`}
                    />
                    {processFormErrors.biayaAwal && <p className="text-rose-500 text-xs font-medium ml-1">{processFormErrors.biayaAwal}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Biaya Proses</label>
                    <input 
                      type="number" 
                      value={processForm.biayaProses}
                      onChange={(e) => {
                        setProcessForm({...processForm, biayaProses: e.target.value});
                        if (processFormErrors.biayaProses) setProcessFormErrors({...processFormErrors, biayaProses: ''});
                      }}
                      placeholder="0"
                      className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 ${processFormErrors.biayaProses ? 'ring-2 ring-rose-500' : ''}`}
                    />
                    {processFormErrors.biayaProses && <p className="text-rose-500 text-xs font-medium ml-1">{processFormErrors.biayaProses}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Sisa Jasa</label>
                  <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-600 font-bold text-lg">
                    Rp {((parseInt(processForm.biayaAwal) || 0) - (parseInt(processForm.biayaProses) || 0)).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Keterangan</label>
                  <div className="relative">
                    <button 
                      onClick={() => setIsKeteranganDropdownOpen(!isKeteranganDropdownOpen)}
                      className="w-full bg-slate-50 border border-transparent rounded-2xl p-4 pr-12 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left flex items-center justify-between"
                    >
                      <span>{processForm.keterangan}</span>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown size={16} className="text-slate-400" />
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {isKeteranganDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsKeteranganDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-2xl z-50 overflow-hidden"
                          >
                            {['Pengesahan', 'Ganti STNK', 'Balik Nama', 'Mutasi'].map((ket) => (
                              <button
                                key={ket}
                                onClick={() => {
                                  setProcessForm({...processForm, keterangan: ket});
                                  setIsKeteranganDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                                  ket === processForm.keterangan ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {ket}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Catatan</label>
                  <input 
                    type="text" 
                    value={processForm.catatan}
                    onChange={(e) => setProcessForm({...processForm, catatan: e.target.value})}
                    placeholder="Opsional"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Diproses Oleh</label>
                  <input 
                    type="text" 
                    value={processForm.diprosesOleh}
                    onChange={(e) => {
                      setProcessForm({...processForm, diprosesOleh: e.target.value});
                      if (processFormErrors.diprosesOleh) setProcessFormErrors({...processFormErrors, diprosesOleh: ''});
                    }}
                    placeholder="Nama pemroses"
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 ${processFormErrors.diprosesOleh ? 'ring-2 ring-rose-500' : ''}`}
                  />
                  {processFormErrors.diprosesOleh && <p className="text-rose-500 text-xs font-medium ml-1">{processFormErrors.diprosesOleh}</p>}
                </div>

                <button 
                  onClick={handleAddProcessRecord}
                  className="w-full bg-indigo-600 text-white rounded-2xl p-5 font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 mt-2"
                >
                  {editingProcessRecord ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Monthly Report Sheet */}
      <AnimatePresence>
        {isReportOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[40px] max-h-[90%] flex flex-col z-[60] shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
              
              <div className="p-6 pt-2 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Laporan Bulanan</h3>
                  <h2 className="text-xl font-display font-bold text-slate-800">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                </div>
                <button onClick={() => setIsReportOpen(false)} className="p-2 bg-white rounded-full text-slate-400 shadow-sm">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6 custom-scrollbar">
                {/* Insights Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Total Card */}
                  <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                          <Wallet size={20} />
                        </div>
                        <h4 className="text-sm font-bold text-indigo-50">
                          {activeTab === 'calendar' ? 'Total Pengeluaran' : 'Total Transaksi'}
                        </h4>
                      </div>
                      <div className="text-2xl font-display font-bold">
                        Rp {activeTab === 'calendar' 
                          ? getMonthlyStats().total.toLocaleString('id-ID')
                          : getProcessMonthlyStats().total.toLocaleString('id-ID')}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">
                            {activeTab === 'calendar' ? 'Transaksi' : 'Jumlah Transaksi'}
                          </span>
                          <span className="text-sm font-bold">
                            {activeTab === 'calendar' ? getMonthlyStats().count : getProcessMonthlyStats().count}
                          </span>
                        </div>
                        {activeTab === 'calendar' && (
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Rata-rata / Hari</span>
                            <span className="text-sm font-bold">Rp {Math.round(getMonthlyStats().average).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
                  </div>

                  {/* Terbesar Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                        <Star size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {activeTab === 'calendar' ? 'Pengeluaran Terbesar' : 'Transaksi Terbesar'}
                      </h4>
                    </div>
                    {(activeTab === 'calendar' ? getMonthlyStats().maxDay.amount : getProcessMonthlyStats().maxDay.amount) > 0 ? (
                      <div>
                        <div className="text-2xl font-display font-bold text-slate-900">
                          Rp {(activeTab === 'calendar' ? getMonthlyStats().maxDay.amount : getProcessMonthlyStats().maxDay.amount).toLocaleString('id-ID')}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 font-medium">
                          Terjadi pada {new Date(activeTab === 'calendar' ? getMonthlyStats().maxDay.date : getProcessMonthlyStats().maxDay.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-300 text-sm italic">Belum ada data</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl z-50 border border-slate-100"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 text-rose-500 mx-auto">
                <LogOut size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Keluar Aplikasi</h3>
              <p className="text-slate-500 text-sm text-center mb-6 font-medium">
                Apakah Anda yakin ingin keluar dari aplikasi? Anda harus login kembali nanti.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-md shadow-rose-200"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Process Record Confirmation Modal */}
      <AnimatePresence>
        {deletingProcessRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingProcessRecord(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl z-[70] border border-slate-100"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 text-rose-500 mx-auto">
                <Trash2 size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Hapus Data</h3>
              <p className="text-slate-500 text-sm text-center mb-6 font-medium">
                Apakah Anda yakin ingin menghapus data nopol <span className="font-bold text-slate-700">{deletingProcessRecord.nopol}</span>? Data yang dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingProcessRecord(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('process_records')
                        .delete()
                        .eq('id', deletingProcessRecord.id);
                      if (error) throw error;
                      setProcessRecords(processRecords.filter(r => r.id !== deletingProcessRecord.id));
                      setDeletingProcessRecord(null);
                      showNotification('Berhasil dihapus!');
                    } catch (err: any) {
                      showNotification(`Gagal menghapus data: ${err.message}`, 'error');
                    }
                  }}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-md shadow-rose-200"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
