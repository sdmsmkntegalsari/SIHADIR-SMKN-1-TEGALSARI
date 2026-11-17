import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  RotateCcw,
  Save,
  CheckCircle,
  AlertTriangle,
  Lock,
  Landmark,
  School,
  PenTool,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { Pegawai, LupaAbsenSettings } from '../types/attendance';
import { KOP_SURAT_RESMI, INFO_SEKOLAH } from '../data/mockData';
import { getLupaAbsenSettings, saveLupaAbsenSettings } from '../utils/storage';
import { LogoPemprovJatim, LogoSmknTegalsari } from './KopSuratLogos';

interface LogoSettingsViewProps {
  currentUser: Pegawai;
  onSettingsUpdated: () => void;
}

type UploadTarget = 'provinsi' | 'sekolah' | 'ttd_kepsek' | 'ttd_waka';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

/**
 * Mengoptimalkan gambar logo / TTD yang diunggah menjadi PNG terkompresi (maks. 480px)
 * agar tetap tajam saat dicetak di Kop Surat A4 / PDF namun aman disimpan di localStorage.
 */
const optimizeImageToPngDataUrl = (file: File, maxDim = 480): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      reject(new Error('Format file harus PNG, JPG, WebP, atau SVG.'));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error('Ukuran file maksimal 5 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const rawUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('File gambar tidak dapat dimuat.'));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
          const targetW = Math.max(1, Math.round((img.width || maxDim) * scale));
          const targetH = Math.max(1, Math.round((img.height || maxDim) * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawUrl);
            return;
          }
          ctx.clearRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
};

export const LogoSettingsView: React.FC<LogoSettingsViewProps> = ({
  currentUser,
  onSettingsUpdated,
}) => {
  const initial = getLupaAbsenSettings();
  const [savedSettings, setSavedSettings] = useState<LupaAbsenSettings>(initial);

  // Logos
  const [logoProvinsiUrl, setLogoProvinsiUrl] = useState<string | undefined>(
    initial.logoJatimCustomUrl
  );
  const [logoSekolahUrl, setLogoSekolahUrl] = useState<string | undefined>(
    initial.logoSekolahCustomUrl
  );

  // Kepala Sekolah
  const [namaKepsek, setNamaKepsek] = useState<string>(
    initial.namaKepalaSekolah || INFO_SEKOLAH.kepalaSekolah
  );
  const [nipKepsek, setNipKepsek] = useState<string>(
    initial.nipKepalaSekolah || INFO_SEKOLAH.nipKepalaSekolah
  );
  const [ttdKepsekUrl, setTtdKepsekUrl] = useState<string | undefined>(
    initial.ttdKepsekCustomUrl
  );

  // Koordinator Waka SDM
  const [namaWakaSdm, setNamaWakaSdm] = useState<string>(
    initial.namaKoordinatorSdm || INFO_SEKOLAH.koordinatorSdm
  );
  const [nipWakaSdm, setNipWakaSdm] = useState<string>(
    initial.nipKoordinatorSdm || INFO_SEKOLAH.nipKoordinatorSdm
  );
  const [ttdWakaSdmUrl, setTtdWakaSdmUrl] = useState<string | undefined>(
    initial.ttdKoordinatorSdmCustomUrl
  );

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<UploadTarget | null>(null);

  const provInputRef = useRef<HTMLInputElement>(null);
  const sekInputRef = useRef<HTMLInputElement>(null);
  const ttdKepsekInputRef = useRef<HTMLInputElement>(null);
  const ttdWakaInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'pimpinan';

  const hasUnsavedChanges =
    logoProvinsiUrl !== savedSettings.logoJatimCustomUrl ||
    logoSekolahUrl !== savedSettings.logoSekolahCustomUrl ||
    namaKepsek.trim() !== savedSettings.namaKepalaSekolah.trim() ||
    nipKepsek.trim() !== savedSettings.nipKepalaSekolah.trim() ||
    ttdKepsekUrl !== savedSettings.ttdKepsekCustomUrl ||
    namaWakaSdm.trim() !== (savedSettings.namaKoordinatorSdm || INFO_SEKOLAH.koordinatorSdm).trim() ||
    nipWakaSdm.trim() !== (savedSettings.nipKoordinatorSdm || INFO_SEKOLAH.nipKoordinatorSdm).trim() ||
    ttdWakaSdmUrl !== savedSettings.ttdKoordinatorSdmCustomUrl;

  const handleSelectFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: UploadTarget
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !canEdit) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(target);

    try {
      const maxDim = target === 'provinsi' || target === 'sekolah' ? 420 : 520;
      const dataUrl = await optimizeImageToPngDataUrl(file, maxDim);
      if (target === 'provinsi') setLogoProvinsiUrl(dataUrl);
      else if (target === 'sekolah') setLogoSekolahUrl(dataUrl);
      else if (target === 'ttd_kepsek') setTtdKepsekUrl(dataUrl);
      else setTtdWakaSdmUrl(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!namaKepsek.trim() || !nipKepsek.trim()) {
      setErrorMsg('Nama dan NIP Kepala Sekolah wajib diisi.');
      return;
    }
    if (!namaWakaSdm.trim() || !nipWakaSdm.trim()) {
      setErrorMsg('Nama dan NIP Koordinator Waka SDM wajib diisi.');
      return;
    }

    setErrorMsg('');
    try {
      const latest = getLupaAbsenSettings();
      const updated = saveLupaAbsenSettings(
        {
          ...latest,
          namaKepalaSekolah: namaKepsek.trim(),
          nipKepalaSekolah: nipKepsek.trim(),
          namaKoordinatorSdm: namaWakaSdm.trim(),
          nipKoordinatorSdm: nipWakaSdm.trim(),
          logoJatimCustomUrl: logoProvinsiUrl,
          logoSekolahCustomUrl: logoSekolahUrl,
          ttdKepsekCustomUrl: ttdKepsekUrl,
          ttdKoordinatorSdmCustomUrl: ttdWakaSdmUrl,
        },
        currentUser
      );
      setSavedSettings(updated);
      onSettingsUpdated();
      setSuccessMsg(
        'Logo, identitas pejabat (Kepala Sekolah & Koordinator Waka SDM), serta tanda tangan berhasil disimpan. TTD akan otomatis muncul pada cetakan & PDF saat izin disetujui.'
      );
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch {
      setErrorMsg(
        'Gagal menyimpan perubahan karena kapasitas penyimpanan browser penuh. Gunakan file gambar berukuran lebih kecil.'
      );
    }
  };

  const handleResetDefaults = () => {
    if (!canEdit) return;
    setLogoProvinsiUrl(undefined);
    setLogoSekolahUrl(undefined);
    setNamaKepsek(INFO_SEKOLAH.kepalaSekolah);
    setNipKepsek(INFO_SEKOLAH.nipKepalaSekolah);
    setTtdKepsekUrl(undefined);
    setNamaWakaSdm(INFO_SEKOLAH.koordinatorSdm);
    setNipWakaSdm(INFO_SEKOLAH.nipKoordinatorSdm);
    setTtdWakaSdmUrl(undefined);
    setErrorMsg('');

    const latest = getLupaAbsenSettings();
    const updated = saveLupaAbsenSettings(
      {
        ...latest,
        namaKepalaSekolah: INFO_SEKOLAH.kepalaSekolah,
        nipKepalaSekolah: INFO_SEKOLAH.nipKepalaSekolah,
        namaKoordinatorSdm: INFO_SEKOLAH.koordinatorSdm,
        nipKoordinatorSdm: INFO_SEKOLAH.nipKoordinatorSdm,
        logoJatimCustomUrl: undefined,
        logoSekolahCustomUrl: undefined,
        ttdKepsekCustomUrl: undefined,
        ttdKoordinatorSdmCustomUrl: undefined,
      },
      currentUser
    );
    setSavedSettings(updated);
    onSettingsUpdated();
    setSuccessMsg('Seluruh logo, pejabat, dan TTD dikembalikan ke pengaturan bawaan resmi.');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-blue-900 shrink-0" />
            <span>Pengaturan Logo, Pejabat & TTD Surat Resmi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Kelola logo Provinsi & Sekolah, nama & NIP Kepala Sekolah, nama & NIP Koordinator Waka SDM, serta tanda tangan digital yang otomatis tersemat pada dokumen cetak dan PDF saat pengajuan disetujui.
          </p>
        </div>

        {savedSettings.updatedAt && (
          <div className="text-xs text-slate-500 shrink-0">
            <div>
              Diperbarui: <span className="font-mono font-medium text-slate-700">{savedSettings.updatedAt}</span>
            </div>
            {savedSettings.updatedBy && (
              <div>
                Oleh: <span className="font-semibold text-slate-700">{savedSettings.updatedBy}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Peringatan Akses Non-Admin */}
      {!canEdit && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Mode Lihat Saja</p>
            <p className="mt-0.5">
              Anda masuk sebagai {currentUser.jabatan}. Hanya <strong>Admin SDM</strong> atau <strong>Pimpinan / Kepala Sekolah</strong> yang dapat mengubah logo, nama pejabat, NIP, atau tanda tangan resmi.
            </p>
          </div>
        </div>
      )}

      {/* Notifikasi Sukses / Error */}
      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-2.5 text-xs font-medium text-emerald-900">
          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 flex items-center gap-2.5 text-xs font-medium text-rose-900">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* BAGIAN 1: LOGO PROVINSI & LOGO SEKOLAH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Provinsi Jawa Timur */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Logo Provinsi Jawa Timur</h2>
                  <p className="text-xs text-slate-500">Posisi kiri Kop Surat Resmi & PDF</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                {logoProvinsiUrl ? 'Kustom Aktif' : 'Bawaan Sistem'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 shrink-0 shadow-2xs">
                <LogoPemprovJatim customUrl={logoProvinsiUrl} className="w-20 h-24" />
              </div>

              <div className="flex-1 space-y-2.5 text-center sm:text-left">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gunakan file PNG transparan atau JPG/SVG agar hasil cetak pada kop surat tajam.
                </p>

                {canEdit && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => provInputRef.current?.click()}
                      disabled={isProcessing === 'provinsi'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>
                        {isProcessing === 'provinsi'
                          ? 'Memproses...'
                          : logoProvinsiUrl
                          ? 'Ganti Logo Provinsi'
                          : 'Unggah Logo Provinsi'}
                      </span>
                    </button>
                    <input
                      ref={provInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg"
                      onChange={(e) => handleSelectFile(e, 'provinsi')}
                      className="hidden"
                    />
                    {logoProvinsiUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoProvinsiUrl(undefined)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logo Sekolah */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Logo SMK Negeri 1 Tegalsari</h2>
                  <p className="text-xs text-slate-500">Posisi kanan Kop Surat, PDF & Header Web</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                {logoSekolahUrl ? 'Kustom Aktif' : 'Bawaan Sistem'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 shrink-0 shadow-2xs">
                <LogoSmknTegalsari customUrl={logoSekolahUrl} className="w-20 h-24" />
              </div>

              <div className="flex-1 space-y-2.5 text-center sm:text-left">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Logo otomatis tampil di kop kanan seluruh surat resmi, cetak laporan harian, dan bilah atas aplikasi.
                </p>

                {canEdit && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => sekInputRef.current?.click()}
                      disabled={isProcessing === 'sekolah'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>
                        {isProcessing === 'sekolah'
                          ? 'Memproses...'
                          : logoSekolahUrl
                          ? 'Ganti Logo Sekolah'
                          : 'Unggah Logo Sekolah'}
                      </span>
                    </button>
                    <input
                      ref={sekInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg"
                      onChange={(e) => handleSelectFile(e, 'sekolah')}
                      className="hidden"
                    />
                    {logoSekolahUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoSekolahUrl(undefined)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 2: IDENTITAS & TANDA TANGAN PEJABAT (KEPSEK & KOORDINATOR WAKA SDM) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kolom Kiri: Kepala Sekolah */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Kepala Sekolah (Kolom TTD Kiri)
                </h2>
                <p className="text-xs text-slate-500">
                  Tercantum di kiri bawah surat resmi & otomatis ber-TTD saat ACC
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Kepala Sekolah <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={namaKepsek}
                  onChange={(e) => setNamaKepsek(e.target.value)}
                  disabled={!canEdit}
                  required
                  placeholder="Contoh: Candra Suro Laksono, S.Pi"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Kepala Sekolah <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={nipKepsek}
                  onChange={(e) => setNipKepsek(e.target.value)}
                  disabled={!canEdit}
                  required
                  placeholder="Masukkan 18 digit NIP Kepala Sekolah"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanda Tangan & Stempel Kepala Sekolah
                </label>
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-36 h-20 bg-white border border-slate-200 rounded-md flex items-center justify-center p-1.5 shrink-0">
                    <img
                      src={ttdKepsekUrl || INFO_SEKOLAH.ttdKepsekDefaultUrl}
                      alt="Pratinjau TTD Kepala Sekolah"
                      className="max-h-16 w-auto object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-[11px] text-slate-600">
                      {ttdKepsekUrl ? 'TTD/Stempel Kustom Aktif' : 'TTD/Stempel Resmi Bawaan'}
                    </p>
                    {canEdit && (
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => ttdKepsekInputRef.current?.click()}
                          disabled={isProcessing === 'ttd_kepsek'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>
                            {isProcessing === 'ttd_kepsek' ? 'Memproses...' : 'Upload / Ganti TTD Kepsek'}
                          </span>
                        </button>
                        <input
                          ref={ttdKepsekInputRef}
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.svg"
                          onChange={(e) => handleSelectFile(e, 'ttd_kepsek')}
                          className="hidden"
                        />
                        {ttdKepsekUrl && (
                          <button
                            type="button"
                            onClick={() => setTtdKepsekUrl(undefined)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:text-rose-700"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Bawaan</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Koordinator Waka SDM */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Koordinator Waka SDM (Kolom TTD Kanan)
                </h2>
                <p className="text-xs text-slate-500">
                  Tercantum di kanan bawah surat izin & otomatis ber-TTD saat ACC
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Koordinator Waka SDM <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={namaWakaSdm}
                  onChange={(e) => setNamaWakaSdm(e.target.value)}
                  disabled={!canEdit}
                  required
                  placeholder="Contoh: Bambang Sugiharto, S.Kom., M.Pd."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Koordinator Waka SDM <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={nipWakaSdm}
                  onChange={(e) => setNipWakaSdm(e.target.value)}
                  disabled={!canEdit}
                  required
                  placeholder="Masukkan 18 digit NIP Koordinator Waka SDM"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanda Tangan Koordinator Waka SDM
                </label>
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-36 h-20 bg-white border border-slate-200 rounded-md flex items-center justify-center p-1.5 shrink-0">
                    {ttdWakaSdmUrl ? (
                      <img
                        src={ttdWakaSdmUrl}
                        alt="Pratinjau TTD Koordinator Waka SDM"
                        className="max-h-16 w-auto object-contain mix-blend-multiply"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400 text-center px-2">
                        Belum ada TTD diunggah
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-[11px] text-slate-600">
                      {ttdWakaSdmUrl
                        ? 'TTD Waka SDM siap tampil otomatis saat ACC'
                        : 'Unggah PNG/JPG tanda tangan untuk muncul otomatis saat ACC'}
                    </p>
                    {canEdit && (
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => ttdWakaInputRef.current?.click()}
                          disabled={isProcessing === 'ttd_waka'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>
                            {isProcessing === 'ttd_waka'
                              ? 'Memproses...'
                              : ttdWakaSdmUrl
                              ? 'Ganti TTD Waka SDM'
                              : 'Upload TTD Waka SDM'}
                          </span>
                        </button>
                        <input
                          ref={ttdWakaInputRef}
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.svg"
                          onChange={(e) => handleSelectFile(e, 'ttd_waka')}
                          className="hidden"
                        />
                        {ttdWakaSdmUrl && (
                          <button
                            type="button"
                            onClick={() => setTtdWakaSdmUrl(undefined)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-rose-700 hover:bg-rose-50 rounded-md"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus TTD</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 3: PRATINJAU LANGSUNG KOP SURAT & PENGESAHAN (STATUS DISETUJUI / ACC) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pratinjau Kop Surat & Pengesahan Cetak (Saat Status Disetujui / ACC)
              </h3>
              <p className="text-xs text-slate-500">
                Tampilan ini mencerminkan hasil cetak A4 & unduhan PDF setelah pengajuan izin disetujui oleh Admin/Pimpinan.
              </p>
            </div>
            {hasUnsavedChanges && (
              <span className="text-xs font-semibold text-amber-700">
                Ada perubahan belum disimpan
              </span>
            )}
          </div>

          <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto">
            <div
              className="min-w-[540px] max-w-[190mm] mx-auto bg-white p-5 sm:p-7 border border-slate-300 shadow-xs text-black"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {/* Kop Surat */}
              <div className="flex items-center justify-between gap-4 pb-2.5 border-b-[3px] border-black relative">
                <div
                  className="absolute left-0 right-0 -bottom-[6px] border-b border-black"
                  aria-hidden="true"
                />
                <div className="w-20 h-22 flex items-center justify-center shrink-0">
                  <LogoPemprovJatim customUrl={logoProvinsiUrl} className="w-18 h-20" />
                </div>
                <div className="flex-1 text-center leading-tight">
                  <div className="text-[11.5pt] font-bold uppercase tracking-wide">
                    {KOP_SURAT_RESMI.pemerintah}
                  </div>
                  <div className="text-[11.5pt] font-bold uppercase tracking-wide">
                    {KOP_SURAT_RESMI.dinas}
                  </div>
                  <div className="text-[15pt] font-bold uppercase tracking-tight mt-0.5">
                    {KOP_SURAT_RESMI.sekolah}
                  </div>
                  <div className="text-[9pt] mt-1">{KOP_SURAT_RESMI.alamat}</div>
                  <div className="text-[9pt]">{KOP_SURAT_RESMI.telepon}</div>
                  <div className="text-[9pt]">
                    Laman {KOP_SURAT_RESMI.laman} &nbsp;|&nbsp; Pos-el {KOP_SURAT_RESMI.posEl}
                  </div>
                  <div className="text-[9pt] font-bold">NPSN: {KOP_SURAT_RESMI.npsn}</div>
                </div>
                <div className="w-20 h-22 flex items-center justify-center shrink-0">
                  <LogoSmknTegalsari customUrl={logoSekolahUrl} className="w-18 h-20" />
                </div>
              </div>

              <div className="py-5 text-center text-[10pt] text-slate-400 italic">
                — Isi surat keterangan izin resmi {INFO_SEKOLAH.nama} —
              </div>

              {/* Dua Kolom Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 text-[11pt]">
                {/* Kiri: Kepala Sekolah */}
                <div className="text-left">
                  <p>Mengetahui,</p>
                  <p>Kepala SMK Negeri 1 Tegalsari</p>
                  <div className="relative h-18 flex items-center">
                    <img
                      src={ttdKepsekUrl || INFO_SEKOLAH.ttdKepsekDefaultUrl}
                      alt="Pratinjau TTD Kepala Sekolah"
                      className="h-22 w-auto max-w-none object-contain mix-blend-multiply -ml-2 pointer-events-none select-none"
                    />
                  </div>
                  <p className="relative z-10 font-bold underline underline-offset-2">
                    {namaKepsek || INFO_SEKOLAH.kepalaSekolah}
                  </p>
                  <p className="relative z-10 tabular-nums">
                    NIP. {nipKepsek || INFO_SEKOLAH.nipKepalaSekolah}
                  </p>
                </div>

                {/* Kanan: Koordinator Waka SDM */}
                <div className="text-left pl-6">
                  <p>Banyuwangi, 17 November 2026</p>
                  <p>Koordinator Waka SDM,</p>
                  <div className="relative h-18 flex items-center">
                    {ttdWakaSdmUrl && (
                      <img
                        src={ttdWakaSdmUrl}
                        alt="Pratinjau TTD Koordinator Waka SDM"
                        className="h-18 w-auto max-w-full object-contain mix-blend-multiply -ml-1 pointer-events-none select-none"
                      />
                    )}
                  </div>
                  <p className="relative z-10 font-bold underline underline-offset-2">
                    {namaWakaSdm || INFO_SEKOLAH.koordinatorSdm}
                  </p>
                  <p className="relative z-10 tabular-nums">
                    NIP. {nipWakaSdm || INFO_SEKOLAH.nipKoordinatorSdm}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Simpan & Reset */}
        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan Semua ke Bawaan</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Pengaturan</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
