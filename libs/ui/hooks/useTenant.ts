'use client'
import { useEffect, useState } from 'react'

import { parseLocation } from '../helpers/nav'

export default function useTenant() {
  const [tenant, setTenant] = useState('')

  useEffect(() => {
    const parsed = parseLocation()
    if (parsed && parsed.tenant) {
      setTenant(parsed.tenant)
    }
  }, [])

  return tenant
}
