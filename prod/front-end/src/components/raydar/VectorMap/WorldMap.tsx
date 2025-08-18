import BaseVectorMap from './BaseVectorMap';

interface WorldMapProps {
  height?: string;
  width?: string;
  className?: string;
  options?: any;
}

const WorldMap = ({ height = '400px', width = '100%', className, options }: WorldMapProps) => {
  const defaultOptions = {
    zoomOnScroll: false,
    zoomButtons: true,
    markersSelectable: true,
    markers: [
      { name: 'Jerusalem', coords: [31.7683, 35.2137] },
      { name: 'Constantinople', coords: [41.0082, 28.9784] },
      { name: 'Moscow', coords: [55.7558, 37.6176] },
      { name: 'Athens', coords: [37.9838, 23.7275] },
    ],
    markerStyle: {
      initial: {
        fill: '#dc3545',
        stroke: '#fff',
        'stroke-width': 2,
        r: 5,
      },
      hover: {
        fill: '#198754',
        cursor: 'pointer',
      },
    },
    ...options,
  };

  return (
    <BaseVectorMap
      type="world"
      height={height}
      width={width}
      className={className}
      options={defaultOptions}
    />
  );
};

export default WorldMap;