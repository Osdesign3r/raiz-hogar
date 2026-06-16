"use client";

import Link from "next/link";
import { Home, Wallet, Users, Calendar, Settings } from "lucide-react";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800">
      <div className="max-w-md mx-auto flex justify-around py-3">
        <Link href="/">
          <Home />
        </Link>

        <Link href="/finanzas">
          <Wallet />
        </Link>

        <Link href="/familia">
          <Users />
        </Link>

        <Link href="/calendario">
          <Calendar />
        </Link>

        <Link href="/configuracion">
          <Settings />
        </Link>
      </div>
    </nav>
  );
}