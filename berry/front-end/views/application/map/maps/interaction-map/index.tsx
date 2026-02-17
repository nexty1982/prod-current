import { useState, useCallback, memo } from 'react';

// third party
import Map from 'react-map-gl/mapbox';

// project imports
import ControlPanel from './control-panel';
import MapControl from 'ui-component/third-party/map/MapControl';

// types
import { MapBoxProps } from 'types/map';

// ==============================|| MAP BOX - INTERATION MAP ||============================== //

function InteractionMap({ ...other }: MapBoxProps) {
  const [settings, setSettings] = useState({
    minZoom: 0,
    maxZoom: 20,
    minPitch: 0,
    maxPitch: 85,
    dragPan: true,
    boxZoom: true,
    keyboard: true,
    touchZoom: true,
    dragRotate: true,
    scrollZoom: true,
    touchPitch: true,
    touchRotate: true,
    doubleClickZoom: true,
    touchZoomRotate: true
  });

  const updateSettings = useCallback((name: string, value: boolean | number) => {
    setSettings((prevSettings) => {
      if (typeof value === 'number') {
        if (name === 'minZoom' || name === 'maxZoom') {
          // Validate zoom range
          if (value < 1 || value > 20) {
            return prevSettings;
          }
          // Ensure minZoom is not greater than maxZoom
          if (name === 'minZoom' && value > prevSettings.maxZoom) {
            return prevSettings;
          }
          // Ensure maxZoom is not less than minZoom
          if (name === 'maxZoom' && value < prevSettings.minZoom) {
            return prevSettings;
          }
        } else if (name === 'minPitch' || name === 'maxPitch') {
          // Validate pitch range
          if (value < 0 || value > 85) {
            return prevSettings;
          }
          // Ensure minPitch is not greater than maxPitch
          if (name === 'minPitch' && value > prevSettings.maxPitch) {
            return prevSettings;
          }
          // Ensure maxPitch is not less than minPitch
          if (name === 'maxPitch' && value < prevSettings.minPitch) {
            return prevSettings;
          }
        }
      }
      return { ...prevSettings, [name]: value };
    });
  }, []);

  return (
    <Map
      {...settings}
      initialViewState={{
        latitude: 37.729,
        longitude: -122.36,
        zoom: 11,
        bearing: 0,
        pitch: 50
      }}
      {...other}
    >
      <MapControl />
      <ControlPanel settings={settings} onChange={updateSettings} />
    </Map>
  );
}

export default memo(InteractionMap);
