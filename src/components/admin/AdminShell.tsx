"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CalendarCheck2, ClipboardList, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import styles from "./admin-shell.module.css";

export function AdminShell({ children, email, superAdmin, signOutAction }: {
  children: ReactNode; email: string; superAdmin: boolean; signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const inBookings = pathname.startsWith("/admin/bookings");
  const inQuote = pathname.startsWith("/admin/quotes/");
  return (
    <div className={styles.workspace}>
      <a href="#admin-content" className={styles.skip}>Skip to workspace</a>
      <aside className={styles.sidebar} aria-label="Admin navigation">
        <div className={styles.brand}><BrandLogo href="/admin" priority width={144} height={96} /><span>BUSINESS WORKSPACE</span></div>
        <p className={styles.navLabel}>MANAGE</p>
        <nav className={styles.navigation}>
          <Link href="/admin" aria-current={!inBookings ? "page" : undefined} className={!inBookings ? styles.active : ""}><ClipboardList size={18} />Enquiries & quotes</Link>
          <Link href="/admin/bookings" aria-current={inBookings ? "page" : undefined} className={inBookings ? styles.active : ""}><CalendarCheck2 size={18} />Paid bookings</Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.brandNote}><Sparkles size={21} /><p>Clean spaces.<br /><strong>Good business.</strong></p><span>Your enquiries, quotes and payments in one place.</span></div>
          <a href="/" target="_blank" rel="noreferrer" className={styles.website}>View website<ArrowUpRight size={16} /></a>
          <form action={signOutAction}><button type="submit" className={styles.signOut}><LogOut size={16} />Sign out</button></form>
        </div>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>Workspace</span><span>/</span><strong>{inBookings ? "Paid bookings" : inQuote ? "Quote review" : "Enquiries & quotes"}</strong></div>
          <div className={styles.account}><span className={styles.avatar}>{email.charAt(0).toUpperCase()}</span><div><strong>{superAdmin ? "Super admin" : "Administrator"}</strong><span>{email}</span></div><ShieldCheck size={16} /></div>
        </header>
        <div id="admin-content" className={styles.content} tabIndex={-1}>{children}</div>
        <footer className={styles.footer}><span>GoodyCleaning · Admin workspace</span><a href="mailto:support@goodyvan.com">support@goodyvan.com</a></footer>
      </div>
    </div>
  );
}
