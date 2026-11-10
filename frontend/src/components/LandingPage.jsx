import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../services/api';
import { Droplet, Wind, ShieldAlert, Search, MapPin } from 'lucide-react';
import Header from './Header';
import './Header.css';

// --- custom hook for responsive breakpoint ---
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query, matches]);
  return matches;
};

// --- Marker icon logic (unchanged) ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getMarkerIcon = (reading, type) => {
  let color = 'green';
  if (reading) {
    const alerts = reading.alerts || [];
    if (alerts.length > 0) color = 'red';
    else if (reading.ph && (reading.ph < 6.5 || reading.ph > 8.5)) color = 'orange';
    else if (reading.co2 && reading.co2 > 1000) color = 'orange';
  }
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">${type === 'water' ? '💧' : '🌫️'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState([]);
  const [readings, setReadings] = useState({});
  const isMobile = useMediaQuery('(max-width: 768px)');

  // --- data fetching (unchanged) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sensorRes, readingRes] = await Promise.all([
          API.get('/sensors'),
          API.get('/readings/latest')
        ]);
        setSensors(sensorRes.data);
        const readingMap = {};
        readingRes.data.forEach(r => { readingMap[r.sensorId] = r; });
        setReadings(readingMap);
      } catch (err) {
        console.error('Error fetching data', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAlertStatus = (reading) => {
    if (!reading) return { level: 'unknown', message: 'No data' };
    const alerts = reading.alerts || [];
    if (alerts.length > 0) return { level: 'danger', message: alerts.join(', ') };
    if (reading.ph && (reading.ph < 6.5 || reading.ph > 8.5)) 
      return { level: 'warning', message: 'pH out of range' };
    if (reading.co2 && reading.co2 > 1000) 
      return { level: 'warning', message: 'CO₂ high' };
    return { level: 'normal', message: 'All parameters normal' };
  };

  const navigateToSensor = (type) => {
    let targetSensor = null;
    if (type === 'alert') {
      targetSensor = sensors.find(s => {
        const reading = readings[s._id];
        return reading && getAlertStatus(reading).level !== 'normal';
      });
    } else {
      targetSensor = sensors.find(s => s.type === type);
    }
    if (targetSensor) {
      const cleanId = targetSensor._id.toString().trim();
      navigate(`/sensor/${cleanId}`);
    } else {
      alert(`No ${type} sensors are currently available.`);
    }
  };

  const handleMarkerClick = (sensorId) => {
    navigate(`/sensor/${sensorId}`);
  };

  // --- Styles for desktop vs mobile ---
  const containerStyle = {
    height: '100vh',
    width: '100vw',
    position: 'relative',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  // Map container: full height on desktop, half height (or flexible) on mobile
  const mapContainerStyle = {
    flex: isMobile ? '1' : '1',    // both take equal space in flex column
    position: 'relative',
    background: '#e6f3ff',
    minHeight: isMobile ? '40vh' : '100vh', // on mobile, map takes at least 40% of viewport
  };

  // Card container: absolute centered on desktop, relative (bottom) on mobile
  const cardContainerStyle = {
    position: isMobile ? 'relative' : 'absolute',
    top: isMobile ? 'auto' : '50%',
    left: isMobile ? 'auto' : '50%',
    transform: isMobile ? 'none' : 'translate(-50%, -50%)',
    zIndex: 1000,
    background: 'white',
    padding: isMobile ? '24px 20px' : '40px',
    borderRadius: '16px',
    boxShadow: isMobile ? '0 -4px 20px rgba(0,0,0,0.08)' : '0 10px 40px rgba(0,0,0,0.15)',
    width: isMobile ? '100%' : '550px',
    maxWidth: '600px',
    margin: isMobile ? '0' : '0 auto',
    boxSizing: 'border-box',
    textAlign: 'center',
    overflowY: isMobile ? 'auto' : 'visible',
    flexShrink: 0,
  };

  // On mobile, card sits below the map and can scroll if content overflows
  // We also need to ensure the card doesn't get cut off – we'll give it a max-height if needed.

  return (
    <div style={containerStyle}>
      {/* --- HEADER (absolute overlay on both desktop & mobile) --- */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Header />
      </div>

      {/* --- MAP (flex child) --- */}
      <div style={mapContainerStyle}>
        <MapContainer
          center={[17.6, 121.7]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(map) => {
            // invalidate size on resize to avoid map glitches
            setTimeout(() => map.invalidateSize(), 100);
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {sensors.map(sensor => {
            const reading = readings[sensor._id];
            const icon = getMarkerIcon(reading, sensor.type);
            return (
              <Marker 
                key={sensor._id} 
                position={[sensor.latitude, sensor.longitude]}
                icon={icon}
                eventHandlers={{ click: () => handleMarkerClick(sensor._id) }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* --- CARD (absolute on desktop, relative below map on mobile) --- */}
      <div style={cardContainerStyle}>
        <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          Monitor Your Environment
        </h1>
        <p style={{ fontSize: '14px', color: '#555', marginBottom: '24px' }}>
          Assess real-time Water and Air quality parameters and what you can do about unexpected changes.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #ccc',
          borderRadius: '50px',
          padding: '6px 6px 6px 16px',
          width: isMobile ? '90%' : '80%',
          margin: '0 auto 24px auto',
        }}>
          <MapPin size={40} color="#fff" fill="#0667f5" />
          <input
            type="text"
            placeholder="Search Location"
            style={{ border: 'none', outline: 'none', flex: 1, padding: '8px', fontSize: '14px' }}
          />
          <button style={{
            background: '#0667f5',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Search size={18} />
          </button>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Check Sensor Updates</h3>
        
        <div style={{
          position: 'relative',
          display: 'inline-block',
          margin: '0 auto 20px auto',
          background: '#e3f2fd',
          color: '#0667f5',
          padding: '4px 16px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
          All features are in BETA
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            width: '8px',
            height: '8px',
            background: '#ff1744',
            borderRadius: '50%',
          }}></span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: isMobile ? '15px' : '25px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}>
          {[
            { icon: Droplet, label: 'Water Quality', type: 'water' },
            { icon: Wind, label: 'Air Quality', type: 'air' },
            { icon: ShieldAlert, label: 'Alert Status', type: 'alert' },
          ].map((item) => (
            <div
              key={item.type}
              onClick={() => navigateToSensor(item.type)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                minWidth: '60px',
              }}
            >
              <div style={{
                width: isMobile ? '60px' : '70px',
                height: isMobile ? '60px' : '70px',
                background: '#0667f5',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}>
                <item.icon size={isMobile ? 28 : 34} />
              </div>
              <span style={{ fontSize: '13px', marginTop: '6px' }}>{item.label}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: '#666' }}>More sensor insights coming soon!</p>
      </div>
    </div>
  );
};

export default LandingPage;