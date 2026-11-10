import React, { useEffect, useState, useRef } from 'react'; // ADDED useRef
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format, subHours } from 'date-fns';
import API from '../services/api';
import { Droplet, Search, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

// --- FIX FOR LEAFLET MISSING PIN ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom hook to detect mobile viewport
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

const SensorDetail = () => {
  const { sensorId } = useParams();
  const navigate = useNavigate();

  // --- STATE ---
  const [sensor, setSensor] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [openAccordion, setOpenAccordion] = useState('1 Hour');
  
  // --- MAP REF & SEARCH STATE ---
  const mapRef = useRef(null); // REPLACED state with useRef for React Leaflet v4+
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const timeRangeOptions = { '1h': 1, '3h': 3, '6h': 6, '12h': 12, '24h': 24 };

  // --- RESPONSIVE DETECTION ---
  const isMobile = useMediaQuery('(max-width: 768px)');

  // --- COLOR HELPERS ---
  const interpolateColor = (c1, c2, factor) => {
    let r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    let r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    let r = Math.round(r1 + (r2 - r1) * factor);
    let g = Math.round(g1 + (g2 - g1) * factor);
    let b = Math.round(b1 + (b2 - b1) * factor);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const generateGradientColors = (startColor, endColor, steps) => {
    let colors = [];
    for (let i = 0; i <= steps; i++) {
      colors.push(interpolateColor(startColor, endColor, i / steps));
    }
    return colors;
  };

  const pH_COLORS = [
    '#ff0000', '#ff4d00', '#ff9900', '#ffcc00', '#ffff00',
    '#b8e600', '#80e500', '#00cc44', '#00b3b3', '#3399ff',
    '#3333ff', '#6600cc', '#9900cc', '#cc66cc', '#ff66ff'
  ];

  const doColors = generateGradientColors('#ffff00', '#00ff00', 10);
  const turbidityColors = generateGradientColors('#ff0000', '#0000ff', 10);
  const tempColors = generateGradientColors('#0000ff', '#ff0000', 5);

  const paramConfig = {
    co2: { label: 'CO₂', color: '#9b59b6', unit: 'ppm' },
    no2: { label: 'NO₂', color: '#e84393', unit: 'ppb' },
  };

  // --- API FETCH ---
    // Replace your current API Fetch useEffect with this:
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Only show loading on first load
        const cleanSensorId = sensorId.trim();

        const sensorRes = await API.get(`/sensors/${cleanSensorId}`);
        setSensor(sensorRes.data);

        const readingsRes = await API.get(`/readings/sensor/${cleanSensorId}`);
        setReadings(readingsRes.data);
      } catch (err) {
        console.error('Error fetching sensor data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData(); // Initial fetch
    
    // Silent refresh every 10 seconds
    const interval = setInterval(fetchData, 10000); 
    
    return () => clearInterval(interval);
  }, [sensorId]);
  // --- IMPROVED SEARCH LOCATION FUNCTION ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return alert("Please enter a location.");
    
    // Access the map via mapRef.current
    const map = mapRef.current;
    if (!map) return alert("Map is still loading, please wait a moment.");
    
    setIsSearching(true);
    console.log("Searching for:", searchQuery);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Search Results:", data);

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        map.flyTo([parseFloat(lat), parseFloat(lon)], 15, {
          duration: 2
        });
      } else {
        alert("Location not found. Please try a different search (e.g. 'Manila' or 'Tuguegarao').");
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert("Failed to search location. Please check your internet connection or try again later.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- DATA FILTERING ---
  const getFilteredReadings = () => {
    const hours = timeRangeOptions[timeRange];
    const cutoffTime = subHours(new Date(), hours);
    return readings
      .filter(r => new Date(r.timestamp) >= cutoffTime)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const filteredReadings = getFilteredReadings();

  const getAverageValue = (paramKey) => {
    if (filteredReadings.length === 0) return null;
    const sum = filteredReadings.reduce((acc, curr) => acc + (curr[paramKey] || 0), 0);
    return (sum / filteredReadings.length);
  };

  const getParameters = () => {
    if (!sensor) return [];
    return sensor.type === 'water' ? ['ph', 'turbidity', 'oxygen', 'temperature'] : ['co2', 'no2'];
  };

  const toggleAccordion = (title) => {
    setOpenAccordion(openAccordion === title ? null : title);
  };

  // --- SCALE BAR RENDERERS ---
  const renderScaleBar = (value, min, max, steps, colors, unit, label) => {
    let displayValue = value !== null ? value.toFixed(1) : '--';
    let activeIndex = 0;
    if (value !== null) {
      let clamped = Math.max(min, Math.min(max, value));
      let stepSize = (max - min) / steps;
      activeIndex = Math.round((clamped - min) / stepSize);
      activeIndex = Math.max(0, Math.min(steps, activeIndex));
    }

    return (
      <div style={{ width: '100%', marginTop: '8px', position: 'relative' }}>
        <div style={{ display: 'flex', width: '100%', height: '30px', borderRadius: '6px', overflow: 'hidden' }}>
          {colors.map((color, index) => {
            const valLabel = Math.round(min + (index / steps) * (max - min));
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  backgroundColor: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRight: index < steps ? '1px solid rgba(255,255,255,0.3)' : 'none',
                  position: 'relative'
                }}
              >
                {valLabel}
                {index === activeIndex && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '10px solid #333'
                  }}></div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '6px', fontSize: '13px', color: '#333' }}>
          {label}: <span style={{ color: '#0667f5' }}>{displayValue}</span> {unit}
        </div>
      </div>
    );
  };

  const renderPHScale = (value) => {
    let displayValue = value !== null ? value.toFixed(1) : '--';
    let activeIndex = 0;
    if (value !== null) {
      activeIndex = Math.max(0, Math.min(14, Math.round(value)));
    }

    return (
      <div style={{ width: '100%', marginTop: '8px', position: 'relative' }}>
        <div style={{ display: 'flex', width: '100%', height: '30px', borderRadius: '6px', overflow: 'hidden' }}>
          {pH_COLORS.map((color, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRight: index < 14 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                position: 'relative'
              }}
            >
              {index}
              {index === activeIndex && (
                <div style={{
                  position: 'absolute',
                  bottom: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '10px solid #333'
                }}></div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '6px', fontSize: '13px', color: '#333' }}>
          Current pH: <span style={{ color: '#0667f5' }}>{displayValue}</span>
        </div>
      </div>
    );
  };

  const renderParameterVisual = (paramKey, value) => {
    if (paramKey === 'ph') return renderPHScale(value);
    if (paramKey === 'oxygen') return renderScaleBar(value, 0, 10, 10, doColors, 'mg/L', 'Dissolved Oxygen');
    if (paramKey === 'turbidity') return renderScaleBar(value, 0, 500, 10, turbidityColors, 'NTU', 'Turbidity');
    if (paramKey === 'temperature') return renderScaleBar(value, 0, 25, 5, tempColors, '°C', 'Temperature');

    const config = paramConfig[paramKey];
    if (!config) return null;
    let displayValue = value !== null ? value.toFixed(1) : '--';
    return (
      <div style={{
        background: 'white',
        border: `2px solid ${config.color}`,
        borderRadius: '12px',
        padding: '16px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        minHeight: '80px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', textAlign: 'center' }}>
          {config.label}
        </span>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: config.color, marginTop: '4px' }}>
          {displayValue} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>{config.unit}</span>
        </span>
      </div>
    );
  };

  // --- Invalidate map size when layout changes ---
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, [isMobile]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><h2>Loading...</h2></div>;
  if (!sensor) return <div style={{ padding: 20 }}><h2>Sensor not found</h2><button onClick={() => navigate('/')}>Back</button></div>;

  // --- DYNAMIC STYLES ---
  const containerStyle = {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    flexDirection: isMobile ? 'column' : 'row',
    fontFamily: 'sans-serif',
  };

  const mapContainerStyle = {
    flex: isMobile ? '1' : '1',
    position: 'relative',
    background: '#e6f3ff',
    minHeight: isMobile ? '0' : 'auto',
  };

  const sidebarStyle = {
    flex: isMobile ? '1' : '1',
    background: 'white',
    padding: isMobile ? '12px 16px' : '16px 24px',
    overflowY: 'auto',
    borderLeft: isMobile ? 'none' : '1px solid #e5e7eb',
    borderTop: isMobile ? '1px solid #e5e7eb' : 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  return (
    <div style={containerStyle}>
      {/* --- LEFT / TOP: MAP --- */}
      <div style={mapContainerStyle}>
        <MapContainer
          center={[sensor.latitude, sensor.longitude]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef} // <--- USING REF INSTEAD OF whenCreated
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* --- THE PIN (MARKER) --- */}
          <Marker position={[sensor.latitude, sensor.longitude]}>
            <Popup>
              <strong>{sensor.name}</strong><br/>
              Type: {sensor.type.toUpperCase()}
            </Popup>
          </Marker>
          
        </MapContainer>
      </div>

      {/* --- RIGHT / BOTTOM: SIDEBAR --- */}
      <div style={sidebarStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            <img
              src="/images/logo_rs.png"
              alt="RiverSense"
              style={{
                width: isMobile ? '50px' : '70px',
                height: isMobile ? '50px' : '70px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
              <span style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: '700',
                color: '#0667f5',
                letterSpacing: '0.5px',
              }}>
                RiverSense
              </span>
              <span style={{
                fontSize: isMobile ? '14px' : '20px',
                fontWeight: '700',
                color: '#0667f5',
                letterSpacing: '0.5px',
              }}>
                Water Quality Monitoring
              </span>
            </div>
          </div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1px 0' }} />
        
        {/* --- SEARCH BAR --- */}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #c0c0c0', borderRadius: '50px', padding: '4px 6px 4px 12px', background: '#fff', width: 'auto' }}>
          <MapPin size={30} color="#fff" fill="#0667f5" />
          <input 
            type="text" 
            placeholder="Search Location (e.g. Tuguegarao)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ border: 'none', outline: 'none', flex: 1, padding: '4px', fontSize: '12px', background: 'transparent' }} 
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching}
            style={{ 
              background: isSearching ? '#90caf9' : '#0667f5', 
              border: 'none', 
              borderRadius: '50%', 
              width: '28px', 
              height: '28px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: isSearching ? 'wait' : 'pointer' 
            }}
          >
            <Search size={16} />
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#666', margin: '0', fontStyle: 'italic' }}>Tip: Search a location or drag the map to explore.</p>
        <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', margin: '0' }}>Water & Air Quality Monitoring</h2>
        <p style={{ fontSize: '11px', color: '#0667f5', margin: '0 0 12px 0' }}>
          Source: Real-time Water & Air Quality Sensor Data
        </p>

        {/* --- ACCORDIONS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['1 Hour', '3 Hours', '6 Hours', '12 Hours', '24 Hours'].map((timeFrame) => {
            const isOpen = openAccordion === timeFrame;
            const mappedTime = timeFrame.replace(' Hours', 'h').replace(' Hour', 'h');

            return (
              <div key={timeFrame} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div
                  onClick={() => {
                    toggleAccordion(timeFrame);
                    setTimeRange(mappedTime);
                  }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', cursor: 'pointer', background: isOpen ? '#fafafa' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#0667f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Droplet size={22} />
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{timeFrame}</span>
                  </div>
                  {isOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                </div>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #eee' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0', textAlign: 'center' }}>
                      Average Data ({timeFrame})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {getParameters().map(paramKey => {
                        const avgValue = getAverageValue(paramKey);
                        return (
                          <React.Fragment key={paramKey}>
                            {renderParameterVisual(paramKey, avgValue)}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SensorDetail;