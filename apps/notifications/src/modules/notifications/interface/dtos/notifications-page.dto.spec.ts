import { NotificationsPageDto } from './notifications-page.dto';

describe('NotificationsPageDto', () => {
  it('uses the history response shape expected by the web app', () => {
    const dto: NotificationsPageDto = {
      items: [],
      nextCursor: null,
      unreadCount: 0,
    };

    expect(dto).toEqual({
      items: [],
      nextCursor: null,
      unreadCount: 0,
    });
  });
});
