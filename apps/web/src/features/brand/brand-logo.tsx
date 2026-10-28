import Image from 'next/image';

export function BrandLogo({
  className = 'h-11 w-40',
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        fill
        priority={priority}
        alt="MoneyPilot"
        sizes="(max-width: 640px) 140px, 220px"
        src="/logomoneypilot.png"
        className="object-cover object-center"
      />
    </div>
  );
}
