import { describe, expect, it } from 'vitest';
import {
  getDistanceToHistoryTop,
  shouldKeepAutoScroll,
  shouldShowScrollToBottom,
} from '../chatScroll';

describe('chat scroll helpers', () => {
  it('treats reversed bubble scroll near zero as the latest-message position', () => {
    expect(shouldShowScrollToBottom(2000, 0, 800, true)).toBe(false);
    expect(shouldShowScrollToBottom(2000, -80, 800, true)).toBe(false);
    expect(shouldShowScrollToBottom(2000, -240, 800, true)).toBe(true);
  });

  it('measures distance to the logical history top for auto-loading older pages', () => {
    expect(getDistanceToHistoryTop(2000, -1200, 800, true)).toBe(0);
    expect(getDistanceToHistoryTop(2000, 0, 800, true)).toBe(1200);
    expect(getDistanceToHistoryTop(2000, 0, 800, false)).toBe(0);
  });

  it('stops auto-scroll as soon as the user meaningfully leaves the bottom', () => {
    expect(shouldKeepAutoScroll(2000, 0, 800, true)).toBe(true);
    expect(shouldKeepAutoScroll(2000, -12, 800, true)).toBe(false);
    expect(shouldKeepAutoScroll(2000, 1200, 800, false)).toBe(true);
    expect(shouldKeepAutoScroll(2000, 1180, 800, false)).toBe(false);
  });
});
