import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { subHours, format, isWithinInterval, parseISO } from 'date-fns';
import {
  PlusCircle, Edit2, Trash2, Printer, LogOut, MapPin, Activity,
  Droplets, Wind, AlertTriangle, CheckCircle, X, Droplet, ChevronDown, ChevronUp, BarChart2,
  Search, Download, Database
} from 'lucide-react';

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

const AdminDashboard = () => {
  const [sensors, setSensors] = useState([]);
  const [readings, setReadings] = useState({});
  const [formData, setFormData] = useState({ name: '', type: 'water', hardwareId: '', latitude: '', longitude: '' });
  const [editingId, setEditingId] = useState(null);

  // --- RESPONSIVE DETECTION ---
  const isMobile = useMediaQuery('(max-width: 900px)');

  // --- FILTERING STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // --- MODAL & DATE FILTERING STATE ---
  const [viewingSensor, setViewingSensor] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [openAccordion, setOpenAccordion] = useState('1 Hour');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const navigate = useNavigate();
  const timeRangeOptions = { '1h': 1, '3h': 3, '6h': 6, '12h': 12, '24h': 24 };

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

  const pH_COLORS = ['#ff0000', '#ff4d00', '#ff9900', '#ffcc00', '#ffff00', '#b8e600', '#80e500', '#00cc44', '#00b3b3', '#3399ff', '#3333ff', '#6600cc', '#9900cc', '#cc66cc', '#ff66ff'];
  const doColors = generateGradientColors('#ffff00', '#00ff00', 10);
  const turbidityColors = generateGradientColors('#ff0000', '#0000ff', 10);
  const tempColors = generateGradientColors('#0000ff', '#ff0000', 5);

  const paramConfig = {
    co2: { label: 'CO₂', color: '#9b59b6', unit: 'ppm' },
    no2: { label: 'NO₂', color: '#e84393', unit: 'ppb' },
  };

  // --- API FETCH ---
  const fetchData = async () => {
    try {
      const [sensorRes, readingRes] = await Promise.all([
        API.get('/sensors'),
        API.get('/readings/latest')
      ]);
      setSensors(sensorRes.data);
      const map = {};
      readingRes.data.forEach(r => { map[r.sensorId] = r; });
      setReadings(map);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, 5000); // Silent refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // --- CRUD HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) };
    try {
      if (editingId) {
        await API.put(`/sensors/${editingId}`, payload);
      } else {
        await API.post('/sensors', payload);
      }
      setFormData({ name: '', type: 'water', hardwareId: '', latitude: '', longitude: '' });
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert('Error saving sensor');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('WARNING: Are you sure you want to delete this sensor? All associated readings will be lost.')) {
      await API.delete(`/sensors/${id}`);
      fetchData();
    }
  };

  const handleEditClick = (sensor) => {
    setEditingId(sensor._id);
    setFormData({ name: sensor.name, type: sensor.type, hardwareId: sensor.hardwareId || '', latitude: sensor.latitude, longitude: sensor.longitude });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'water', hardwareId: '', latitude: '', longitude: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handlePrint = () => {
    window.print();
  };

  // --- MODAL HANDLERS ---
  const handleViewReadings = async (sensor) => {
    setViewingSensor(sensor);
    setLoadingData(true);
    setUseCustomDate(false);
    setTimeRange('1h');
    setOpenAccordion('1 Hour');
    setCustomStart('');
    setCustomEnd('');

    try {
      const res = await API.get(`/readings/sensor/${sensor._id}`);
      setHistoricalData(res.data);
    } catch (err) {
      console.error("Error fetching sensor history", err);
    } finally {
      setLoadingData(false);
    }
  };

  // --- DATA PROCESSING ---
  const getFilteredReadings = () => {
    let filtered = [...historicalData];

    if (useCustomDate && customStart && customEnd) {
      const start = parseISO(customStart);
      const end = parseISO(customEnd);
      filtered = filtered.filter(r => {
        const d = new Date(r.timestamp);
        return isWithinInterval(d, { start, end });
      });
    } else {
      const hours = timeRangeOptions[timeRange];
      const cutoffTime = subHours(new Date(), hours);
      filtered = filtered.filter(r => new Date(r.timestamp) >= cutoffTime);
    }

    return filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const filteredReadings = getFilteredReadings();

  const getAverageValue = (paramKey) => {
    if (filteredReadings.length === 0) return null;
    const sum = filteredReadings.reduce((acc, curr) => acc + (curr[paramKey] || 0), 0);
    return (sum / filteredReadings.length);
  };

  const getParameters = () => {
    if (!viewingSensor) return [];
    return viewingSensor.type === 'water' ? ['ph', 'turbidity', 'oxygen', 'temperature'] : ['co2', 'no2'];
  };

  // --- EXPORT CSV FUNCTION ---
  const exportToCSV = () => {
    if (filteredReadings.length === 0) return alert("No data to export for this time range.");

    const params = getParameters();
    const headers = ['Timestamp', ...params];

    const rows = filteredReadings.map(r => {
      const row = [format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss')];
      params.forEach(p => row.push(r[p] !== undefined ? r[p] : ''));
      return row.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${viewingSensor.name.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <div key={index} style={{ flex: 1, backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 'bold', borderRight: index < steps ? '1px solid rgba(255,255,255,0.3)' : 'none', position: 'relative' }}>
                {valLabel}
                {index === activeIndex && <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid #333' }}></div>}
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
    if (value !== null) activeIndex = Math.max(0, Math.min(14, Math.round(value)));

    return (
      <div style={{ width: '100%', marginTop: '8px', position: 'relative' }}>
        <div style={{ display: 'flex', width: '100%', height: '30px', borderRadius: '6px', overflow: 'hidden' }}>
          {pH_COLORS.map((color, index) => (
            <div key={index} style={{ flex: 1, backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold', borderRight: index < 14 ? '1px solid rgba(255,255,255,0.3)' : 'none', position: 'relative' }}>
              {index}
              {index === activeIndex && <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid #333' }}></div>}
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
      <div style={{ background: 'white', border: `2px solid ${config.color}`, borderRadius: '12px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minHeight: '80px' }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', textAlign: 'center' }}>{config.label}</span>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: config.color, marginTop: '4px' }}>{displayValue} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>{config.unit}</span></span>
      </div>
    );
  };

  // --- STATUS BADGES ---
  const getAlertBadge = (reading) => {
    if (!reading) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: '#eee', color: '#666' }}>No Data</span>;
    let isAlert = reading.alerts && reading.alerts.length > 0;
    let isWarning = (reading.ph && (reading.ph < 6.5 || reading.ph > 8.5)) || (reading.co2 && reading.co2 > 1000);

    if (isAlert) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: '#ffebee', color: '#d32f2f' }}><AlertTriangle size={12} /> Alert</span>;
    if (isWarning) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: '#fff3e0', color: '#f57c00' }}><AlertTriangle size={12} /> Warning</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: '#e8f5e9', color: '#2e7d32' }}><CheckCircle size={12} /> Normal</span>;
  };

  // --- GLOBAL TABLE FILTERING ---
  const displayedSensors = sensors.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.latitude.toString().includes(searchQuery) ||
      s.longitude.toString().includes(searchQuery);
    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const activeAlertsCount = Object.values(readings).filter(r => r.alerts && r.alerts.length > 0).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f6', fontFamily: 'sans-serif', overflowX: 'hidden' }}>

      {/* --- PRINT STYLES --- */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .printable-area, .printable-area * { visibility: visible; }
            .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print, .no-print * { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print-card { box-shadow: none !important; border: 1px solid #ccc !important; }
          }
        `}
      </style>

      {/* --- OFFICIAL GOVERNMENT TOP BAR --- */}
      <div className="no-print" style={{ background: '#001f3f', color: 'white', padding: '4px 16px', fontSize: '11px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', letterSpacing: '1px', gap: isMobile ? '4px' : '0' }}>
        <span style={{ textAlign: 'center' }}>ISABELA STATE UNIVERSITY | DEPARTMENT OF ELECTRONICS ENGINEERING</span>
        <span style={{ textAlign: 'center' }}>SECURE ADMIN PORTAL</span>
      </div>

      {/* --- MAIN NAVBAR --- */}
      <div className="no-print" style={{ background: '#0056b3', padding: isMobile ? '12px' : '12px 24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', color: 'white', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/images/logo_favicon.png" alt="RiverSense Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold', letterSpacing: '0.5px' }}>RiverSense</h1>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Water and Air Sensor Management</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
          <button onClick={handlePrint} style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
            <Printer size={16} /> Print
          </button>
          <button onClick={handleLogout} style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#d32f2f', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* --- SUMMARY STATS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div className="print-card" style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #0056b3', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Sensors</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{sensors.length}</div>
          </div>
          <div className="print-card" style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #1abc9c', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Water Quality</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{sensors.filter(s => s.type === 'water').length}</div>
          </div>
          <div className="print-card" style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #9b59b6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Air Quality</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{sensors.filter(s => s.type === 'air').length}</div>
          </div>
          <div className="print-card" style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #d32f2f', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Alerts</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d32f2f' }}>{activeAlertsCount}</div>
          </div>
        </div>

        {/* --- MAIN CONTENT: FORM & TABLE --- */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>

          {/* --- LEFT: REGISTRATION FORM --- */}
          <div className="no-print" style={{ 
            width: isMobile ? '100%' : '350px', 
            flexShrink: 0, 
            background: 'white', 
            padding: isMobile ? '16px' : '24px', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0', 
            height: 'fit-content',
            boxSizing: 'border-box' // <--- CRITICAL FIX: Prevents padding from breaking the width
          }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingId ? <Edit2 size={18} color="#0056b3" /> : <PlusCircle size={18} color="#0056b3" />}
              {editingId ? 'Edit Sensor' : 'Register Sensor'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '6px', display: 'block' }}>Hardware MAC Address</label>
                <input placeholder="e.g. 24:6F:28:XX:XX:XX" value={formData.hardwareId} onChange={e => setFormData({ ...formData, hardwareId: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '6px', display: 'block' }}>Sensor Name / Location</label>
                <input placeholder="e.g. Cagayan River - Tuguegarao" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '6px', display: 'block' }}>Sensor Classification</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', background: 'white' }}>
                  <option value="water">Water Quality Monitoring</option>
                  <option value="air">Air Quality Monitoring</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '6px', display: 'block' }}>Latitude</label>
                  <input placeholder="17.6139" type="number" step="any" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '6px', display: 'block' }}>Longitude</label>
                  <input placeholder="121.7309" type="number" step="any" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
              </div>

              <button type="submit" style={{ background: '#0056b3', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                {editingId ? 'Save Changes' : 'Register Sensor'}
              </button>

              {editingId && (
                <button type="button" onClick={handleCancelEdit} style={{ background: 'white', color: '#666', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancel Edit
                </button>
              )}
            </form>
          </div>

          {/* --- RIGHT: SENSOR DATABASE TABLE --- */}
          <div className="printable-area print-card" style={{ 
            flex: 1, 
            background: 'white', 
            padding: isMobile ? '16px' : '24px', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0', 
            overflow: 'hidden', 
            minWidth: 0,
            boxSizing: 'border-box' // <--- CRITICAL FIX
          }}>
            
            {/* Table Header & Filters */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="#0056b3" /> Registered Sensors
              </h2>

              <div className="no-print" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '4px', padding: '6px 12px', background: '#f9f9f9', width: '100%', boxSizing: 'border-box' }}>
                  <Search size={16} color="#888" style={{ marginRight: '8px', flexShrink: 0 }} />
                  <input type="text" placeholder="Search name or coords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }} />
                </div>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', background: '#f9f9f9', fontSize: '13px', width: isMobile ? '100%' : 'auto' }}>
                  <option value="all">All Types</option>
                  <option value="water">Water Only</option>
                  <option value="air">Air Only</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f4f7f6', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', color: '#444', fontWeight: 'bold' }}>Sensor ID & Location</th>
                    <th style={{ padding: '12px', color: '#444', fontWeight: 'bold' }}>Type</th>
                    <th style={{ padding: '12px', color: '#444', fontWeight: 'bold' }}>Telemetry Data</th>
                    <th style={{ padding: '12px', color: '#444', fontWeight: 'bold' }}>Status</th>
                    <th className="no-print" style={{ padding: '12px', color: '#444', fontWeight: 'bold', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSensors.map(s => {
                    const r = readings[s._id];
                    return (
                      <tr key={s._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold', color: '#0056b3' }}>{s.name}</div>
                          <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>MAC: {s.hardwareId || 'N/A'}</div>
                          <div style={{ fontSize: '11px', color: '#777' }}>Lat: {s.latitude}, Lng: {s.longitude}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: s.type === 'water' ? '#e3f2fd' : '#f3e5f5', color: s.type === 'water' ? '#0056b3' : '#7b1fa2' }}>
                            {s.type === 'water' ? <Droplets size={12} /> : <Wind size={12} />} {s.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#444', fontSize: '12px' }}>
                          {r ? (
                            s.type === 'water' ? <div>pH: <b>{r.ph}</b><br/>Turb: <b>{r.turbidity}</b><br/>Temp: <b>{r.temperature}</b></div> :
                              <div>CO₂: <b>{r.co2}</b><br/>NO₂: <b>{r.no2}</b></div>
                          ) : <span style={{ color: '#aaa', fontStyle: 'italic' }}>Awaiting data...</span>}
                        </td>
                        <td style={{ padding: '12px' }}>{getAlertBadge(r)}</td>
                        <td className="no-print" style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button onClick={() => handleViewReadings(s)} style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#2e7d32' }} title="View Data Report">
                            <BarChart2 size={16} />
                          </button>
                          <button onClick={() => handleEditClick(s)} style={{ background: '#e3f2fd', border: '1px solid #bbdefb', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#0056b3' }} title="Edit Configuration">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(s._id)} style={{ background: '#ffebee', border: '1px solid #ffcdd2', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#d32f2f' }} title="Delete Sensor">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedSensors.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No sensors match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- ADVANCED REPORT MODAL --- */}
      {viewingSensor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '10px' : '20px' }}>
          <div className="printable-area print-card" style={{ background: 'white', width: '100%', maxWidth: '600px', maxHeight: '90vh', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid #ccc', boxSizing: 'border-box' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: '16px', borderBottom: '2px solid #0056b3', background: '#f4f7f6', gap: '10px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', color: '#0056b3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} /> Data Report
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#555', fontWeight: 'bold' }}>{viewingSensor.name} ({viewingSensor.type.toUpperCase()})</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>MAC: {viewingSensor.hardwareId || 'N/A'}</p>
              </div>
              <button className="no-print" onClick={() => setViewingSensor(null)} style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '4px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#333', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
                <X size={18} />
              </button>
            </div>

            {/* Filtering Section */}
            <div className="no-print" style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '12px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="customDateToggle" checked={useCustomDate} onChange={(e) => setUseCustomDate(e.target.checked)} style={{ cursor: 'pointer' }} />
                  <label htmlFor="customDateToggle" style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', cursor: 'pointer' }}>Use Custom Date</label>
                </div>
                <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Download size={14} /> Export CSV
                </button>
              </div>

              {useCustomDate ? (
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: 'center', background: '#f9f9f9', padding: '12px', borderRadius: '4px', border: '1px solid #eee' }}>
                  <div style={{ flex: 1, width: '100%' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '4px' }}>Start Date</label>
                    <input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1, width: '100%' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '4px' }}>End Date</label>
                    <input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', background: '#e3f2fd', padding: '8px 12px', borderRadius: '4px' }}>
                  Using preset ranges below.
                </div>
              )}
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '16px', overflowY: 'auto', background: '#f9f9f9', flex: 1 }}>
              {loadingData ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}><Activity className="animate-spin" style={{ margin: '0 auto' }} /> Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!useCustomDate && ['1 Hour', '3 Hours', '6 Hours', '12 Hours', '24 Hours'].map((timeFrame) => {
                    const isOpen = openAccordion === timeFrame;
                    const mappedTime = timeFrame.replace(' Hours', 'h').replace(' Hour', 'h');

                    return (
                      <div key={timeFrame} style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div onClick={() => { setOpenAccordion(isOpen ? null : timeFrame); setTimeRange(mappedTime); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', background: isOpen ? '#f4f7f6' : 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: '#0667f5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                              <Droplet size={18} />
                            </div>
                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{timeFrame} Avg</span>
                          </div>
                          {isOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                        </div>

                        {isOpen && (
                          <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #eee' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                              {getParameters().map(paramKey => {
                                const avgValue = getAverageValue(paramKey);
                                return renderParameterVisual(paramKey, avgValue);
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Display Custom Range Data */}
                  {useCustomDate && (
                    <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '16px' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#0056b3', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                        Averages for Selected Range
                      </h3>
                      {filteredReadings.length === 0 ? (
                        <div style={{ color: '#d32f2f', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No data found.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {getParameters().map(paramKey => {
                            const avgValue = getAverageValue(paramKey);
                            return renderParameterVisual(paramKey, avgValue);
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', background: '#f4f7f6', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>Generated: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</span>
              <button className="no-print" onClick={() => setViewingSensor(null)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;