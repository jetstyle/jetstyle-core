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
    <circle
      cx={5.75001}
      cy={5.16255}
      r={2.1681}
      stroke="currentColor"
      strokeLinecap="round"
    />
    <circle
      cx={11.605}
      cy={5.13812}
      r={1.60504}
      stroke="currentColor"
      strokeLinecap="round"
    />
    <path
      d="M10 13.5056V12.0056C10 10.3487 8.65685 9.00555 7 9.00555H4.5C2.84315 9.00555 1.5 10.3487 1.5 12.0056V13.5056"
      stroke="currentColor"
      strokeLinecap="round"
    />
    <path
      d="M10 8.45172H11.5C13.1569 8.45172 14.5 9.79487 14.5 11.4517V11.9517"
      stroke="currentColor"
      strokeLinecap="round"
    />
  </svg>
)
export default SvgComponent
