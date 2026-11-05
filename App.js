import AppNavigator from './src/application/navigation/AppNavigator';
import { AuthProvider } from './src/features/auth/data/AuthContext';
import { ThemeProvider } from './src/shared/theme/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
