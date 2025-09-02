import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'ShopifyClone - Build Your Online Store',
  description: 'Create and manage your online store with our powerful e-commerce platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}