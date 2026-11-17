import React, { useState, useMemo } from 'react';
import { Send, FileWarning } from 'lucide-react';
import { Pegawai } from '../types/attendance';
import { FormPengajuanIzin } from './FormPengajuanIzin';
import { LupaAbsenView } from './LupaAbsenView';
import { getStoredLupaAbsen } from '../utils/storage';

interface AjukanIzinHubProps {
  currentUser: Pegawai;
  allPegawai: Pegawai[];
  onSuccessSubmitIzin: () => void;
}

export const AjukanIzinHub: React.FC<AjukanIzinHubProps> = ({
  currentUser,
  allPegawai,
  onSuccessSubmitIzin,
}) => {
  const [mode, setMode] = useState<'izin' | 'lupa_absen'>('izin');
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'pimpinan';

  const waitingLupaAbsenCount = useMemo(() => {
    if (!isAdmin) return 0;
    return getStoredLupaAbsen().filter((item) => item.status === 'menunggu_persetujuan').length;
  }, [isAdmin, mode]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Terpadu + Pilihan Jenis Pengajuan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'izin'
              ? 'Formulir Pengajuan Permintaan Izin / Dinas / Cuti'
              : 'Lupa Absen & Surat Pernyataan SI-HADIR'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {mode === 'izin'
              ? 'Pengajuan izin resmi Guru & Pegawai SMKN 1 Tegalsari. Status kehadiran baru berubah setelah di-ACC oleh Admin atau Kepala Sekolah.'
              : isAdmin
              ? 'Kelola pengajuan lupa presensi guru/pegawai, setujui/tolak kronologi, rekapitulasi bulanan, dan cetak surat A4 resmi.'
              : 'Ajukan surat pernyataan lupa presensi masuk/pulang, pantau status persetujuan admin, dan cetak PDF resmi.'}
          </p>
        </div>

        {/* Segmented Mode Switcher: Izin/Cuti/Dinas vs Lupa Absen */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMode('izin')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === 'izin'
                ? 'bg-white text-blue-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Izin / Dinas / Cuti</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('lupa_absen')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === 'lupa_absen'
                ? 'bg-white text-blue-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileWarning className="w-3.5 h-3.5" />
            <span>Lupa Absen</span>
            {isAdmin && waitingLupaAbsenCount > 0 && (
              <span className="font-mono text-[11px] font-bold text-amber-700 tabular-nums">
                ({waitingLupaAbsenCount})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Konten Sesuai Pilihan */}
      {mode === 'izin' ? (
        <div className="max-w-4xl mx-auto">
          <FormPengajuanIzin
            currentUser={currentUser}
            allPegawai={allPegawai}
            onSuccessSubmit={onSuccessSubmitIzin}
            embedded
          />
        </div>
      ) : (
        <LupaAbsenView
          currentUser={currentUser}
          allPegawai={allPegawai}
          embedded
        />
      )}
    </div>
  );
};
