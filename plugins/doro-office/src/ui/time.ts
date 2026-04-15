const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

export function formatHeartbeatAge(lastHeartbeatAt: string | null, now = Date.now()) {
  if (!lastHeartbeatAt) {
    return 'No heartbeat';
  }

  const timestamp = Date.parse(lastHeartbeatAt);
  if (Number.isNaN(timestamp)) {
    return 'Heartbeat unavailable';
  }

  const diff = Math.max(0, now - timestamp);

  if (diff < minuteMs) {
    return 'just now';
  }

  if (diff < hourMs) {
    return `${Math.floor(diff / minuteMs)}m ago`;
  }

  if (diff < dayMs) {
    return `${Math.floor(diff / hourMs)}h ago`;
  }

  return `${Math.floor(diff / dayMs)}d ago`;
}
