declare module '@editorjs/header' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs'

  interface HeaderConfig {
    placeholder?: string
    levels?: number[]
    defaultLevel?: number
  }

  interface HeaderData {
    text: string
    level: number
  }

  export default class Header implements BlockTool {
    constructor(options: BlockToolConstructorOptions<HeaderData, HeaderConfig>)
    render(): HTMLElement
    save(block: HTMLElement): HeaderData
    static get toolbox(): { title: string; icon: string }
  }
}

declare module '@editorjs/list' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs'

  interface ListConfig {
    defaultStyle?: 'ordered' | 'unordered'
  }

  interface ListData {
    style: 'ordered' | 'unordered'
    items: string[]
  }

  export default class List implements BlockTool {
    constructor(options: BlockToolConstructorOptions<ListData, ListConfig>)
    render(): HTMLElement
    save(block: HTMLElement): ListData
    static get toolbox(): { title: string; icon: string }
  }
}

declare module '@editorjs/paragraph' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs'

  interface ParagraphConfig {
    placeholder?: string
    preserveBlank?: boolean
  }

  interface ParagraphData {
    text: string
  }

  export default class Paragraph implements BlockTool {
    constructor(options: BlockToolConstructorOptions<ParagraphData, ParagraphConfig>)
    render(): HTMLElement
    save(block: HTMLElement): ParagraphData
    static get toolbox(): { title: string; icon: string }
  }
}

declare module '@editorjs/delimiter' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs'

  export default class Delimiter implements BlockTool {
    constructor(options: BlockToolConstructorOptions)
    render(): HTMLElement
    save(block: HTMLElement): object
    static get toolbox(): { title: string; icon: string }
  }
}

declare module '@editorjs/quote' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs'

  interface QuoteConfig {
    quotePlaceholder?: string
    captionPlaceholder?: string
  }

  interface QuoteData {
    text: string
    caption: string
    alignment: 'left' | 'center'
  }

  export default class Quote implements BlockTool {
    constructor(options: BlockToolConstructorOptions<QuoteData, QuoteConfig>)
    render(): HTMLElement
    save(block: HTMLElement): QuoteData
    static get toolbox(): { title: string; icon: string }
  }
}

declare module '@editorjs/image' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs'

  interface ImageConfig {
    endpoints?: {
      byFile?: string
      byUrl?: string
    }
    field?: string
    types?: string
    additionalRequestHeaders?: Record<string, string>
    uploader?: {
      uploadByFile?: (file: File) => Promise<{ success: number; file: { url: string } }>
      uploadByUrl?: (url: string) => Promise<{ success: number; file: { url: string } }>
    }
  }

  interface ImageData {
    file: {
      url: string
    }
    caption?: string
    withBorder?: boolean
    stretched?: boolean
    withBackground?: boolean
  }

  export default class Image implements BlockTool {
    constructor(options: BlockToolConstructorOptions<ImageData, ImageConfig>)
    render(): HTMLElement
    save(block: HTMLElement): ImageData
    static get toolbox(): { title: string; icon: string }
  }
}
