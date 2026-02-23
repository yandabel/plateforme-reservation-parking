import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (token && user && !socket) {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
      });

      newSocket.on('connect', () => {
        console.log('Connecté au serveur Socket.io');
        newSocket.emit('join-room', user.id);
        
        if (user.role === 'admin') {
          newSocket.emit('join-room', 'admin-room');
        }
      });

      newSocket.on('new-reservation', (data) => {
        toast.info(`Nouvelle réservation #${data.reservationRef}`, {
          autoClose: false,
          onClick: () => window.location.href = `/reservations/${data.reservationId}`
        });
      });

      newSocket.on('reservation-cancelled', (data) => {
        toast.warning(`Réservation #${data.reservationRef} annulée`, {
          autoClose: false
        });
      });

      newSocket.on('checkin-confirmed', (data) => {
        toast.success(`Check-in confirmé pour la réservation`, {
          autoClose: false,
          onClick: () => window.location.href = `/reservations/${data.reservationId}`
        });
      });

      newSocket.on('checkout-confirmed', (data) => {
        toast.success(`Check-out confirmé. ${data.extraHours > 0 ? `Heures supplémentaires: ${data.extraHours}h (${data.extraCost}€)` : ''}`, {
          autoClose: false
        });
      });

      newSocket.on('refund-processed', (data) => {
        toast.info(`Remboursement de ${data.amount}€ effectué`, {
          autoClose: false
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Déconnecté du serveur Socket.io');
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    }
  }, [token, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};