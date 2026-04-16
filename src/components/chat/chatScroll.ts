export function getDistanceToHistoryTop(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  isReversed: boolean,
) {
  return isReversed ? scrollHeight + scrollTop - clientHeight : scrollTop;
}

export function shouldShowScrollToBottom(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  isReversed: boolean,
  threshold = 160,
) {
  if (isReversed) {
    return scrollTop < -threshold;
  }
  return scrollHeight - clientHeight - scrollTop > threshold;
}

export function shouldKeepAutoScroll(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  isReversed: boolean,
  threshold = 8,
) {
  if (isReversed) {
    return scrollTop >= -threshold;
  }
  return scrollHeight - clientHeight - scrollTop <= threshold;
}
