import AppNavigator from './src/application/navigation/AppNavigator';
import { AuthProvider } from './src/features/auth/data/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
