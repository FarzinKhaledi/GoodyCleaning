"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const links = [{href:"#services",label:"Our services"},{href:"#why-us",label:"Why Goody?"},{href:"#how-it-works",label:"How it works"},{href:"#faq",label:"FAQs"}];

export function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } }
    function onOutside(event: PointerEvent) { if (!menuRef.current?.contains(event.target as Node) && !toggleRef.current?.contains(event.target as Node)) setOpen(false); }
    const media = window.matchMedia("(min-width: 1024px)");
    function onResize() { if (media.matches) setOpen(false); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onOutside);
    media.addEventListener("change", onResize);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onOutside); media.removeEventListener("change", onResize); };
  }, [open]);

  return (
    <header className="site-header">
      <div className="section-shell flex h-[112px] items-center justify-between gap-5">
        <a href="#hero" aria-label="GoodyCleaning home" className="original-logo header-original-logo">
          <BrandLogo width={480} height={320} priority />
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex">{links.map(link=><a key={link.href} href={link.href} className="nav-link">{link.label}</a>)}</nav>
        <div className="flex items-center gap-3"><a href="#booking" className="header-book-button group">Book a clean <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></a><button ref={toggleRef} type="button" onClick={()=>setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#102c43]/15 lg:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
      </div>
      {open && <div ref={menuRef} id="mobile-navigation" className="mobile-navigation"><nav aria-label="Mobile navigation" className="section-shell flex flex-col gap-1 py-4">{links.map(link=><a key={link.href} href={link.href} onClick={()=>setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#2457e8]/5 hover:text-[#2457e8]">{link.label}</a>)}<a href="#booking" onClick={()=>setOpen(false)} className="mt-2 rounded-xl bg-[#2457e8] px-3 py-3 text-sm font-semibold text-white">Find your clean ↗</a></nav></div>}
    </header>
  );
}
