'use client';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

// Signal Desktop avatar color palette (bg/fg pairs)
const AVATAR_COLORS = [
  { bg: '#e3e3fe', fg: '#3838f5' },
  { bg: '#dde7fc', fg: '#1251d3' },
  { bg: '#d8e8f0', fg: '#086da0' },
  { bg: '#cde4cd', fg: '#067906' },
  { bg: '#eae0fd', fg: '#661aff' },
  { bg: '#f5e3fe', fg: '#9f00f0' },
  { bg: '#f6d8ec', fg: '#b8057c' },
  { bg: '#f5d7d7', fg: '#be0404' },
  { bg: '#fef5d0', fg: '#836b01' },
  { bg: '#eae6d5', fg: '#7d6f40' },
  { bg: '#d2d2dc', fg: '#4f4f6d' },
  { bg: '#d7d7d9', fg: '#5c5c5c' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColor(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Avatar({ name, src, size = 'md', online }: AvatarProps) {
  const color = getColor(name);

  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeMap[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeMap[size]} rounded-full flex items-center justify-center font-semibold`}
          style={{ backgroundColor: color.bg, color: color.fg }}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-primary ${
            online ? 'bg-success' : 'bg-label-tertiary'
          }`}
        />
      )}
    </div>
  );
}
