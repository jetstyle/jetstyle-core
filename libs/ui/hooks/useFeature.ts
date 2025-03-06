import useConfig from './useConfig'

export default function useFeature(featureName: string): boolean {
  const config = useConfig()

  const storageFeatureKey = `feature${featureName}`
  if (localStorage.getItem(storageFeatureKey) === 'true') {
    return true
  }

  return config?.features?.[featureName]
}
