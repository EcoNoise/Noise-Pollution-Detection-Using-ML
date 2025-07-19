// src/components/MapComponent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, Marker } from 'react-leaflet';
import L, { Map as LeafletMap } from 'leaflet';
import { NoiseLocation, SearchResult } from '../types/mapTypes';
import { mapConfig, tileLayerConfig, noiseColors } from '../config/mapConfig';
import { mapService } from '../services/mapService';
import { generateNoiseArea, getNoiseDescription } from '../utils/mapUtils';
import MapControls from './MapControls';
import MapPopup from './MapPopup';
import styles from '../styles/MapComponent.module.css';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// PERBAIKAN: Fix untuk ikon default Leaflet yang sering rusak di React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


interface MapComponentProps {
  className?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ className }) => {
  const [noiseLocations, setNoiseLocations] = useState<NoiseLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isAddingNoise, setIsAddingNoise] = useState<boolean>(false);
  const [showNoiseForm, setShowNoiseForm] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [newNoiseData, setNewNoiseData] = useState({
    noiseLevel: 60,
    description: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const mapRef = useRef<LeafletMap | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load noise locations dan periksa data yang dibagikan saat komponen pertama kali dimuat
  useEffect(() => {
    loadNoiseLocations();
    
    // LOGIKA INTI PERBAIKAN: Cek data yang dibagikan dari service
    const sharedData = mapService.getSharedNoiseData();
    if (sharedData) {
      processSharedData(sharedData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FUNGSI BARU: Untuk memproses data dari HomePage dan membuat marker baru
  const processSharedData = async (sharedData: any) => {
    setLoading(true);
    setError('');
    try {
      // 1. Minta lokasi pengguna saat ini
      const position = await mapService.getCurrentLocation();
      if (position) {
        // 2. Buat lokasi bising baru dengan data yang ada
        mapService.addNoiseLocation({
          latitude: position[0],
          longitude: position[1],
          noiseLevel: sharedData.noise_level,
          description: `Sumber: ${sharedData.noise_source}, Dampak: ${sharedData.health_impact}`,
        });
        loadNoiseLocations(); // Muat ulang semua lokasi untuk menampilkan yang baru
        if (mapRef.current) {
          mapRef.current.setView(position, 15); // Fokuskan peta ke lokasi baru
        }
      } else {
        setError('Tidak dapat mengakses lokasi Anda. Marker tidak bisa dibuat.');
        alert('Gagal mendapatkan lokasi Anda. Pastikan izin lokasi telah diberikan dan coba lagi.');
      }
    } catch (err) {
      setError('Gagal mendapatkan lokasi untuk membuat marker.');
    } finally {
      setLoading(false);
    }
  };


  // Search functionality with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length > 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await mapService.searchLocations(searchQuery);
          setSearchResults(results);
        } catch (error) {
          setError('Pencarian gagal');
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadNoiseLocations = () => {
    const locations = mapService.getNoiseLocations();
    setNoiseLocations(locations);
  };

  const handleMapClick = (e: any) => {
    if (isAddingNoise) {
      setSelectedPosition([e.latlng.lat, e.latlng.lng]);
      setShowNoiseForm(true);
    }
  };

  const handleAddNoiseArea = () => {
    setIsAddingNoise(!isAddingNoise);
    if (!isAddingNoise) {
      setShowNoiseForm(false);
      setSelectedPosition(null);
    }
  };

  const handleSubmitNoise = () => {
    if (selectedPosition) {
      try {
        mapService.addNoiseLocation({
          latitude: selectedPosition[0],
          longitude: selectedPosition[1],
          noiseLevel: newNoiseData.noiseLevel,
          description: newNoiseData.description,
        });

        loadNoiseLocations();
        setShowNoiseForm(false);
        setSelectedPosition(null);
        setIsAddingNoise(false);
        setNewNoiseData({ noiseLevel: 60, description: '' });
      } catch (error) {
        setError('Gagal menambahkan area berisik');
      }
    }
  };

  const handleDeleteNoiseLocation = (id: string) => {
    try {
      mapService.removeNoiseLocation(id);
      loadNoiseLocations();
    } catch (error) {
      setError('Gagal menghapus area berisik');
    }
  };

  const handleLocateUser = async () => {
    setLoading(true);
    try {
      const position = await mapService.getCurrentLocation();
      if (position && mapRef.current) {
        mapRef.current.setView(position, 15);
      } else {
        setError('Tidak dapat mengakses lokasi Anda');
      }
    } catch (error) {
      setError('Gagal mendapatkan lokasi');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAreas = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua area berisik?')) {
      mapService.clearAllNoiseLocations();
      loadNoiseLocations();
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    if (mapRef.current) {
      mapRef.current.setView(result.coordinates, 15);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Component for handling map events
  const MapEvents: React.FC = () => {
    useMapEvents({
      click: handleMapClick,
    });
    return null;
  };

  return (
    <div className={`${styles.mapContainer} ${className || ''}`}>
      {/* Search Container */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Cari lokasi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        
        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            {searchResults.map((result) => (
              <div
                key={result.id}
                className={styles.searchResult}
                onClick={() => handleSearchResultClick(result)}
              >
                <div className={styles.resultName}>{result.name}</div>
                <div className={styles.resultAddress}>{result.address}</div>
              </div>
            ))}
          </div>
        )}
        
        {isSearching && (
          <div className={styles.searchResult}>
            <div className={styles.resultName}>Mencari...</div>
          </div>
        )}
      </div>

      {/* Map Controls */}
      <MapControls
        onAddNoiseArea={handleAddNoiseArea}
        onLocateUser={handleLocateUser}
        onClearAreas={handleClearAreas}
        onToggleLegend={() => setShowLegend(!showLegend)}
        isAddingNoise={isAddingNoise}
        showLegend={showLegend}
      />

      {/* Noise Form Panel */}
      {showNoiseForm && selectedPosition && (
        <div className={styles.noisePanel}>
          <div className={styles.noisePanelTitle}>Tambah Area Berisik</div>
          <div className={styles.noiseForm}>
            <div className={styles.noiseLevel}>
              <span>Level Kebisingan:</span>
              <span className={styles.noiseLevelValue}>
                {newNoiseData.noiseLevel} dB
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              value={newNoiseData.noiseLevel}
              onChange={(e) => setNewNoiseData({ ...newNoiseData, noiseLevel: parseInt(e.target.value)})}
              className={styles.noiseSlider}
            />
            <input
              type="text"
              placeholder="Deskripsi (opsional)"
              value={newNoiseData.description}
              onChange={(e) => setNewNoiseData({ ...newNoiseData, description: e.target.value })}
              className={styles.noiseInput}
            />
            <button onClick={handleSubmitNoise} className={styles.submitButton}>Tambah Area</button>
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Legenda</div>
          {Object.entries(noiseColors).map(([key, color]) => {
              let label = '';
              switch(key) {
                  case 'low': label = 'Tenang (≤40 dB)'; break;
                  case 'medium': label = 'Sedang (41-60 dB)'; break;
                  case 'high': label = 'Berisik (61-80 dB)'; break;
                  case 'extreme': label = 'Sangat Berisik (>80 dB)'; break;
              }
              return (
                <div className={styles.legendItem} key={key}>
                  <div className={styles.legendColor} style={{ backgroundColor: color }} />
                  <span>{label}</span>
                </div>
              );
          })}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className={styles.loading}>
          <div>Memuat Lokasi...</div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        className={styles.mapInstance}
        ref={mapRef}
        attributionControl={mapConfig.attributionControl}
        zoomControl={mapConfig.zoomControl}
      >
        <TileLayer
          url={tileLayerConfig.url}
          attribution={tileLayerConfig.attribution}
        />

        <MapEvents />

        {/* Noise Areas as Circles */}
        {noiseLocations.map((location) => {
          const area = generateNoiseArea(location);
          return (
            <Circle
              key={location.id}
              center={area.center}
              radius={area.radius}
              pathOptions={{
                color: area.color,
                fillColor: area.color,
                fillOpacity: area.opacity,
                weight: 1, // Dibuat lebih tipis agar tidak terlalu tebal
              }}
            >
              <Popup>
                <MapPopup
                  location={location}
                  onDelete={handleDeleteNoiseLocation}
                />
              </Popup>
            </Circle>
          );
        })}

        {/* Selected Position Marker */}
        {selectedPosition && (
          <Marker position={selectedPosition} />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;