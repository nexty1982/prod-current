import { useState, useCallback, memo } from 'react';

// third party
import Map, { MarkerDragEvent, LngLat } from 'react-map-gl/mapbox';

// project imports
import ControlPanel from './control-panel';
import MapControl from 'ui-component/third-party/map/MapControl';
import MapMarker from 'ui-component/third-party/map/MapMarker';

// types
import { MapBoxProps } from 'types/map';

// ==============================|| MAP - DRAGGABLE MARKER ||============================== //

function DraggableMarkers({ ...other }: MapBoxProps) {
  const [marker, setMarker] = useState({
    latitude: 21.2335611,
    longitude: 72.8636084
  });

  const [events, logEvents] = useState<Record<string, LngLat>>({});

  const onMarkerDragStart = useCallback((event: MarkerDragEvent) => {
    logEvents((_events: any) => ({ ..._events, onDragStart: event.lngLat }));
  }, []);

  const onMarkerDrag = useCallback((event: MarkerDragEvent) => {
    logEvents((_events: any) => ({ ..._events, onDrag: event.lngLat }));

    setMarker({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat
    });
  }, []);

  const onMarkerDragEnd = useCallback((event: MarkerDragEvent) => {
    logEvents((_events: any) => ({ ..._events, onDragEnd: event.lngLat }));
  }, []);

  return (
    <>
      <Map initialViewState={{ latitude: 21.2335611, longitude: 72.8636084, zoom: 6 }} {...other}>
        <MapControl />
        <MapMarker
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="bottom"
          draggable
          onDragStart={onMarkerDragStart}
          onDrag={onMarkerDrag}
          onDragEnd={onMarkerDragEnd}
        />
      </Map>

      <ControlPanel events={events} />
    </>
  );
}

export default memo(DraggableMarkers);
