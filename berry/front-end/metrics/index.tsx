// @project
import GTag from './GTag';
import MicrosoftClarity from './MicrosoftClarity';
import Notify from './Notify';

const clarityId = import.meta.env.VITE_APP_PUBLIC_CLARITY_ID || '';
const notifyId = import.meta.env.VITE_APP_PUBLIC_NOTIFY_ID || '';
const gaId = import.meta.env.VITE_APP_PUBLIC_ANALYTICS_ID || '';

/***************************  METRICS  ***************************/

export default function Metrics() {
  return (
    <>
      {clarityId && <MicrosoftClarity clarityId={clarityId} />}
      {notifyId && <Notify notifyId={notifyId} />}
      {gaId && <GTag gaId={gaId} />}
    </>
  );
}
