export default function CloseIcon({ width='24', height='24', primary= false }) {

  const style = primary ? 'cursor-pointer stroke-primary' : 'cursor-pointer stroke-base-content'

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={style}
    >
      <path
        className={style}
        d="M18 6L6 18"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6L18 18"
        className={style}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
