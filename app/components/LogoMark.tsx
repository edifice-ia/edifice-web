import Image from "next/image";

type LogoMarkProps = {
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

const sizes = {
  sm: "size-10",
  md: "size-14",
  lg: "size-44 sm:size-56",
};

const imageSizes = {
  sm: 40,
  md: 56,
  lg: 224,
};

export function LogoMark({ size = "md", priority = false }: LogoMarkProps) {
  return (
    <span
      className={`${sizes[size]} relative block overflow-hidden rounded-[18%] border border-[#223149] bg-[#070B12] shadow-[0_0_28px_rgba(56,189,248,0.18)]`}
    >
      <Image
        src="/edifice-logo-cyan.png"
        alt="Logo L’Édifice"
        width={imageSizes[size]}
        height={imageSizes[size]}
        priority={priority}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
