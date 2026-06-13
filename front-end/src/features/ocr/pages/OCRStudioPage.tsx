/**
 * Legacy OCR Studio hub — redirects to the new Figma-based OCR Studio shell.
 */
import { Navigate, useLocation } from 'react-router-dom';

export default function OCRStudioPage() {
  const { pathname } = useLocation();
  const target = pathname.startsWith('/portal')
    ? '/portal/ocr'
    : '/devel/ocr-studio';
  return <Navigate to={target} replace />;
}
