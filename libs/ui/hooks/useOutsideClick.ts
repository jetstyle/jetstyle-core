import { useEffect, RefObject } from 'react'

function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutsideClick: any,
  shouldIgnore: (target: any) => boolean = () => false,
  ignoreElements?: RefObject<HTMLElement | null>[] | null,
) {
  useEffect(() => {
    const handleClick = (event: any) => {
      const { target } = event

      if (ref.current && !ref.current.contains(target)) {
        if (!shouldIgnore(target)) {
          if (ignoreElements) {
            ignoreElements.map((element: RefObject<HTMLElement | null>) => {
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
