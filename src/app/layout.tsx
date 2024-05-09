import "./globals.css";

export const metadata = {
  title: "ITMO Edit worktime",
  description: "Edit worktime for ITMO University employees",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
