import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, MapPin, Code2, Users, Code, Globe, Mail } from 'lucide-react';
import Header from './Header';

const About = () => {
  const navigate = useNavigate();

  // --- DEVELOPER DATA ---
  const developers = [
    {
      name: "Junmar Acosta",
      role: "Full Stack Developer",
      description: "Responsible for the backend architecture, API development, and database management.",
      image: "/images/Acosta_Junmar.png",
      github: "https://github.com/yourusername",
      linkedin: "https://linkedin.com/in/yourusername",
      email: "joeneL@example.com"
    },
    {
      name: "Cindy Totto Anapi",
      role: "Frontend Developer",
      description: "Designed the user interface, interactive maps, and responsive user experience.",
      image: "/images/Anapi_Cindy_Totto.png",
      github: "https://github.com/yourusername",
      linkedin: "https://linkedin.com/in/yourusername",
      email: "dev2@example.com"
    },
    {
      name: "Alex Zhaneder Ugaddan Forto",
      role: "Hardware / IoT Engineer",
      description: "Responsible for the sensor integration, telemetry data, and hardware calibration.",
      image: "/images/Forto_Alex_Zhaneder_Ugaddan.png",
      github: "https://github.com/yourusername",
      linkedin: "https://linkedin.com/in/yourusername",
      email: "dev3@example.com"
    },
    {
      name: "Erica Rondina Luces",
      role: "Hardware / IoT Engineer",
      description: "Responsible for the sensor integration, telemetry data, and hardware calibration.",
      image: "/images/Luces_Erica_Rondina.png",
      github: "https://github.com/yourusername",
      linkedin: "https://linkedin.com/in/yourusername",
      email: "dev3@example.com"
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f6', fontFamily: 'sans-serif' }}>
      {/* Header Overlay */}
      <div style={{ position: 'relative', zIndex: 1000 }}>
        <Header />
      </div>

      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0056b3 0%, #003d82 100%)', 
        color: 'white', 
        padding: '80px 20px 60px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: '0 0 16px 0' }}>About RiverSense</h1>
        <p style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', opacity: 0.9 }}>
          A comprehensive Water and Air Quality Monitoring System designed to provide real-time telemetry data, hazard assessment, and environmental insights for the Cagayan Valley region.
        </p>
      </div>

      {/* Main Content Container */}
      <div style={{ maxWidth: '1200px', margin: '-30px auto 40px auto', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        
        {/* Project Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '50px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '4px solid #0667f5' }}>
            <Droplets size={36} color="#0667f5" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Real-Time Monitoring</h3>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              Utilizing IoT sensors to continuously track vital water parameters (pH, Turbidity, Dissolved Oxygen, Temperature) and air quality metrics (CO₂, NO₂).
            </p>
          </div>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '4px solid #1abc9c' }}>
            <MapPin size={36} color="#1abc9c" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Geospatial Mapping</h3>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              Integrated with Leaflet mapping to provide a visual overview of sensor locations, enabling users to easily locate and assess environmental conditions in their area.
            </p>
          </div>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '4px solid #9b59b6' }}>
            <Code2 size={36} color="#9b59b6" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Modern Tech Stack</h3>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              Built using React.js for the frontend, Node.js/Express for the backend, and MongoDB for robust, scalable data storage and historical logging.
            </p>
          </div>
        </div>

        {/* Developers Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '28px', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Users size={28} color="#0667f5" /> Meet the Developers
          </h2>
          <p style={{ color: '#666', marginTop: '8px' }}>The team behind the RiverSense Project</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '60px' }}>
          {developers.map((dev, index) => (
            <div key={index} style={{ 
              background: 'white', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              transition: 'transform 0.2s',
              textAlign: 'center',
              paddingBottom: '24px'
            }}>
              {/* Profile Image Container */}
              <div style={{ 
                height: '200px', 
                background: '#e3f2fd', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                 <img 
                    src={dev.image} 
                    alt={dev.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center top' }} 
                    onError={(e) => { 
                      // Fallback if image is missing
                      e.target.onerror = null; 
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Image+Found'; 
                    }}
                 />
              </div>
              
              <div style={{ padding: '20px 20px 0 20px' }}>
                <h3 style={{ margin: '0 0 4px 0', color: '#333', fontSize: '20px' }}>{dev.name}</h3>
                <div style={{ color: '#0667f5', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>{dev.role}</div>
                <p style={{ color: '#666', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                  {dev.description}
                </p>
              </div>

              {/* Social Links */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <a href={dev.github} target="_blank" rel="noopener noreferrer" style={{ color: '#333', background: '#f4f7f6', padding: '8px', borderRadius: '50%' }} title="GitHub">
                  <Code size={18} />
                </a>
                <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0056b3', background: '#e3f2fd', padding: '8px', borderRadius: '50%' }} title="LinkedIn / Portfolio">
                  <Globe size={18} />
                </a>
                <a href={`mailto:${dev.email}`} style={{ color: '#d32f2f', background: '#ffebee', padding: '8px', borderRadius: '50%' }} title="Email">
                  <Mail size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#0667f5', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(6, 103, 245, 0.3)'
            }}
          >
            <ArrowLeft size={18} /> Back to Live Map
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ background: '#001f3f', color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
        <p style={{ margin: 0 }}>Isabela State University | Department of Electronics Engineering</p>
        <p style={{ margin: '4px 0 0 0' }}>© {new Date().getFullYear()} RiverSense. All Rights Reserved.</p>
      </div>
    </div>
  );
};

export default About;