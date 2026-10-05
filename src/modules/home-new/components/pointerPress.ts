import type { FocusEvent, PointerEvent } from "react"
import styles from "./home-new.module.css"

function release(event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) {
  event.currentTarget.classList.remove(styles.pointerPress)
}

/** Pointer presses get tactile feedback; keyboard activation stays immediate. */
export const pointerPressHandlers = {
  onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button === 0) event.currentTarget.classList.add(styles.pointerPress)
  },
  onPointerUp: release,
  onPointerCancel: release,
  onPointerLeave: release,
  onBlur: release,
}
