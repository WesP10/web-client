import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '@/components/auth/Login';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { DeviceManager } from '@/pages/DeviceManager';
import { LiveTelemetry } from '@/pages/LiveTelemetry';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/devices" element={<DeviceManager />} />
                  <Route path="/telemetry" element={<LiveTelemetry />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

