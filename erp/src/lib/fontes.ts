import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--fonte-corpo", display: "swap" });
export const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--fonte-titulo",
  display: "swap",
});
export const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--fonte-mono", display: "swap" });
