type DataLayerValue = string | number | boolean | null | undefined

type DataLayerPayload = {
  event: string
} & Record<string, DataLayerValue>

type WindowWithDataLayer = Window & {
  dataLayer?: DataLayerPayload[]
}

export function pushDataLayerEvent(payload: DataLayerPayload) {
  if (typeof window === 'undefined') return

  const targetWindow = window as WindowWithDataLayer
  targetWindow.dataLayer = targetWindow.dataLayer || []
  targetWindow.dataLayer.push(payload)
}
