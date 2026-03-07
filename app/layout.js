import { ToastContainer } from "react-toastify";
import "./globals.css";
import Providers from "./providers";
export const metadata = {
  title: "Appitor - Modern School Management System | Best-in-Class ERP",
  description: "Empower your institution with Appitor, the all-in-one school management software. Seamlessly manage attendance, exams, fees, and communication in one intuitive ERP.",
  keywords: "school management system, education erp, attendance software, exam portal, fee management system, student information system, academic management, institutional sync",
  authors: [{ name: "Appitor Team" }],
  openGraph: {
    title: "Appitor - The Future of Institutional Management",
    description: "Scale your institution with absolute clarity. Experience the most intuitive school management ERP.",
    type: "website",
    url: "https://appitor.com",
    siteName: "Appitor",
  },
  twitter: {
    card: "summary_large_image",
    title: "Appitor - Modern School ERP",
    description: "Transforming Education. One Institution at a Time.",
  },
  icons: {
    icon: "/logo.png",
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"></link>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin></link>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet"></link>
      </head>
      <body
        className={`antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <ToastContainer position="top-right" theme="colored" autoClose={2300} />
      </body>
    </html>
  );
}
