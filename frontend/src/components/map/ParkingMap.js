import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Fix pour les icônes Leaflet avec Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Icône personnalisée pour les parkings
const parkingIcon = new L.Icon({
  iconUrl: '/parking-icon.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: '/user-location.png',
  iconSize: [25, 25],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const ParkingMap = ({ 
  center = [34.6814, -1.9086], // Oujda Par default
  zoom = 12,
  height = '500px',
  radius = 5, // km
  showUserLocation = false,
  onParkingSelect,
  onMapClick,
  selectedPosition,
  parkings: externalParkings,
  interactive = true
}) => {
  const [userLocation, setUserLocation] = useState(null);
  const [parkings, setParkings] = useState(externalParkings || []);
  const [loading, setLoading] = useState(!externalParkings);
  const [error, setError] = useState(null);

  // Récupérer la position de l'utilisateur
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error('Erreur géolocation:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [showUserLocation]);

  // Récupérer les parkings si non fournis
  useEffect(() => {
    if (!externalParkings && showUserLocation && userLocation) {
      fetchNearbyParkings();
    } else if (!externalParkings && !showUserLocation) {
      fetchAllParkings();
    }
  }, [userLocation, externalParkings, showUserLocation]);

  const fetchNearbyParkings = async () => {
    try {
      setLoading(true);
      const [lat, lng] = userLocation;
      const response = await axios.get('/parkings/nearby', {
        params: { lat, lng, radius }
      });
      setParkings(response.data.data);
    } catch (err) {
      setError('Erreur lors du chargement des parkings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllParkings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/parkings', {
        params: { limit: 50 }
      });
      setParkings(response.data.data);
    } catch (err) {
      setError('Erreur lors du chargement des parkings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // the clickhandler map (form create new Parking)
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if(onMapClick) {
          onMapClick(e.latlng)
        }
      }
    });
    return null;
  }

  const mapCenter = userLocation || center;

  if (loading) {
    return (
      <div 
        className="d-flex justify-content-center align-items-center bg-light" 
        style={{ height, borderRadius: '10px' }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement de la carte...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: '10px', overflow: 'hidden' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler />

        {/* Marker for selected location (create parking) */}
        {selectedPosition && (
          <Marker position={[selectedPosition.lat, selectedPosition.lng]}>
            <Popup>Emplacement du parking</Popup>
          </Marker>
        )}

        {/* Position de l'utilisateur */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <strong>Votre position</strong>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={radius * 1000}
              pathOptions={{ color: 'blue', fillColor: '#007bff', fillOpacity: 0.1 }}
            />
          </>
        )}

        {/* Marqueurs des parkings */}
        {parkings?.map((parking) => {
          if (!parking.location?.coordinates) return null;
          
          const position = [
            parking.location.coordinates[1], 
            parking.location.coordinates[0]
          ];

          return (
            <Marker
              key={parking._id}
              position={position}
              icon={parkingIcon}
              eventHandlers={{
                click: () => onParkingSelect && onParkingSelect(parking)
              }}
            >
              <Popup>
                <div>
                  <h6>{parking.name}</h6>
                  <p className="mb-1">
                    <small>
                      {parking.address?.street}, {parking.address?.city}
                    </small>
                  </p>
                  <p className="mb-1">
                    <strong>{parking.hourlyRate}€/h</strong>
                    {parking.dailyRate && ` • ${parking.dailyRate}€/jour`}
                  </p>
                  <p className="mb-1">
                    <small className={parking.availableSpots > 0 ? 'text-success' : 'text-danger'}>
                      {parking.availableSpots} places disponibles
                    </small>
                  </p>
                  <div className="mt-2">
                    <a 
                      href={`/parkings/${parking._id}`}
                      className="btn btn-sm btn-primary w-100"
                    >
                      Voir détails
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {error && (
        <div className="alert alert-warning mt-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default ParkingMap;