import { useEffect, useState } from 'react'
import { fetchConfig } from '../helpers/api'

const CONFIG_PATH = process.env.NEXT_PUBLIC_CONFIG_PATH

export default function useConfig() {
  const configPath = CONFIG_PATH ? CONFIG_PATH : '/config'
  const [config, setConfig] = useState<null | any>(null)

  const loadConfig = async () => {
    const config = await fetchConfig()
    setConfig(config)
  }

  useEffect(() => {
    loadConfig()
  }, [configPath])

  if (config === null) {
    return {
      isReady: false
    }
  }

  return {
    ...config,
    isReady: true
  }
}
