import * as React from 'react'
const SvgComponent = (props) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x={1.5}
      y={1.5}
      width={5.5}
      height={5.5}
      rx={1}
      stroke="currentColor"
    />
    <rect x={9} y={1.5} width={5.5} height={5.5} rx={1} stroke="currentColor" />
    <rect x={1.5} y={9} width={5.5} height={5.5} rx={1} stroke="currentColor" />
    <path d="M9.5 11.75H14" stroke="currentColor" strokeLinecap="round" />
    <path d="M11.75 14V9.5" stroke="currentColor" strokeLinecap="round" />
  </svg>
)
export default SvgComponent
