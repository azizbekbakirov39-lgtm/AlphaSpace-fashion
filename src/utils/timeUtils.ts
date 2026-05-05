
/**
 * Formats a Firestore timestamp or Date into a relative time string.
 * e.g., "hozir", "5m", "2h", "1d"
 */
export const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return 'hozir';
  
  let date: Date;
  
  if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'hozir';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hozir';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} daq.`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} soat`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} kun`;
};
