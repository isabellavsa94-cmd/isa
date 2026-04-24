export const chromeStorage = {
  getItem: (key: string): Promise<string | null> =>
    new Promise((resolve) =>
      chrome.storage.local.get([key], (res) => resolve((res[key] as string) ?? null)),
    ),
  setItem: (key: string, value: string): Promise<void> =>
    new Promise((resolve) =>
      chrome.storage.local.set({ [key]: value }, () => resolve()),
    ),
  removeItem: (key: string): Promise<void> =>
    new Promise((resolve) =>
      chrome.storage.local.remove([key], () => resolve()),
    ),
};
