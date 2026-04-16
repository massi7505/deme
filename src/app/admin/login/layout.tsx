export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override the admin layout — login page has no sidebar
  return <>{children}</>;
}
