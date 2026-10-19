import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/config";

type BrandLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  href?: string;
  priority?: boolean;
  contained?: boolean;
};

export function BrandLogo({
  className,
  width = 280,
  height = Math.round(width * 2 / 3),
  href,
  priority = false,
  contained = false,
}: BrandLogoProps) {
  const image = (
    <Image
      src={siteConfig.logo}
      alt={siteConfig.name}
      width={width}
      height={height}
      preload={priority}
      className={cn("h-auto w-auto max-w-full", className)}
    />
  );

  const content = contained ? (
    <span className="inline-flex rounded-xl bg-navy px-3 py-1.5">
      {image}
    </span>
  ) : (
    image
  );

  if (href) {
    return (
      <Link href={href} className="inline-block shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
