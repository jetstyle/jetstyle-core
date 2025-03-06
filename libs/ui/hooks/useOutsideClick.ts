import { useEffect, RefObject } from 'react'

function useOutsideClick(
  ref: RefObject<HTMLElement>,
  onOutsideClick: any,
  shouldIgnore: (target: any) => boolean = () => false,
  ignoreElements?: RefObject<HTMLElement>[] | null,
) {
  useEffect(() => {
    const handleClick = (event: any) => {
      const { target } = event

      if (ref.current && !ref.current.contains(target)) {
        if (!shouldIgnore(target)) {
          if (ignoreElements) {
            ignoreElements.map((element: RefObject<HTMLElement>) => {
              if (element.current && !element.current.contains(target)) {
                onOutsideClick()
              }
            })
          } else {
            onOutsideClick()
          }
        }
      }
    }

    document.addEventListener('mousedown', handleClick)

    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [ref, onOutsideClick, shouldIgnore, ignoreElements])
}

export default useOutsideClick
