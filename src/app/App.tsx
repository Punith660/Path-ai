import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { Toaster } from 'sonner';
import { VerificationProvider } from './context/VerificationContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <RouterProvider router={router} />
        <Toaster theme="dark" position="top-right" richColors />
      </VerificationProvider>
    </AuthProvider>
  );
}

export default App;
