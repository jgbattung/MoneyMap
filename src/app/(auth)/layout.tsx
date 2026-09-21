/**
 * Sign-in and sign-up render outside the app shell: no sidebar gutter, no bottom bar.
 * `globals.css` sets `overflow-hidden` on `body`, so this owns its own scrolling.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="h-[100dvh] overflow-y-auto">{children}</main>;
}
