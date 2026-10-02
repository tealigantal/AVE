export const MEDIA_EXTENSIONS = Object.freeze(["mp4", "mov", "m4v", "webm", "jpg", "jpeg", "png", "webp", "wav", "mp3", "m4a", "flac"]);
export const MEDIA_ACCEPT = MEDIA_EXTENSIONS.map(extension => `.${extension}`).join(",");
