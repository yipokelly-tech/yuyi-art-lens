import type {Metadata,Viewport} from "next";import "./globals.css";
export const metadata:Metadata={title:"羽儀畫作解析",description:"拍下畫作，讀懂風格、色彩與構圖。",manifest:"/manifest.webmanifest",icons:{icon:"/icon.svg"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#f4f0e7"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
