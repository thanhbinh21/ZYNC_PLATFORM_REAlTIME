interface BrandLogoProps {
  brand: string;
}

export function BrandLogo({ brand }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[52px] font-bold leading-none tracking-tight text-[#3fe2b0]">{brand}</span>
    </div>
  );
}
