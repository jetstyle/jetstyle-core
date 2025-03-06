import useSWR  from 'swr'
import { fetchResource } from '../helpers/api'

type UseFetchOptions = {
  apiService?: string
  noAuth?: boolean
  query?: Record<string, string>
}

export default function useFetch<T>(
  apiPath: string,
  options?: UseFetchOptions,
  dependencies: any[] = []
) {
  const fetcher = async (apiPath: string) => {
    const resp = await fetchResource({
      apiPath,
      apiService: options?.apiService ?? '',
      query: options?.query,
    })
    if (resp.err != null) {
      throw new Error(resp.err)
    }
    return resp.value
  }
  const key = [apiPath, ...dependencies].join('|')
  const { data, error, isLoading } = useSWR(key, () => fetcher(apiPath))
  return {
    data: isLoading ? null : data as T,
    error,
    isLoading
  }
}
