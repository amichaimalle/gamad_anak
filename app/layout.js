import './globals.css';

export const metadata = {
  title: 'גמד ענק – משפחת מלא-מלאך-מלמד',
  description: 'משחק הגמד ענק של משפחת מלא-מלאך-מלמד',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B2A78',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Rubik:wght@400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
