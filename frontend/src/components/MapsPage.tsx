// src/pages/MapsPage.tsx
import React, { useEffect } from "react";
import MapComponent from "../components/MapComponent";

const MapsPage: React.FC = () => {
  useEffect(() => {
    document.title = "Maps - Noise Detection";

    const html = document.documentElement;
    const body = document.body;

    const originalHtmlStyle = {
      margin: html.style.margin,
      padding: html.style.padding,
      height: html.style.height,
      overflow: html.style.overflow,
    };

    const originalBodyStyle = {
      margin: body.style.margin,
      padding: body.style.padding,
      height: body.style.height,
      overflow: body.style.overflow,
    };

    html.style.margin = "0";
    html.style.padding = "0";
    html.style.height = "100%";
    html.style.overflow = "hidden";

    body.style.margin = "0";
    body.style.padding = "0";
    body.style.height = "100%";
    body.style.overflow = "hidden";

    return () => {
      html.style.margin = originalHtmlStyle.margin;
      html.style.padding = originalHtmlStyle.padding;
      html.style.height = originalHtmlStyle.height;
      html.style.overflow = originalHtmlStyle.overflow;

      body.style.margin = originalBodyStyle.margin;
      body.style.padding = originalBodyStyle.padding;
      body.style.height = originalBodyStyle.height;
      body.style.overflow = originalBodyStyle.overflow;
    };
  }, []);

  return (
    <div className="fullscreen-map-container">
      <MapComponent />
    </div>
  );
};

export default MapsPage;
