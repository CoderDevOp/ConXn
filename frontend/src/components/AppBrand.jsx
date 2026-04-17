import { useId } from 'react'

export function AppBrand({
  className = '',
  iconClassName = 'h-7 w-7',
  textClassName = 'text-base font-semibold tracking-tight',
  withText = true,
}) {
  const gid = useId()

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        className={iconClassName}
        role="img"
        aria-label="ConXn logo"
      >
        <defs>
          <linearGradient id={`${gid}-g`} x1="8" y1="8" x2="56" y2="56">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="55%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${gid}-g)`} />
        <path
          d="M18 43 L31 30 L45 38"
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="43" r="4.4" fill="white" />
        <circle cx="31" cy="30" r="4.4" fill="white" />
        <circle cx="45" cy="38" r="4.4" fill="white" />
      </svg>
      {withText ? <span className={textClassName}>ConXn</span> : null}
    </span>
  )
}
