import { MyLoansView } from "./my-loans-view";

// Halaman ini menunggu AuthProvider memuat profil pengguna sebelum merender konten.
export const instant = false;

export default function MyLoansPage() {
  return <MyLoansView />;
}
