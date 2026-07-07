import {
  clampPage,
  pageToOffset,
  paginate,
  totalPages,
} from './data-collections-page-state';

describe('data collections page state', () => {
  it('computes total pages rounding up and never below one', () => {
    expect(totalPages(0, 10)).toBe(1);
    expect(totalPages(10, 10)).toBe(1);
    expect(totalPages(11, 10)).toBe(2);
    expect(totalPages(25, 10)).toBe(3);
  });

  it('clamps the page inside the valid range', () => {
    expect(clampPage(0, 25, 10)).toBe(1);
    expect(clampPage(2, 25, 10)).toBe(2);
    expect(clampPage(9, 25, 10)).toBe(3);
  });

  it('paginates a collection client-side', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    expect(paginate(items, 1, 2)).toEqual(['a', 'b']);
    expect(paginate(items, 3, 2)).toEqual(['e']);
    expect(paginate(items, 8, 2)).toEqual(['e']);
    expect(paginate([], 1, 2)).toEqual([]);
  });

  it('translates a page number into the offset sent to the API', () => {
    expect(pageToOffset(1, 10)).toBe(0);
    expect(pageToOffset(3, 10)).toBe(20);
    expect(pageToOffset(0, 10)).toBe(0);
  });
});
