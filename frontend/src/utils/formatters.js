import { format, formatDistance, formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (date, pattern = 'dd/MM/yyyy') => {
  if (!date) return '';
  return format(new Date(date), pattern, { locale: fr });
};

export const formatDateTime = (date) => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

export const formatTime = (date) => {
  return formatDate(date, 'HH:mm');
};

export const formatDuration = (hours) => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (hours < 24) {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours} heure${wholeHours > 1 ? 's' : ''}`;
    }
    return `${wholeHours}h${minutes.toString().padStart(2, '0')}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) {
      return `${days} jour${days > 1 ? 's' : ''}`;
    }
    return `${days} jour${days > 1 ? 's' : ''} ${remainingHours}h`;
  }
};

export const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(price);
};

export const formatAddress = (address) => {
  if (!address) return '';
  const parts = [
    address.street,
    address.postalCode,
    address.city,
    address.country
  ].filter(Boolean);
  return parts.join(', ');
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
  }
  return phone;
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance en km
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    confirmed: 'success',
    active: 'primary',
    completed: 'info',
    cancelled: 'danger',
    no_show: 'dark'
  };
  return colors[status] || 'secondary';
};

export const getStatusText = (status) => {
  const texts = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    active: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée',
    no_show: 'Non présenté'
  };
  return texts[status] || status;
};