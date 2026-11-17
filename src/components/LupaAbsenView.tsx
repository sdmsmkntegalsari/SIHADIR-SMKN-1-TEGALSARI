import React, { useState, useMemo, useEffect } from 'react';
import {
  FileWarning,
  Send,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Printer,
  Download,
  Search,
  Edit3,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  AlertCircle,
  UploadCloud,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  JenisLupaAbsen,
  LupaAbsenSettings,
  Pegawai,
  PengajuanLupaAbsen,
  StatusLupaAbsen,
} from '../types/attendance';
import {
  deleteLupaAbsenDraft,
  findDuplicateLupaAbsen,
  getLupaAbsenSettings,
  getStoredLupaAbsen,
  saveLupaAbsenSettings,
  updateStatusLupaAbsen,
  upsertPengajuanLupaAbsen,
} from '../utils/storage';
import {
  formatJakartaDateIndo,
  formatJakartaDateTimeIndo,
  formatJakartaDayName,
  getJakartaTodayISO,
  getJenisLupaAbsenLabel,
} from '../utils/dateJakarta';
import { downloadSuratLupaAbsenPdf, getFullPegawaiName } from '../utils/lupaAbsenPdf';
import { SuratLupaAbsenModal } from './SuratLupaAbsenModal';
import { LogoPemprovJatim, LogoSmknTegalsari } from './KopSuratLogos';
import { KOP_SURAT_RESMI, INFO_SEKOLAH } from '../data/mockData';

interface LupaAbsenViewProps {
  currentUser: Pegawai;
  allPegawai: Pegawai[];
  embedded?: boolean;
}

type AdminTab = 'kelola' | 'rekap' | 'pengaturan' | 'ajukan';
type GuruTab = 'ajukan' | 'riwayat';

export const LupaAbsenView: React.FC<LupaAbsenViewProps> = ({
  currentUser,
  allPegawai,
  embedded = false,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'pimpinan';

  const [records, setRecords] = useState<PengajuanLupaAbsen[]>(() => getStoredLupaAbsen());
  const [settings, setSettings] = useState<LupaAbsenSettings>(() => getLupaAbsenSettings());

  // Navigation tabs inside module
  const [adminTab, setAdminTab] = useState<AdminTab>('kelola');
  const [guruTab, setGuruTab] = useState<GuruTab>('ajukan');

  // Reset tab smoothly when switching user role
  useEffect(() => {
    if (isAdmin) {
      setAdminTab('kelola');
    } else {
      setGuruTab('ajukan');
    }
    setEditingDraftId(null);
    setFormError('');
    setFormNotice('');
  }, [currentUser.id, isAdmin]);

  const reloadData = () => {
    setRecords(getStoredLupaAbsen());
    setSettings(getLupaAbsenSettings());
  };

  // ==========================================
  // FORM PENGAJUAN GURU / PEGAWAI
  // ==========================================
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [tanggalKejadian, setTanggalKejadian] = useState<string>(() => getJakartaTodayISO());
  const [jenisPresensi, setJenisPresensi] = useState<JenisLupaAbsen>('masuk');
  const [jamKejadian, setJamKejadian] = useState<string>('');
  const [kronologi, setKronologi] = useState<string>('');
  const [pernyataanKebenaran, setPernyataanKebenaran] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formNotice, setFormNotice] = useState<string>('');

  const resetForm = () => {
    setEditingDraftId(null);
    setTanggalKejadian(getJakartaTodayISO());
    setJenisPresensi('masuk');
    setJamKejadian('');
    setKronologi('');
    setPernyataanKebenaran(false);
    setFormError('');
  };

  const handleLoadDraftToEdit = (draft: PengajuanLupaAbsen) => {
    if (draft.pegawaiId !== currentUser.id || draft.status !== 'draft') return;
    setEditingDraftId(draft.id);
    setTanggalKejadian(draft.tanggalKejadian);
    setJenisPresensi(draft.jenisPresensi);
    setJamKejadian(draft.jamKejadian || '');
    setKronologi(draft.kronologi);
    setPernyataanKebenaran(draft.pernyataanKebenaran);
    setFormError('');
    setFormNotice('');
    if (isAdmin) {
      setAdminTab('ajukan');
    } else {
      setGuruTab('ajukan');
    }
  };

  const handleFormAction = (targetStatus: 'draft' | 'menunggu_persetujuan') => {
    setFormError('');
    setFormNotice('');

    if (!tanggalKejadian) {
      setFormError('Tanggal kejadian lupa presensi wajib dipilih.');
      return;
    }

    const todayJakarta = getJakartaTodayISO();
    if (tanggalKejadian > todayJakarta) {
      setFormError('Tanggal kejadian tidak dapat melebihi tanggal hari ini.');
      return;
    }

    if (!kronologi.trim()) {
      setFormError('Kronologi kejadian wajib diisi secara jelas sebelum menyimpan atau mengirim.');
      return;
    }

    if (targetStatus === 'menunggu_persetujuan') {
      if (kronologi.trim().length < 15) {
        setFormError('Mohon tuliskan kronologi kejadian minimal 15 karakter agar jelas saat diperiksa Admin.');
        return;
      }
      if (!pernyataanKebenaran) {
        setFormError('Harap centang pernyataan kebenaran informasi sebelum mengirim pengajuan.');
        return;
      }
    }

    // Cegah pengajuan ganda yang tidak disengaja pada tanggal & jenis yang sama/tumpang tindih
    const duplicate = findDuplicateLupaAbsen(
      currentUser.id,
      tanggalKejadian,
      jenisPresensi,
      editingDraftId || undefined
    );
    if (duplicate) {
      setFormError(
        `Sudah terdapat pengajuan "${getJenisLupaAbsenLabel(duplicate.jenisPresensi)}" pada tanggal ${formatJakartaDateIndo(
          tanggalKejadian
        )} dengan status ${getStatusLabel(duplicate.status)}. Gunakan tanggal berbeda atau periksa riwayat Anda.`
      );
      return;
    }

    try {
      upsertPengajuanLupaAbsen({
        id: editingDraftId || undefined,
        pegawaiId: currentUser.id,
        tanggalKejadian,
        jenisPresensi,
        jamKejadian: jamKejadian.trim() || undefined,
        kronologi: kronologi.trim(),
        pernyataanKebenaran,
        status: targetStatus,
      });

      reloadData();
      resetForm();
      setFormNotice(
        targetStatus === 'draft'
          ? 'Pengajuan berhasil disimpan sebagai Draft. Anda dapat melengkapi dan mengirimnya kapan saja melalui menu Riwayat.'
          : 'Pengajuan Lupa Absen berhasil dikirim ke Admin untuk diperiksa dan disetujui.'
      );
      if (!isAdmin) {
        setGuruTab('riwayat');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan pengajuan.');
    }
  };

  const handleDeleteDraft = (id: string) => {
    if (!window.confirm('Hapus draft pengajuan lupa absen ini?')) return;
    try {
      deleteLupaAbsenDraft(id, currentUser);
      reloadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus draft.');
    }
  };

  // ==========================================
  // RIWAYAT GURU (STRICTLY OWN RECORDS)
  // ==========================================
  const myRecords = useMemo(() => {
    return records
      .filter((r) => r.pegawaiId === currentUser.id)
      .sort((a, b) => (b.waktuPengajuan || '').localeCompare(a.waktuPengajuan || ''));
  }, [records, currentUser.id]);

  // ==========================================
  // ADMIN: KELOLA & FILTER PENGAJUAN
  // ==========================================
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Admin: submitted records (exclude private unsubmitted teacher drafts)
  const submittedRecords = useMemo(() => {
    return records
      .filter((r) => r.status !== 'draft')
      .sort((a, b) => (b.waktuPengajuan || '').localeCompare(a.waktuPengajuan || ''));
  }, [records]);

  const adminFilteredRecords = useMemo(() => {
    return submittedRecords.filter((item) => {
      const p = allPegawai.find((peg) => peg.id === item.pegawaiId);
      if (filterDate && item.tanggalKejadian !== filterDate) {
        return false;
      }
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }
      if (filterName.trim()) {
        const q = filterName.toLowerCase();
        const fullName = getFullPegawaiName(p).toLowerCase();
        const nip = (p?.nip || '').toLowerCase();
        const kron = item.kronologi.toLowerCase();
        if (!fullName.includes(q) && !nip.includes(q) && !kron.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [submittedRecords, allPegawai, filterDate, filterStatus, filterName]);

  const adminStats = useMemo(() => {
    const waiting = submittedRecords.filter((r) => r.status === 'menunggu_persetujuan').length;
    const approved = submittedRecords.filter((r) => r.status === 'disetujui').length;
    const rejected = submittedRecords.filter((r) => r.status === 'ditolak').length;
    const currentMonthPrefix = getJakartaTodayISO().slice(0, 7);
    const thisMonth = submittedRecords.filter((r) =>
      r.tanggalKejadian.startsWith(currentMonthPrefix)
    ).length;
    return { waiting, approved, rejected, thisMonth };
  }, [submittedRecords]);

  // Modal Detail Kronologi & Proses Persetujuan Admin
  const [detailItem, setDetailItem] = useState<PengajuanLupaAbsen | null>(null);
  const [adminCatatanInput, setAdminCatatanInput] = useState<string>('');
  const [processError, setProcessError] = useState<string>('');

  const openDetailModal = (item: PengajuanLupaAbsen) => {
    setDetailItem(item);
    setAdminCatatanInput(item.catatanAdmin || '');
    setProcessError('');
  };

  const handleProcessStatus = (decision: 'disetujui' | 'ditolak') => {
    if (!detailItem) return;
    setProcessError('');
    if (decision === 'ditolak' && !adminCatatanInput.trim()) {
      setProcessError('Harap tuliskan alasan penolakan pada kolom Catatan Admin.');
      return;
    }
    try {
      updateStatusLupaAbsen(detailItem.id, decision, currentUser, adminCatatanInput);
      reloadData();
      setDetailItem(null);
      setAdminCatatanInput('');
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
    }
  };

  // ==========================================
  // ADMIN: REKAPITULASI BULANAN
  // ==========================================
  const todayParts = getJakartaTodayISO().split('-');
  const [rekapYear, setRekapYear] = useState<number>(Number(todayParts[0]));
  const [rekapMonth, setRekapMonth] = useState<number>(Number(todayParts[1]));
  const [rekapSearch, setRekapSearch] = useState<string>('');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const monthlyRecapRows = useMemo(() => {
    const monthPrefix = `${rekapYear}-${String(rekapMonth).padStart(2, '0')}`;
    const monthItems = submittedRecords.filter((r) => r.tanggalKejadian.startsWith(monthPrefix));

    const map = new Map<
      string,
      {
        pegawai: Pegawai;
        total: number;
        masuk: number;
        pulang: number;
        keduanya: number;
        menunggu: number;
        disetujui: number;
        ditolak: number;
      }
    >();

    for (const item of monthItems) {
      const peg = allPegawai.find((p) => p.id === item.pegawaiId);
      if (!peg) continue;
      if (!map.has(peg.id)) {
        map.set(peg.id, {
          pegawai: peg,
          total: 0,
          masuk: 0,
          pulang: 0,
          keduanya: 0,
          menunggu: 0,
          disetujui: 0,
          ditolak: 0,
        });
      }
      const row = map.get(peg.id)!;
      row.total += 1;
      if (item.jenisPresensi === 'masuk') row.masuk += 1;
      else if (item.jenisPresensi === 'pulang') row.pulang += 1;
      else row.keduanya += 1;

      if (item.status === 'menunggu_persetujuan') row.menunggu += 1;
      else if (item.status === 'disetujui') row.disetujui += 1;
      else if (item.status === 'ditolak') row.ditolak += 1;
    }

    return Array.from(map.values())
      .filter((row) => {
        if (!rekapSearch.trim()) return true;
        const q = rekapSearch.toLowerCase();
        return (
          getFullPegawaiName(row.pegawai).toLowerCase().includes(q) ||
          row.pegawai.nip.includes(q)
        );
      })
      .sort((a, b) => b.total - a.total);
  }, [submittedRecords, allPegawai, rekapYear, rekapMonth, rekapSearch]);

  const handleExportRecapCSV = () => {
    const headers = [
      'No',
      'Nama Guru/Pegawai',
      'NIP',
      'Jabatan',
      'Total Pengajuan',
      'Lupa Masuk',
      'Lupa Pulang',
      'Masuk & Pulang',
      'Menunggu',
      'Disetujui',
      'Ditolak',
    ];
    const rows = monthlyRecapRows.map((r, idx) => [
      idx + 1,
      `"${getFullPegawaiName(r.pegawai)}"`,
      `'${r.pegawai.nip}`,
      `"${r.pegawai.jabatan}"`,
      r.total,
      r.masuk,
      r.pulang,
      r.keduanya,
      r.menunggu,
      r.disetujui,
      r.ditolak,
    ]);
    const csv =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute(
      'download',
      `Rekap_Lupa_Absen_SMKN1_Tegalsari_${monthNames[rekapMonth - 1]}_${rekapYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // ADMIN: PENGATURAN KEPALA SEKOLAH & LOGO
  // ==========================================
  const [kepsekNamaInput, setKepsekNamaInput] = useState<string>(settings.namaKepalaSekolah);
  const [kepsekPangkatInput, setKepsekPangkatInput] = useState<string>(
    settings.pangkatKepalaSekolah || INFO_SEKOLAH.pangkatKepalaSekolah
  );
  const [kepsekNipInput, setKepsekNipInput] = useState<string>(settings.nipKepalaSekolah);
  const [logoJatimInput, setLogoJatimInput] = useState<string | undefined>(
    settings.logoJatimCustomUrl
  );
  const [logoSekolahInput, setLogoSekolahInput] = useState<string | undefined>(
    settings.logoSekolahCustomUrl
  );
  const [ttdKepsekInput, setTtdKepsekInput] = useState<string | undefined>(
    settings.ttdKepsekCustomUrl
  );
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string>('');

  const handleUploadLogo = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'jatim' | 'sekolah' | 'ttd'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'jatim') setLogoJatimInput(result);
      else if (target === 'sekolah') setLogoSekolahInput(result);
      else setTtdKepsekInput(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const latest = getLupaAbsenSettings();
    const saved = saveLupaAbsenSettings(
      {
        ...latest,
        namaKepalaSekolah: kepsekNamaInput,
        pangkatKepalaSekolah: kepsekPangkatInput,
        nipKepalaSekolah: kepsekNipInput,
        logoJatimCustomUrl: logoJatimInput,
        logoSekolahCustomUrl: logoSekolahInput,
        ttdKepsekCustomUrl: ttdKepsekInput,
      },
      currentUser
    );
    setSettings(saved);
    setSettingsSavedMsg(
      'Pengaturan identitas Kepala Sekolah, TTD/Stempel, & kop surat berhasil disimpan.'
    );
    setTimeout(() => setSettingsSavedMsg(''), 3500);
  };

  // ==========================================
  // MODAL PRATINJAU SURAT & DOWNLOAD PDF
  // ==========================================
  const [previewLetterItem, setPreviewLetterItem] = useState<PengajuanLupaAbsen | null>(null);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState<boolean>(false);

  const openLetterPreview = (item: PengajuanLupaAbsen) => {
    setPreviewLetterItem(item);
    setIsLetterModalOpen(true);
  };

  const handleDirectDownloadPdf = async (item: PengajuanLupaAbsen) => {
    const peg = allPegawai.find((p) => p.id === item.pegawaiId);
    await downloadSuratLupaAbsenPdf(item, peg, settings);
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const renderFormSection = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {editingDraftId
              ? 'Lanjutkan & Kirim Draft Lupa Absen'
              : 'Formulir Pengajuan Surat Pernyataan Lupa Presensi'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identitas pengaju diambil otomatis dari profil akun SI-HADIR Anda · Zona waktu Asia/Jakarta
          </p>
        </div>
        {editingDraftId && (
          <button
            type="button"
            onClick={resetForm}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-300 rounded-lg bg-white whitespace-nowrap"
          >
            Batal Edit Draft
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {formError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {formNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
            <span>{formNotice}</span>
          </div>
        )}

        {/* 1-3: Profil Otomatis Guru/Pegawai */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Guru / Pegawai
            </label>
            <input
              type="text"
              readOnly
              value={getFullPegawaiName(currentUser)}
              className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              NIP (Otomatis Profil)
            </label>
            <input
              type="text"
              readOnly
              value={currentUser.nip}
              className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jabatan (Otomatis Profil)
            </label>
            <input
              type="text"
              readOnly
              value={currentUser.jabatan}
              className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
            />
          </div>
        </div>

        {/* 4 & 6: Tanggal & Jam Kejadian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Kejadian Lupa Presensi <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              value={tanggalKejadian}
              max={getJakartaTodayISO()}
              onChange={(e) => setTanggalKejadian(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Hari: {formatJakartaDayName(tanggalKejadian)} · {formatJakartaDateIndo(tanggalKejadian)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Kejadian (Opsional)
            </label>
            <input
              type="time"
              value={jamKejadian}
              onChange={(e) => setJamKejadian(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Perkiraan jam hadir/pulang saat lupa melakukan presensi (WIB)
            </p>
          </div>
        </div>

        {/* 5: Jenis Presensi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Jenis Lupa Presensi <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  id: 'masuk',
                  title: 'Lupa Presensi Masuk',
                  desc: 'Hanya terlewat presensi saat jam masuk',
                },
                {
                  id: 'pulang',
                  title: 'Lupa Presensi Pulang',
                  desc: 'Hanya terlewat presensi saat jam pulang',
                },
                {
                  id: 'masuk_dan_pulang',
                  title: 'Lupa Masuk dan Pulang',
                  desc: 'Terlewat presensi masuk maupun pulang',
                },
              ] as const
            ).map((opt) => {
              const active = jenisPresensi === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setJenisPresensi(opt.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    active
                      ? 'border-blue-700 bg-blue-50/70 text-blue-950 ring-1 ring-blue-700'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 7: Kronologi Kejadian */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kronologi Kejadian <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={4}
            value={kronologi}
            onChange={(e) => setKronologi(e.target.value)}
            placeholder="Jelaskan kronologi lengkap mengapa Anda tidak melakukan presensi SI-HADIR pada tanggal tersebut (contoh: tiba pukul 06.55 WIB langsung menuju bengkel praktik / kendala teknis jaringan saat jam pulang)..."
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Isi kronologi ini akan dicetak resmi di dalam Surat Pernyataan Lupa Presensi SI-HADIR.
          </p>
        </div>

        {/* 8: Pernyataan Kebenaran Informasi */}
        <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={pernyataanKebenaran}
            onChange={(e) => setPernyataanKebenaran(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-blue-900 rounded shrink-0"
          />
          <span className="text-xs text-slate-800 leading-relaxed">
            Saya menyatakan dengan sebenarnya bahwa seluruh informasi dan kronologi yang saya sampaikan adalah benar dan dapat dipertanggungjawabkan sesuai ketentuan disiplin pegawai SMK Negeri 1 Tegalsari.
          </span>
        </label>

        {/* 9 & 10: Tombol Simpan Draft & Kirim Pengajuan */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleFormAction('draft')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Simpan Draft</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormAction('menunggu_persetujuan')}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Pengajuan</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderMyHistorySection = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Riwayat Pengajuan Lupa Absen Saya
          </h2>
          <p className="text-xs text-slate-500">
            Menampilkan {myRecords.length} pengajuan milik {getFullPegawaiName(currentUser)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            if (isAdmin) setAdminTab('ajukan');
            else setGuruTab('ajukan');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg whitespace-nowrap"
        >
          <FileWarning className="w-3.5 h-3.5" />
          <span>Buat Pengajuan Baru</span>
        </button>
      </div>

      {myRecords.length === 0 ? (
        <div className="p-10 text-center">
          <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Belum ada riwayat pengajuan lupa absen.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Klik "Buat Pengajuan Baru" apabila Anda pernah terlewat melakukan presensi SI-HADIR.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-3.5 w-10 text-center">No</th>
                <th className="py-3 px-3.5 min-w-[140px]">Tgl Pengajuan</th>
                <th className="py-3 px-3.5 min-w-[150px]">Tgl Kejadian</th>
                <th className="py-3 px-3.5 min-w-[170px]">Jenis Lupa Presensi</th>
                <th className="py-3 px-3.5 min-w-[240px]">Kronologi</th>
                <th className="py-3 px-3.5 min-w-[150px]">Status</th>
                <th className="py-3 px-3.5 min-w-[200px]">Catatan Admin</th>
                <th className="py-3 px-3.5 text-center min-w-[210px]">Surat & Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {myRecords.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3.5 text-center font-mono text-slate-500 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-700 tabular-nums">
                    <div>{formatJakartaDateIndo(item.tanggalPengajuan)}</div>
                    <div className="text-[10px] text-slate-400">
                      {item.waktuPengajuan.slice(11, 16)} WIB
                    </div>
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-900 font-semibold tabular-nums">
                    <div>{formatJakartaDateIndo(item.tanggalKejadian)}</div>
                    <div className="text-[11px] font-sans font-normal text-slate-500">
                      {formatJakartaDayName(item.tanggalKejadian)}
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="font-semibold text-slate-900 block">
                      {getJenisLupaAbsenLabel(item.jenisPresensi)}
                    </span>
                    {item.jamKejadian && (
                      <span className="text-[11px] font-mono text-slate-500">
                        Pukul {item.jamKejadian} WIB
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <p className="text-slate-700 line-clamp-3 max-w-[260px] leading-relaxed">
                      {item.kronologi}
                    </p>
                  </td>
                  <td className="py-3 px-3.5">
                    <StatusTextBadge status={item.status} />
                  </td>
                  <td className="py-3 px-3.5">
                    {item.catatanAdmin ? (
                      <div className="text-slate-800 leading-snug">{item.catatanAdmin}</div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                    {item.diprosesOlehNama && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Oleh: {item.diprosesOlehNama} · {formatJakartaDateTimeIndo(item.waktuPersetujuan)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {item.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleLoadDraftToEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md whitespace-nowrap"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit / Kirim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Hapus Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openLetterPreview(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat Surat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectDownloadPdf(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Cetak PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'}>
      {/* Header Halaman */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${embedded ? '' : 'pb-3 border-b border-slate-200'}`}>
        {!embedded ? (
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-900 uppercase tracking-wider">
                Lupa Absen SI-HADIR
              </span>
              <span aria-hidden="true">·</span>
              <span>{isAdmin ? 'Panel Pengelolaan Admin & Pimpinan' : 'Layanan Surat Pernyataan Guru & Pegawai'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {isAdmin
                ? 'Pengelolaan Pengajuan Lupa Presensi Guru & Pegawai'
                : 'Pengajuan & Surat Pernyataan Lupa Absen'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Verifikasi kronologi, setujui/tolak pengajuan, cetak surat pernyataan A4, dan rekapitulasi bulanan.'
                : 'Ajukan pernyataan lupa presensi masuk/pulang, pantau status persetujuan admin, dan cetak surat resmi A4.'}
            </p>
          </div>
        ) : (
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">
              {isAdmin ? 'Pengelolaan Lupa Absen' : 'Surat Pernyataan Lupa Absen'}
            </span>
            <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
            <span>
              {isAdmin
                ? 'Verifikasi, rekapitulasi bulanan, dan pengaturan Kepala Sekolah.'
                : 'Ajukan lupa absen masuk/pulang, lihat riwayat, atau cetak PDF A4.'}
            </span>
          </div>
        )}

        {/* Sub-nav Tabs sesuai Hak Akses */}
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
            <button
              type="button"
              onClick={() => setAdminTab('kelola')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                adminTab === 'kelola'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kelola Pengajuan ({adminStats.waiting} Menunggu)
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('rekap')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                adminTab === 'rekap'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Bulanan
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('pengaturan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                adminTab === 'pengaturan'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan Kepsek</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('ajukan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                adminTab === 'ajukan'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ajukan (Pribadi)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
            <button
              type="button"
              onClick={() => setGuruTab('ajukan')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                guruTab === 'ajukan'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Pengajuan
            </button>
            <button
              type="button"
              onClick={() => setGuruTab('riwayat')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                guruTab === 'riwayat'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat Saya ({myRecords.length})
            </button>
          </div>
        )}
      </div>

      {/* KONTEN GURU / PEGAWAI */}
      {!isAdmin && (guruTab === 'ajukan' ? renderFormSection() : renderMyHistorySection())}

      {/* KONTEN ADMIN / PIMPINAN */}
      {isAdmin && adminTab === 'ajukan' && (
        <div className="space-y-6">
          {renderFormSection()}
          {renderMyHistorySection()}
        </div>
      )}

      {isAdmin && adminTab === 'kelola' && (
        <div className="space-y-5">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
                Menunggu Persetujuan
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-800 mt-1">
                {adminStats.waiting}
              </div>
              <span className="text-[11px] text-slate-500">Perlu verifikasi admin</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
                Disetujui
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {adminStats.approved}
              </div>
              <span className="text-[11px] text-slate-500">Surat pernyataan sah</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
                Ditolak
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-rose-700 mt-1">
                {adminStats.rejected}
              </div>
              <span className="text-[11px] text-slate-500">Dengan catatan alasan</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Pengajuan Bulan Ini
              </span>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {adminStats.thisMonth}
              </div>
              <span className="text-[11px] text-slate-500">Periode berjalan</span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Cari berdasarkan nama guru/pegawai, NIP, atau kronologi..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                title="Filter tanggal kejadian"
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="menunggu_persetujuan">Menunggu Persetujuan</option>
                <option value="disetujui">Disetujui</option>
                <option value="ditolak">Ditolak</option>
              </select>

              {(filterDate || filterName || filterStatus !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterDate('');
                    setFilterName('');
                    setFilterStatus('all');
                  }}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-2 py-1.5 whitespace-nowrap"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Tabel Pengajuan Guru */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daftar Pengajuan Lupa Absen ({adminFilteredRecords.length})
              </span>
            </div>

            {adminFilteredRecords.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Tidak ada pengajuan lupa absen sesuai filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-3.5 text-center w-10">No</th>
                      <th className="py-3 px-3.5 min-w-[210px]">Guru / Pegawai</th>
                      <th className="py-3 px-3.5 min-w-[150px]">Tgl Kejadian & Jenis</th>
                      <th className="py-3 px-3.5 min-w-[240px]">Kronologi Kejadian</th>
                      <th className="py-3 px-3.5 min-w-[170px]">Status & Persetujuan</th>
                      <th className="py-3 px-3.5 text-center min-w-[250px]">Tindakan & Surat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {adminFilteredRecords.map((item, idx) => {
                      const peg = allPegawai.find((p) => p.id === item.pegawaiId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5 text-center font-mono text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900">
                              {getFullPegawaiName(peg)}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              NIP. {peg?.nip || '-'}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate max-w-[210px]">
                              {peg?.jabatan || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-mono font-semibold text-slate-900 tabular-nums">
                              {formatJakartaDateIndo(item.tanggalKejadian)}
                            </div>
                            <div className="text-[11px] font-semibold text-blue-900 mt-0.5">
                              {getJenisLupaAbsenLabel(item.jenisPresensi)}
                            </div>
                            {item.jamKejadian && (
                              <div className="text-[10px] font-mono text-slate-500">
                                Pukul {item.jamKejadian} WIB
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Diajukan: {formatJakartaDateTimeIndo(item.waktuPengajuan)}
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <p className="text-slate-700 line-clamp-3 max-w-[260px] leading-relaxed">
                              {item.kronologi}
                            </p>
                            <button
                              type="button"
                              onClick={() => openDetailModal(item)}
                              className="text-[11px] font-semibold text-blue-800 hover:underline mt-1 inline-block"
                            >
                              Lihat detail kronologi
                            </button>
                          </td>
                          <td className="py-3 px-3.5">
                            <StatusTextBadge status={item.status} />
                            {item.catatanAdmin && (
                              <p className="text-[11px] text-slate-600 mt-1 italic">
                                "{item.catatanAdmin}"
                              </p>
                            )}
                            {item.diprosesOlehNama && (
                              <p className="text-[10px] text-slate-500 mt-1">
                                {item.diprosesOlehNama} · {formatJakartaDateTimeIndo(item.waktuPersetujuan)}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {item.status === 'menunggu_persetujuan' && (
                                <button
                                  type="button"
                                  onClick={() => openDetailModal(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md whitespace-nowrap"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Proses / ACC</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openLetterPreview(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Cetak Surat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDirectDownloadPdf(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md whitespace-nowrap"
                              >
                                <Download className="w-3 h-3" />
                                <span>Unduh PDF</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB ADMIN: REKAPITULASI BULANAN */}
      {isAdmin && adminTab === 'rekap' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-900" />
              <span className="text-xs font-bold text-slate-900">Periode Rekapitulasi:</span>
              <select
                value={rekapMonth}
                onChange={(e) => setRekapMonth(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={rekapYear}
                onChange={(e) => setRekapYear(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold font-mono text-slate-900"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rekapSearch}
                  onChange={(e) => setRekapSearch(e.target.value)}
                  placeholder="Filter nama / NIP..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={handleExportRecapCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {monthlyRecapRows.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Belum ada pengajuan lupa absen pada periode {monthNames[rekapMonth - 1]} {rekapYear}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-3 text-center w-10">No</th>
                      <th className="py-3 px-3 min-w-[220px]">Nama Guru / Pegawai</th>
                      <th className="py-3 px-3 text-center">Total</th>
                      <th className="py-3 px-3 text-center">Lupa Masuk</th>
                      <th className="py-3 px-3 text-center">Lupa Pulang</th>
                      <th className="py-3 px-3 text-center">Masuk & Pulang</th>
                      <th className="py-3 px-3 text-center">Menunggu</th>
                      <th className="py-3 px-3 text-center">Disetujui</th>
                      <th className="py-3 px-3 text-center">Ditolak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyRecapRows.map((row, idx) => (
                      <tr key={row.pegawai.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">
                            {getFullPegawaiName(row.pegawai)}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            NIP. {row.pegawai.nip}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 tabular-nums">
                          {row.total}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {row.masuk}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {row.pulang}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {row.keduanya}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-amber-700 tabular-nums">
                          {row.menunggu}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-700 tabular-nums">
                          {row.disetujui}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-rose-700 tabular-nums">
                          {row.ditolak}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB ADMIN: PENGATURAN KEPALA SEKOLAH & LOGO KOP SURAT */}
      {isAdmin && adminTab === 'pengaturan' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">
              Pengaturan Identitas Kepala Sekolah & Logo Kop Surat Resmi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nama dan NIP Kepala Sekolah yang disimpan di sini akan langsung tercantum pada kolom tanda tangan Surat Pernyataan Lupa Presensi (Cetak & Unduh PDF).
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {settingsSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{settingsSavedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Kepala Sekolah <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={kepsekNamaInput}
                  onChange={(e) => setKepsekNamaInput(e.target.value)}
                  placeholder="Masukkan Nama Kepala SMK Negeri 1 Tegalsari"
                  required
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pangkat / Golongan
                </label>
                <input
                  type="text"
                  value={kepsekPangkatInput}
                  onChange={(e) => setKepsekPangkatInput(e.target.value)}
                  placeholder="Contoh: Penata Tk. I, III/d"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Kepala Sekolah <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={kepsekNipInput}
                  onChange={(e) => setKepsekNipInput(e.target.value)}
                  placeholder="Masukkan 18 digit NIP Kepala Sekolah"
                  required
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Tanda Tangan & Stempel Digital Kepala Sekolah */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Tanda Tangan & Stempel Resmi Kepala Sekolah (Otomatis Muncul Setelah Izin Di-ACC)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Secara otomatis tersemat pada seluruh surat izin (Dinas, Cuti, Diklat, & Lupa Absen) yang berstatus Disetujui.
                  </p>
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="bg-white border border-slate-200 rounded-md p-2 shrink-0">
                  <img
                    src={ttdKepsekInput || INFO_SEKOLAH.ttdKepsekDefaultUrl}
                    alt="Pratinjau TTD dan Stempel Kepala Sekolah"
                    className="h-24 w-auto object-contain mix-blend-multiply"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    {ttdKepsekInput ? 'Stempel & TTD Kustom Terunggah' : 'Stempel & TTD Resmi Bawaan (Candra Suro Laksono, S.Pi)'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Ganti Gambar TTD/Stempel (PNG/JPG)</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        onChange={(e) => handleUploadLogo(e, 'ttd')}
                        className="hidden"
                      />
                    </label>
                    {ttdKepsekInput && (
                      <button
                        type="button"
                        onClick={() => setTtdKepsekInput(undefined)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-rose-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Gunakan Stempel & TTD Bawaan</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pengaturan Upload Logo Kiri & Kanan (Opsional ganti dari bawaan) */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Logo Kop Surat (Kiri: Pemprov Jawa Timur · Kanan: SMKN 1 Tegalsari)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex items-center gap-4">
                  <div className="w-16 h-18 bg-white border border-slate-200 rounded-md flex items-center justify-center p-1 shrink-0">
                    <LogoPemprovJatim customUrl={logoJatimInput} className="w-14 h-16" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="text-xs font-bold text-slate-900">
                      Logo Pemprov Jawa Timur (Kiri)
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                        <UploadCloud className="w-3 h-3" />
                        <span>Unggah PNG/JPG</span>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.svg"
                          onChange={(e) => handleUploadLogo(e, 'jatim')}
                          className="hidden"
                        />
                      </label>
                      {logoJatimInput && (
                        <button
                          type="button"
                          onClick={() => setLogoJatimInput(undefined)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-slate-600 hover:text-rose-700"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Bawaan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex items-center gap-4">
                  <div className="w-16 h-18 bg-white border border-slate-200 rounded-md flex items-center justify-center p-1 shrink-0">
                    <LogoSmknTegalsari customUrl={logoSekolahInput} className="w-14 h-16" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="text-xs font-bold text-slate-900">
                      Logo SMK Negeri 1 Tegalsari (Kanan)
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                        <UploadCloud className="w-3 h-3" />
                        <span>Unggah PNG/JPG</span>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.svg"
                          onChange={(e) => handleUploadLogo(e, 'sekolah')}
                          className="hidden"
                        />
                      </label>
                      {logoSekolahInput && (
                        <button
                          type="button"
                          onClick={() => setLogoSekolahInput(undefined)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-slate-600 hover:text-rose-700"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Bawaan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pratinjau Mini Kop Surat */}
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <div className="text-[11px] font-semibold text-slate-500 mb-3">
                Pratinjau Kop Surat Resmi:
              </div>
              <div
                className="flex items-center justify-between gap-4 pb-2.5 border-b-[3px] border-black"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <LogoPemprovJatim customUrl={logoJatimInput} className="w-14 h-16 shrink-0" />
                <div className="flex-1 text-center text-black leading-tight">
                  <div className="text-xs font-bold">{KOP_SURAT_RESMI.pemerintah}</div>
                  <div className="text-xs font-bold">{KOP_SURAT_RESMI.dinas}</div>
                  <div className="text-sm font-bold">{KOP_SURAT_RESMI.sekolah}</div>
                  <div className="text-[10px]">{KOP_SURAT_RESMI.alamat}</div>
                  <div className="text-[10px]">
                    {KOP_SURAT_RESMI.telepon} | Laman {KOP_SURAT_RESMI.laman}
                  </div>
                  <div className="text-[10px]">
                    Pos-el {KOP_SURAT_RESMI.posEl} | NPSN: {KOP_SURAT_RESMI.npsn}
                  </div>
                </div>
                <LogoSmknTegalsari customUrl={logoSekolahInput} className="w-14 h-16 shrink-0" />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* MODAL DETAIL KRONOLOGI & PERSETUJUAN ADMIN */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Detail Pengajuan Lupa Absen
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kronologi dan tentukan persetujuan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {(() => {
                const peg = allPegawai.find((p) => p.id === detailItem.pegawaiId);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Nama Guru / Pegawai</span>
                      <span className="font-bold text-slate-900">{getFullPegawaiName(peg)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">NIP</span>
                      <span className="font-mono text-slate-800">{peg?.nip || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Tanggal Kejadian</span>
                      <span className="font-semibold text-slate-900">
                        {formatJakartaDayName(detailItem.tanggalKejadian)},{' '}
                        {formatJakartaDateIndo(detailItem.tanggalKejadian)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Jenis Presensi</span>
                      <span className="font-semibold text-blue-900">
                        {getJenisLupaAbsenLabel(detailItem.jenisPresensi)}
                        {detailItem.jamKejadian ? ` (${detailItem.jamKejadian} WIB)` : ''}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Kronologi Kejadian
                </span>
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {detailItem.kronologi}
                </div>
              </div>

              {processError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{processError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Admin / Alasan Penolakan
                </label>
                <textarea
                  rows={2}
                  value={adminCatatanInput}
                  onChange={(e) => setAdminCatatanInput(e.target.value)}
                  disabled={detailItem.status !== 'menunggu_persetujuan'}
                  placeholder="Tuliskan catatan verifikasi atau alasan penolakan (wajib jika menolak)..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 disabled:bg-slate-100"
                />
              </div>

              {detailItem.diprosesOlehNama && (
                <div className="text-[11px] text-slate-500">
                  Diproses oleh <strong>{detailItem.diprosesOlehNama}</strong> pada{' '}
                  {formatJakartaDateTimeIndo(detailItem.waktuPersetujuan)}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = detailItem;
                  setDetailItem(null);
                  openLetterPreview(target);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Pratinjau Surat</span>
              </button>

              {detailItem.status === 'menunggu_persetujuan' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleProcessStatus('ditolak')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak Pengajuan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessStatus('disetujui')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Setujui Pengajuan</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU & CETAK SURAT A4 */}
      <SuratLupaAbsenModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        item={previewLetterItem}
        pegawai={allPegawai.find((p) => p.id === previewLetterItem?.pegawaiId)}
        settings={settings}
        isAdmin={isAdmin}
        onOpenSettings={() => setAdminTab('pengaturan')}
      />
    </div>
  );
};

const getStatusLabel = (status: StatusLupaAbsen): string => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'menunggu_persetujuan':
      return 'Menunggu Persetujuan';
    case 'disetujui':
      return 'Disetujui';
    case 'ditolak':
      return 'Ditolak';
  }
};

const StatusTextBadge: React.FC<{ status: StatusLupaAbsen }> = ({ status }) => {
  if (status === 'disetujui') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Disetujui</span>
      </span>
    );
  }
  if (status === 'menunggu_persetujuan') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5" />
        <span>Menunggu Persetujuan</span>
      </span>
    );
  }
  if (status === 'ditolak') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5" />
        <span>Ditolak</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 whitespace-nowrap">
      <FileText className="w-3.5 h-3.5" />
      <span>Draft</span>
    </span>
  );
};
