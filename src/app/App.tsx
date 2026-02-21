import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';
import { VerificationProvider } from './context/VerificationContext';

function App() {
  return (
    <VerificationProvider>
      <RouterProvider router={router} />
      <Toaster theme="dark" position="top-right" richColors />
    </VerificationProvider>
  );
}

export default App;
