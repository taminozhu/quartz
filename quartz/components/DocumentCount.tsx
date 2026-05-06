import { QuartzComponent, QuartzComponentConstructor } from "./types"
import style from "./styles/documentCount.scss"
// @ts-ignore
import script from "./scripts/documentCount.inline"

export default (() => {
  const DocumentCount: QuartzComponent = () => {
    return (
      <div class="document-count">
        <div id="doc-count-display">已收录：加载中 ✨</div>
      </div>
    )
  }

  DocumentCount.afterDOMLoaded = script
  DocumentCount.css = style

  return DocumentCount
}) satisfies QuartzComponentConstructor
