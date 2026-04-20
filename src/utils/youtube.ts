export const getYouTubeVideoId = (url: string): string | null => {
  try {
    const match =
      url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) ||
      url.match(/[?&]v=([a-zA-Z0-9_-]+)/) ||
      url.match(/\/shorts\/([a-zA-Z0-9_-]+)/) ||
      url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return null;
};

export const getYouTubeEmbedUrl = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  if (videoId)
    return `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1&autoplay=1`;
  return url;
};
