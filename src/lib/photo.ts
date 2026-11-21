export const DEFAULT_USER_PHOTO = "/assets/user-photo.jpg";

const PHOTO_KEY = "mona:photo";
const INVALID_KEY = "mona:invalid";

export function storePhoto(dataUrl: string) {
  try {
    sessionStorage.setItem(PHOTO_KEY, dataUrl);
  } catch {
    /* ignore quota errors */
  }
}

export function storeInvalidSimulation(value: boolean) {
  try {
    sessionStorage.setItem(INVALID_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readInvalidSimulation(): boolean {
  try {
    return sessionStorage.getItem(INVALID_KEY) === "1";
  } catch {
    return false;
  }
}

export function readFileAsDataUrl(file: File, onDone: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onDone(reader.result as string);
  reader.readAsDataURL(file);
}
