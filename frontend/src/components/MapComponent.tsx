// src/components/MapComponent.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Popup,
  useMapEvents,
  Marker,
} from "react-leaflet";
import L, { Map as LeafletMap } from "leaflet";
import { useNavigate } from "react-router-dom"; // NEW: Import for navigation
import { NoiseLocation, SearchResult } from "../types/mapTypes";
import { mapConfig, tileLayerConfig, noiseColors } from "../config/mapConfig";
import { mapService } from "../services/mapService";
import { generateNoiseArea } from "../utils/mapUtils";
import MapControls from "./MapControls";
import MapPopup from "./MapPopup";
import styles from "../styles/MapComponent.module.css";

import "leaflet/dist/leaflet.css";

// ... (existing code for Leaflet icon fix and custom icons) ...
// PERBAIKAN: Fix untuk ikon default Leaflet yang sering rusak di React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// BARU: Custom icon untuk lokasi pengguna
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <div style="
      position: relative;
      width: 20px;
      height: 20px;
    ">
      <div style="
        width: 20px;
        height: 20px;
        background: #007AFF;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,122,255,0.3);
        animation: pulse-user 2s infinite;
      "></div>
      <div style="
        position: absolute;
        top: -10px;
        left: -10px;
        width: 40px;
        height: 40px;
        background: rgba(0,122,255,0.2);
        border-radius: 50%;
        animation: pulse-ring 2s infinite;
      "></div>
    </div>
    <style>
      @keyframes pulse-user {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// BARU: Custom icon untuk search location
const searchLocationIcon = L.divIcon({
  className: "search-location-marker",
  html: `
    <div style="
      position: relative;
      width: 30px;
      height: 30px;
    ">
      <div style="
        width: 30px;
        height: 30px;
        background: #ff4444;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(255,68,68,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        font-weight: bold;
      ">📍</div>
      <div style="
        position: absolute;
        top: -5px;
        left: -5px;
        width: 40px;
        height: 40px;
        background: rgba(255,68,68,0.2);
        border-radius: 50%;
        animation: search-pulse 2s infinite;
      "></div>
    </div>
    <style>
      @keyframes search-pulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.2); opacity: 0.4; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    </style>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

interface MapComponentProps {
  className?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ className }) => {
  const navigate = useNavigate(); // NEW: Hook for navigation
  const [noiseLocations, setNoiseLocations] = useState<NoiseLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isAddingNoise, setIsAddingNoise] = useState<boolean>(false);
  const [showNoiseForm, setShowNoiseForm] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [selectedPosition, setSelectedPosition] = useState<
    [number, number] | null
  >(null);
  const [searchMarker, setSearchMarker] = useState<[number, number] | null>(
    null
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [isTrackingUser, setIsTrackingUser] = useState<boolean>(false);
  const [searchLocationMarker, setSearchLocationMarker] = useState<{
    position: [number, number];
    name: string;
    address: string;
  } | null>(null);

  // NEW: State for the address input in the form
  const [formAddress, setFormAddress] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const mapRef = useRef<LeafletMap | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    loadNoiseLocations();
    handleLocateUser();

    // UPDATED: Check for shared data from either flow
    const sharedData = mapService.getSharedNoiseData();
    if (sharedData) {
      processSharedData(sharedData);
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ... (useEffect for user tracking remains the same) ...
  useEffect(() => {
    if (isTrackingUser && navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(newLocation);
        },
        (error) => {
          console.warn("Tracking location error:", error);
          setIsTrackingUser(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        }
      );
    } else if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [isTrackingUser]);

  // UPDATED: This function now handles data from both the old and new flow
  const processSharedData = async (sharedData: any) => {
    setLoading(true);
    setError("");
    try {
      // Prioritize position from the new flow; otherwise, get current location for the old flow
      const position =
        sharedData.position || (await mapService.getCurrentLocation());

      if (position) {
        const newLocation = await mapService.addNoiseLocation({
          coordinates: position,
          noiseLevel: sharedData.analysis.noise_level,
          source: sharedData.analysis.noise_source,
          healthImpact: sharedData.analysis.health_impact,
          description: `Analisis suara otomatis`,
          address: sharedData.address || "Alamat tidak tersedia",
          radius: 100,
        });

        if (newLocation) {
          await loadNoiseLocations();
          zoomToLocation(position, 17);
        } else {
          setError("Gagal menyimpan data analisis ke server");
        }
      } else {
        setError("Gagal mendapatkan lokasi untuk membuat titik analisis.");
        alert(
          "Gagal mendapatkan lokasi Anda. Pastikan izin lokasi telah diberikan."
        );
      }
    } catch (err) {
      console.error("Error processing shared data:", err);
      setError("Gagal memproses data analisis.");
    } finally {
      setLoading(false);
    }
  };

  const zoomToLocation = (
    coordinates: [number, number],
    zoomLevel: number = 15,
    showMarker: boolean = true
  ) => {
    if (mapRef.current) {
      // Smooth pan dan zoom
      mapRef.current.flyTo(coordinates, zoomLevel, {
        animate: true,
        duration: 1.5, // Durasi animasi dalam detik
        easeLinearity: 0.25,
      });

      // Tampilkan marker pencarian jika diperlukan
      if (showMarker && !userLocation) {
        setSearchMarker(coordinates);
        // Hilangkan marker setelah 5 detik
        setTimeout(() => {
          setSearchMarker(null);
        }, 5000);
      }
    }
  };

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
          setError("Pencarian gagal");
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300); // Dipercepat dari 500ms ke 300ms untuk responsif
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

  const loadNoiseLocations = async () => {
    try {
      setLoading(true);
      const locations = await mapService.getNoiseLocations();
      setNoiseLocations(locations);
    } catch (error) {
      console.error("Error loading noise locations:", error);
      setError("Gagal memuat data area noise");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (e: any) => {
    if (isAddingNoise) {
      setSelectedPosition([e.latlng.lat, e.latlng.lng]);
      setShowNoiseForm(true);
    }
    setSearchMarker(null);
    if (searchLocationMarker) {
      setSearchLocationMarker(null);
    }
  };

  const handleAddNoiseArea = () => {
    const isAuthenticated = !!localStorage.getItem("accessToken");
    if (!isAuthenticated) {
      alert("Anda harus login untuk dapat menambahkan area analisis di peta.");
      navigate("/login");
      return;
    }

    setIsAddingNoise(!isAddingNoise);
    // Reset form state when toggling the mode off
    if (isAddingNoise) {
      setShowNoiseForm(false);
      setSelectedPosition(null);
      setFormAddress("");
    }
  };

  // NEW: Handler for the "Analisis Suara" button
  const handleStartAnalysis = () => {
    if (selectedPosition) {
      // 1. Set the context in the service
      mapService.setAnalysisRequest({
        position: selectedPosition,
        address: formAddress,
      });
      // 2. Navigate to the HomePage to start recording
      navigate("/home");
    } else {
      setError("Silakan pilih titik di peta terlebih dahulu.");
    }
  };

  const handleDeleteNoiseLocation = async (id: string) => {
    try {
      setLoading(true);
      const success = await mapService.removeNoiseLocation(id);
      if (success) {
        await loadNoiseLocations(); // Reload data after successful deletion
      } else {
        setError("Gagal menghapus area berisik");
      }
    } catch (error) {
      console.error("Error deleting noise location:", error);
      setError("Gagal menghapus area berisik");
    } finally {
      setLoading(false);
    }
  };

  // DIPERBAHARUI: Handle locate user dengan icon
  const handleLocateUser = async () => {
    setLoading(true);
    try {
      const position = await mapService.getCurrentLocation();
      if (position) {
        setUserLocation(position);
        setIsTrackingUser(true); // Mulai tracking lokasi real-time
        // PERBAIKAN: Gunakan smooth zoom untuk lokasi user
        zoomToLocation(position, 16, false); // false karena sudah ada user location icon
      } else {
        setError("Tidak dapat mengakses lokasi Anda");
      }
    } catch (error) {
      setError("Gagal mendapatkan lokasi");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAreas = async () => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin menghapus semua area berisik milik Anda?"
      )
    ) {
      try {
        setLoading(true);
        const success = await mapService.clearAllNoiseLocations();
        if (success) {
          await loadNoiseLocations(); // Reload data after successful clearing
        } else {
          setError("Gagal menghapus area berisik");
        }
      } catch (error) {
        console.error("Error clearing noise areas:", error);
        setError("Gagal menghapus area berisik");
      } finally {
        setLoading(false);
      }
    }
  };

  // ENHANCED: Improved search result click handler
  const handleSearchResultClick = (result: SearchResult) => {
    // PERBAIKAN: Set marker untuk lokasi pencarian dengan null check untuk address
    setSearchLocationMarker({
      position: result.coordinates,
      name: result.name,
      address: result.address || "Alamat tidak tersedia", // Fix untuk type error
    });

    // Smooth zoom ke hasil pencarian dengan zoom level yang lebih tinggi
    zoomToLocation(result.coordinates, 17, false); // false karena kita gunakan marker khusus

    // Clear search UI
    setSearchQuery("");
    setSearchResults([]);

    // Auto-hide marker setelah 10 detik
    setTimeout(() => {
      setSearchLocationMarker(null);
    }, 10000);
  };

  // BARU: Function untuk menghapus search marker secara manual
  const handleClearSearchMarker = () => {
    setSearchLocationMarker(null);
  };

  // PERBAIKAN: Fungsi untuk handle keyboard navigation pada search results
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      setSearchResults([]);
      setSearchLocationMarker(null); // Clear search marker juga
    } else if (e.key === "Enter" && searchResults.length > 0) {
      // Auto select first result saat Enter
      handleSearchResultClick(searchResults[0]);
    } else if (e.key === "ArrowDown" && searchResults.length > 0) {
      // Future: implement keyboard navigation through results
      e.preventDefault();
    }
  };

  // ENHANCED: Component for handling map events
  const MapEvents: React.FC = () => {
    useMapEvents({
      click: (e) => {
        handleMapClick(e);
      },
      zoomstart: () => {
        // Optional: behavior saat zoom dimulai
      },
    });
    return null;
  };

  return (
    <div className={`${styles.mapContainer} ${className || ""}`}>
      {/* Search Container and MapControls remain the same */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Cari lokasi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className={styles.searchInput}
        />

        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            {searchResults.map((result, index) => (
              <div
                key={result.id}
                className={`${styles.searchResult} ${
                  index === 0 ? styles.firstResult : ""
                }`}
                onClick={() => handleSearchResultClick(result)}
              >
                <div className={styles.resultName}>{result.name}</div>
                <div className={styles.resultAddress}>
                  {result.address || "Alamat tidak tersedia"}
                </div>
              </div>
            ))}
          </div>
        )}

        {isSearching && (
          <div className={styles.searchResult}>
            <div className={styles.resultName}>🔍 Mencari...</div>
          </div>
        )}

        {/* PERBAIKAN: Show message when no results found */}
        {!isSearching &&
          searchQuery.length > 2 &&
          searchResults.length === 0 && (
            <div className={styles.searchResult}>
              <div className={styles.resultName}>Tidak ada hasil ditemukan</div>
            </div>
          )}
      </div>
      <MapControls
        onAddNoiseArea={handleAddNoiseArea}
        onLocateUser={handleLocateUser}
        onClearAreas={handleClearAreas}
        onToggleLegend={() => setShowLegend(!showLegend)}
        onToggleTracking={() => setIsTrackingUser(!isTrackingUser)}
        isAddingNoise={isAddingNoise}
        showLegend={showLegend}
        isTrackingUser={isTrackingUser}
        hasUserLocation={userLocation !== null}
      />

      {/* UPDATED: Noise Panel is now the form for the new flow */}
      {showNoiseForm && selectedPosition && (
        <div className={styles.noisePanel}>
          <div className={styles.noisePanelTitle}>Analisis Suara di Lokasi</div>
          <div className={styles.noiseForm}>
            <input
              type="text"
              placeholder="Alamat/Nama Lokasi (opsional)"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className={styles.noiseInput}
            />
            <div className={styles.noiseLevel}>
              <span>Koordinat:</span>
              <span className={styles.noiseLevelValue}>
                {selectedPosition[0].toFixed(5)},{" "}
                {selectedPosition[1].toFixed(5)}
              </span>
            </div>
            <button
              onClick={handleStartAnalysis}
              className={styles.submitButton}
            >
              Analisis Suara
            </button>
          </div>
        </div>
      )}

      {/* Legend, Loading, Error, and MapContainer JSX remain the same */}
      {showLegend && (
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Legenda</div>
          {Object.entries(noiseColors).map(([key, color]) => {
            let label = "";
            switch (key) {
              case "low":
                label = "Tenang (≤40 dB)";
                break;
              case "medium":
                label = "Sedang (41-60 dB)";
                break;
              case "high":
                label = "Berisik (61-80 dB)";
                break;
              case "extreme":
                label = "Sangat Berisik (>80 dB)";
                break;
            }
            return (
              <div className={styles.legendItem} key={key}>
                <div
                  className={styles.legendColor}
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            );
          })}
          {/* BARU: Tambahkan legenda untuk lokasi pengguna */}
          <div className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{
                backgroundColor: "#007AFF",
                borderRadius: "50%",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,122,255,0.3)",
              }}
            />
            <span>Lokasi Anda</span>
          </div>
          {/* BARU: Tambahkan legenda untuk lokasi pencarian */}
          <div className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{
                backgroundColor: "#ff4444",
                borderRadius: "50%",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(255,68,68,0.3)",
              }}
            />
            <span>Lokasi Pencarian</span>
          </div>
        </div>
      )}
      {loading && (
        <div className={styles.loading}>
          <div>📍 Memuat Lokasi...</div>
        </div>
      )}
      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button
            onClick={() => setError("")}
            style={{
              marginLeft: "10px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}
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
                weight: 1,
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

        {/* BARU: User Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div style={{ textAlign: "center", padding: "8px" }}>
                <strong>📍 Lokasi Anda</strong>
                <br />
                <small>
                  {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                </small>
                <br />
                <small style={{ color: "#666" }}>
                  {isTrackingUser ? "🔄 Tracking aktif" : "📌 Lokasi tetap"}
                </small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* BARU: Search Location Marker */}
        {searchLocationMarker && (
          <Marker
            position={searchLocationMarker.position}
            icon={searchLocationIcon}
          >
            <Popup>
              <div
                style={{
                  textAlign: "center",
                  padding: "10px",
                  minWidth: "200px",
                }}
              >
                <strong style={{ fontSize: "16px", color: "#ff4444" }}>
                  📍 {searchLocationMarker.name}
                </strong>
                <br />
                <div
                  style={{ margin: "8px 0", color: "#666", fontSize: "14px" }}
                >
                  {searchLocationMarker.address}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    marginBottom: "10px",
                  }}
                >
                  {searchLocationMarker.position[0].toFixed(6)},{" "}
                  {searchLocationMarker.position[1].toFixed(6)}
                </div>
                <button
                  onClick={handleClearSearchMarker}
                  style={{
                    background: "#ff4444",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Tutup Marker
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Selected Position Marker */}
        {selectedPosition && <Marker position={selectedPosition} />}

        {/* PERBAIKAN: Search Result Marker (legacy - untuk fallback) */}
        {searchMarker && (
          <Marker
            position={searchMarker}
            icon={L.divIcon({
              className: "search-marker",
              html: '<div style="background: #ff4444; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
