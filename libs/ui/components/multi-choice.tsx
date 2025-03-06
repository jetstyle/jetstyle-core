import React, { useEffect, useState } from 'react'

type MultiChoiceProps = {
  name: string
  values: Array<{
    value: string
    label: string
  }>
  initialValue: Array<string>
}

// type CheckboxProps = {
//   name: string
//   value: string
//   checked: boolean
//   defaultChecked: boolean
// }

function Checkbox({ name, value, defaultChecked }) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setChecked(defaultChecked)
  }, [defaultChecked])

  return (
    <input
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      onChange={e => setChecked(e.target.checked)}
      className="checkbox"
    />
  )
}

export default function MultiChoice({ name, values, initialValue }: MultiChoiceProps) {
  return (
    <div className="form-control">
      {values.map((i) => (
        <label key={i.value} className="label">
          <Checkbox
            name={name}
            value={i.value}
            defaultChecked={Boolean(initialValue?.indexOf(i.value) > -1)}
          />
          <span className="label-text">{i.label}</span>
        </label>
      ))}
    </div>
  )
}
