// Utilitas untuk menerjemahkan label ke tampilan yang user-friendly

export const translateNoiseSource = (source: string): string => {
  const translations: { [key: string]: string } = {
    // Status maintenance
    "sedang dalam perbaikan": "Sedang dalam perbaikan",

    // Label bahasa Indonesia
    gonggongan_anjing: "Gonggongan Anjing",
    anak_bermain: "Anak-anak Bermain",
    klakson_kendaraan: "Klakson Kendaraan",
    ac_outdoor: "AC Outdoor",
    musik_jalanan: "Musik Jalanan",
    petasan_kembang_api: "Petasan/Kembang Api",
    sirine_ambulans: "Sirine Ambulans",
    mesin_kendaraan: "Mesin Kendaraan",
    alat_berat_konstruksi: "Alat Berat Konstruksi",
    pengeboran_jalan: "Pengeboran Jalan",
    tidak_diketahui: "Tidak Diketahui",

    // Label bahasa Inggris lama (untuk backward compatibility)
    dog_bark: "Gonggongan Anjing",
    children_playing: "Anak-anak Bermain",
    car_horn: "Klakson Kendaraan",
    air_conditioner: "AC Outdoor",
    street_music: "Musik Jalanan",
    gun_shot: "Petasan/Kembang Api",
    siren: "Sirine Ambulans",
    engine_idling: "Mesin Kendaraan",
    jackhammer: "Alat Berat Konstruksi",
    drilling: "Pengeboran Jalan",
    unknown: "Tidak Diketahui",
  };

  return translations[source] || source;
};

export const translateHealthImpact = (impact: string): string => {
  const translations: { [key: string]: string } = {
    // Status maintenance
    "sedang dalam perbaikan": "Sedang dalam perbaikan",

    // Label bahasa Indonesia dari backend
    Ringan: "Ringan",
    Sedang: "Sedang",
    Tinggi: "Tinggi",
    Berbahaya: "Berbahaya",

    // Label bahasa Inggris lama (untuk backward compatibility)
    Low: "Ringan",
    Moderate: "Sedang",
    High: "Tinggi",
    Severe: "Berbahaya",
  };

  return translations[impact] || impact;
};

export const getHealthImpactDescription = (impact: string): string => {
  const descriptions: { [key: string]: string } = {
    // Status maintenance
    "sedang dalam perbaikan":
      "Fitur analisis dampak kesehatan sedang dalam perbaikan dan akan segera tersedia kembali.",

    Ringan:
      "Dampak minimal terhadap kesehatan. Tingkat kebisingan masih dalam batas normal.",
    Sedang: "Dapat menyebabkan gangguan ringan seperti kesulitan konsentrasi.",
    Tinggi:
      "Berisiko menyebabkan stres, gangguan tidur, dan penurunan produktivitas.",
    Berbahaya:
      "Sangat berisiko terhadap kesehatan. Dapat menyebabkan gangguan pendengaran dan masalah kesehatan serius.",

    // Backward compatibility
    Low: "Dampak minimal terhadap kesehatan. Tingkat kebisingan masih dalam batas normal.",
    Moderate:
      "Dapat menyebabkan gangguan ringan seperti kesulitan konsentrasi.",
    High: "Berisiko menyebabkan stres, gangguan tidur, dan penurunan produktivitas.",
    Severe:
      "Sangat berisiko terhadap kesehatan. Dapat menyebabkan gangguan pendengaran dan masalah kesehatan serius.",
  };

  return descriptions[impact] || "Deskripsi tidak tersedia";
};

export const getNoiseSourceIcon = (source: string): string => {
  const icons: { [key: string]: string } = {
    // Status maintenance
    "sedang dalam perbaikan": "🔧",

    gonggongan_anjing: "🐕",
    anak_bermain: "👶",
    klakson_kendaraan: "🚗",
    ac_outdoor: "❄️",
    musik_jalanan: "🎵",
    petasan_kembang_api: "🎆",
    sirine_ambulans: "🚨",
    mesin_kendaraan: "🚙",
    alat_berat_konstruksi: "🚧",
    pengeboran_jalan: "⚒️",
    tidak_diketahui: "❓",

    // Backward compatibility
    dog_bark: "🐕",
    children_playing: "👶",
    car_horn: "🚗",
    air_conditioner: "❄️",
    street_music: "🎵",
    gun_shot: "🎆",
    siren: "🚨",
    engine_idling: "🚙",
    jackhammer: "🚧",
    drilling: "⚒️",
    unknown: "❓",
  };

  return icons[source] || "🔊";
};
