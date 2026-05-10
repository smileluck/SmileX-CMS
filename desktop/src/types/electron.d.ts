export {};

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      onTabNavigate: (callback: (data: { shift: boolean }) => void) => void;
      removeTabNavigateListener: () => void;
    };
  }
}
