import { Outlet } from 'react-router-dom';

// project imports
import Customization from '../Customization';

// ==============================|| MINIMAL LAYOUT ||============================== //

export default function MinimalLayout() {
  return (
    <>
      <Outlet />
      <Customization />
    </>
  );
}
