import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../notifications/NotificationsContext';
import type { LiveArrival } from '../notifications/notifications-state';
import { Toast } from './Toast';

export function ToastHost() {
  const { latestLiveArrival, clearLatestLiveArrival } = useNotifications();
  const [activeArrival, setActiveArrival] = useState<LiveArrival | null>(null);
  const seenSequenceRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (
      !latestLiveArrival ||
      latestLiveArrival.sequence === seenSequenceRef.current
    ) {
      return;
    }

    seenSequenceRef.current = latestLiveArrival.sequence;
    setActiveArrival(latestLiveArrival);
  }, [latestLiveArrival]);

  const dismiss = useCallback(() => {
    setActiveArrival(null);
    clearLatestLiveArrival();
  }, [clearLatestLiveArrival]);

  if (!activeArrival) {
    return null;
  }

  return (
    <Toast
      key={activeArrival.sequence}
      notification={activeArrival.notification}
      onDismiss={dismiss}
      onClick={() => {
        navigate(`/stations/${activeArrival.notification.stationId}`);
        dismiss();
      }}
    />
  );
}
