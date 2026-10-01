import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "고은사진미술관",
  description: "고은사진미술관",
};

export default function RootLayout({children}: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
