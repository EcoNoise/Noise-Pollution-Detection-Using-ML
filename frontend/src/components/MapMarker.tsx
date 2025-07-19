import React from 'react';
import { Marker } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { MapMarkerData } from '../types/mapTypes';

interface MapMarkerProps {
  data: MapMarkerData;
  onClick?: () => void;
}

const MapMarker: React.FC<MapMarkerProps> = ({ data, onClick }) => {
  const getMarkerIcon = (): Icon | DivIcon => {
    if (data.type === 'analysis') {
      // Custom icon for analysis points
      return new Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#2196F3">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `),
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
      });
    }
    
    // Return default icon for other types or fallback
    return new Icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FF5722">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `),
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    });
  };

  return (
    <Marker 
      position={data.position} 
      icon={getMarkerIcon()}
      eventHandlers={{
        click: onClick
      }}
    />
  );
};

export default MapMarker;