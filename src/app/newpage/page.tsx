import { permanentRedirect } from "next/navigation"

export default function NewPageRedirect() {
  permanentRedirect("/")
}
