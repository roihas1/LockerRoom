const DEVICE_KEY = "lr:device";

/** Stable anonymous device id shared by reactions and cliché submissions. */
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
