import React from 'react';

/**
 * SVG String untuk Logo Pemerintah Provinsi Jawa Timur (kiri kop surat)
 * Digunakan baik untuk rendering langsung maupun konversi ke PNG pada ekspor PDF.
 */
export const LOGO_JATIM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 136" width="120" height="136">
  <defs>
    <linearGradient id="shieldJatim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <!-- Perisai Utama -->
  <path d="M12 14 L60 6 L108 14 L104 78 C101 103 82 119 60 128 C38 119 19 103 16 78 Z" fill="#ffffff" stroke="#111827" stroke-width="3.5"/>
  <path d="M18 19 L60 12 L102 19 L98 76 C95 98 79 112 60 120 C41 112 25 98 22 76 Z" fill="url(#shieldJatim)" stroke="#f59e0b" stroke-width="2"/>
  <!-- Bintang Emas di Puncak -->
  <polygon points="60,20 63.5,29 73,29 65.5,34.5 68.5,43.5 60,38 51.5,43.5 54.5,34.5 47,29 56.5,29" fill="#fbbf24" stroke="#78350f" stroke-width="0.8"/>
  <!-- Tugu Pahlawan -->
  <polygon points="56,78 64,78 61.5,46 58.5,46" fill="#f8fafc" stroke="#0f172a" stroke-width="1"/>
  <rect x="50" y="78" width="20" height="5" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>
  <rect x="45" y="83" width="30" height="5" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
  <!-- Gunung & Sungai -->
  <path d="M24 88 L40 68 L52 84 L70 70 L96 88 Z" fill="#15803d" opacity="0.9"/>
  <path d="M23 89 Q60 95 97 89 L94 100 Q60 112 26 100 Z" fill="#38bdf8"/>
  <path d="M28 96 Q60 102 92 96" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Padi & Kapas -->
  <path d="M24 34 C19 52 22 76 34 95" fill="none" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
  <path d="M96 34 C101 52 98 76 86 95" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
  <!-- Pita Bawah -->
  <path d="M22 104 L98 104 L94 118 L26 118 Z" fill="#ffffff" stroke="#111827" stroke-width="1.5"/>
  <text x="60" y="113.5" text-anchor="middle" font-family="Times New Roman, serif" font-size="8.5" font-weight="bold" fill="#111827">JAWA TIMUR</text>
</svg>`;

/**
 * SVG String untuk Logo SMK Negeri 1 Tegalsari (kanan kop surat)
 */
export const LOGO_SMKN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 136" width="120" height="136">
  <!-- Perisai Segi Lima Pendidikan -->
  <path d="M60 8 L106 24 L98 84 C94 105 78 120 60 128 C42 120 26 105 22 84 L14 24 Z" fill="#1e3a8a" stroke="#0f172a" stroke-width="3"/>
  <path d="M60 14 L100 28 L93 82 C89 100 75 113 60 120 C45 113 31 100 27 82 L20 28 Z" fill="#ffffff" stroke="#f59e0b" stroke-width="2"/>
  <!-- Roda Gigi Vokasi -->
  <circle cx="60" cy="54" r="21" fill="none" stroke="#1e3a8a" stroke-width="5" stroke-dasharray="6 4"/>
  <circle cx="60" cy="54" r="15" fill="#eff6ff" stroke="#1e3a8a" stroke-width="2"/>
  <!-- Obor / Pena Pendidikan -->
  <path d="M60 28 C64 34 65 39 60 44 C55 39 56 34 60 28 Z" fill="#ea580c"/>
  <rect x="58" y="44" width="4" height="12" fill="#1e3a8a"/>
  <!-- Buku Terbuka -->
  <path d="M36 68 Q48 63 60 69 Q72 63 84 68 L84 85 Q72 80 60 86 Q48 80 36 85 Z" fill="#1d4ed8" stroke="#0f172a" stroke-width="1.4"/>
  <line x1="60" y1="69" x2="60" y2="86" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Bintang Atas -->
  <polygon points="60,18 62,23 67,23 63,26 64.5,31 60,28 55.5,31 57,26 53,23 58,23" fill="#f59e0b"/>
  <!-- Pita Identitas Sekolah -->
  <path d="M22 93 L98 93 L94 109 L26 109 Z" fill="#1e3a8a" stroke="#0f172a" stroke-width="1.2"/>
  <text x="60" y="103.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" fill="#ffffff">SMKN 1 TEGALSARI</text>
</svg>`;

interface LogoProps {
  customUrl?: string;
  className?: string;
}

export const LogoPemprovJatim: React.FC<LogoProps> = ({ customUrl, className = 'w-16 h-18' }) => {
  if (customUrl) {
    return (
      <img
        src={customUrl}
        alt="Logo Pemerintah Provinsi Jawa Timur"
        className={`${className} object-contain`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className={className}
      aria-label="Logo Pemerintah Provinsi Jawa Timur"
      dangerouslySetInnerHTML={{ __html: LOGO_JATIM_SVG }}
    />
  );
};

export const LogoSmknTegalsari: React.FC<LogoProps> = ({ customUrl, className = 'w-16 h-18' }) => {
  if (customUrl) {
    return (
      <img
        src={customUrl}
        alt="Logo SMK Negeri 1 Tegalsari"
        className={`${className} object-contain`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className={className}
      aria-label="Logo SMK Negeri 1 Tegalsari"
      dangerouslySetInnerHTML={{ __html: LOGO_SMKN_SVG }}
    />
  );
};
