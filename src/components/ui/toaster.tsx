import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
        },
        classNames: {
          success: 'text-green-600',
          error: 'text-red-600',
          warning: 'text-yellow-600',
          info: 'text-blue-600',
        },
      }}
      richColors
      closeButton
    />
  );
}
