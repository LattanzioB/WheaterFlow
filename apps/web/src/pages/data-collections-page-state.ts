export type CollectionKey =
  | 'users'
  | 'stations'
  | 'measurements'
  | 'profiles'
  | 'notifications';

export const COLLECTION_KEYS: CollectionKey[] = [
  'users',
  'stations',
  'measurements',
  'profiles',
  'notifications',
];

export const COLLECTION_LABELS: Record<CollectionKey, string> = {
  users: 'Usuarios',
  stations: 'Estaciones',
  measurements: 'Mediciones',
  profiles: 'Perfiles de notificación',
  notifications: 'Notificaciones',
};

export function totalPages(totalItems: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPage(
  page: number,
  totalItems: number,
  pageSize: number,
): number {
  return Math.min(Math.max(1, page), totalPages(totalItems, pageSize));
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const currentPage = clampPage(page, items.length, pageSize);
  const start = (currentPage - 1) * pageSize;

  return items.slice(start, start + pageSize);
}

export function pageToOffset(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}
