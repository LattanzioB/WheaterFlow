import type { AlertType, Notification } from '../api/types';

export interface NotificationPageFilters {
  alertTypes: AlertType[];
  stationId: string;
  unreadOnly: boolean;
}

export function filterNotifications(
  notifications: Notification[],
  filters: NotificationPageFilters,
): Notification[] {
  return notifications.filter((notification) => {
    const matchesAlertType =
      filters.alertTypes.length === 0 ||
      filters.alertTypes.includes(notification.alertType);
    const matchesStation =
      filters.stationId === '' || notification.stationId === filters.stationId;
    const matchesReadState = !filters.unreadOnly || !notification.readAt;

    return matchesAlertType && matchesStation && matchesReadState;
  });
}

export function toggleAlertType(
  selected: AlertType[],
  alertType: AlertType,
): AlertType[] {
  if (selected.includes(alertType)) {
    return selected.filter((type) => type !== alertType);
  }

  return [...selected, alertType];
}
