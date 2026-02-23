import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ParkingList from './pages/parking/ParkingList';
import ParkingDetail from './pages/parking/ParkingDetail';
import ParkingCreate from './pages/parking/ParkingCreate';
import MyReservations from './pages/reservation/MyReservations';
import ReservationDetail from './pages/reservation/ReservationDetail';
import Profile from './pages/user/Profile';
import MyParkings from './pages/parking/MyParkings';
import Dashboard from './pages/admin/Dashboard';
import NotFound from './pages/NotFound';
import VerifyEmail from './pages/auth/VerifyEmail';

// Styles
import './App.css';
import EditParking from './pages/parking/EditParking';

// Initialiser Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function App() {
  return (
    <Elements stripe={stripePromise}>
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Routes publiques */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="parkings" element={<ParkingList />} />
            <Route path="parkings/:id" element={<ParkingDetail />} />
            <Route path="/auth/verify-email/:token" element={<VerifyEmail />} />
            
            {/* Routes protégées - Client */}
            <Route path="profile" element={
              <ProtectedRoute allowedRoles={['client', 'proprietaire', 'admin']}>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="reservations" element={
              <ProtectedRoute allowedRoles={['client', 'proprietaire', 'admin']}>
                <MyReservations />
              </ProtectedRoute>
            } />
            <Route path="reservations/:id" element={
              <ProtectedRoute allowedRoles={['client', 'proprietaire', 'admin']}>
                <ReservationDetail />
              </ProtectedRoute>
            } />
            
            {/* Routes protégées - Propriétaire */}
            <Route path="my-parkings" element={
              <ProtectedRoute allowedRoles={['proprietaire', 'admin']}>
                <MyParkings />
              </ProtectedRoute>
            } />
            <Route path="parkings/create" element={
              <ProtectedRoute allowedRoles={['proprietaire', 'admin']}>
                <ParkingCreate />
              </ProtectedRoute>
            } />
            <Route path="edit-parking/:id" element={
              <ProtectedRoute allowedRoles={['proprietaire', 'admin']}>
                <EditParking />
              </ProtectedRoute>
            } />
            
            {/* Routes protégées - Admin */}
            <Route path="admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SocketProvider>
    </AuthProvider>
    </Elements>
  );
}

export default App;