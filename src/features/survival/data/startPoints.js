// Titik awal permainan per environment: Twini selalu muncul di gerbang/pelataran awal yang aman.
// Koordinat sama dengan layout zona bersama (misi tidak berubah antar environment).
export const START_POINTS = {
  monas: { id: 'monas', label: 'Gerbang Monas', position: [-6, 30], note: 'Mulai dari pelataran gerbang selatan.' },
  smartcity: { id: 'smartcity', label: 'Gerbang Kota Pintar', position: [-6, 30], note: 'Mulai dari plaza gerbang kota pintar.' },
  coastal: { id: 'coastal', label: 'Gerbang Pantai', position: [-6, 30], note: 'Mulai dari promenade gerbang pantai.' },
  highland: { id: 'highland', label: 'Gerbang Lembah', position: [-6, 30], note: 'Mulai dari gerbang lembah.' },
};

export const startPointFor = (envId) => START_POINTS[envId] || START_POINTS.monas;
