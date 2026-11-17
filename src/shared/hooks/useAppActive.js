import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// true selama aplikasi berada di foreground. Canvas 3D memakai ini untuk berhenti mengirim frame
// ketika aplikasi masuk background: surface GL tetap hidup di Android, jadi tanpa ini GPU terus
// menggambar (baterai boros + perangkat panas) padahal tidak ada yang terlihat.
export default function useAppActive() {
  const [active, setActive] = useState(() => {
    const state = AppState.currentState;
    // null terjadi saat cold start di Android sebelum status pertama diketahui → anggap aktif.
    return state !== 'background' && state !== 'inactive';
  });
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub?.remove?.();
  }, []);
  return active;
}
