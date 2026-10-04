import styles from './tools-theme.module.css'

/** Decorative drafting marks keep the workbench grounded in measuring and planning. */
export function ToolsBackgroundPattern() {
  return (
    <>
      <svg className={styles.draftingPattern} viewBox="0 0 1440 1000" fill="none" focusable="false">
        <g className={styles.leftCompass}>
          <circle cx="-58" cy="344" r="250" />
          <circle cx="-58" cy="344" r="212" strokeDasharray="2 12" />
          <circle cx="-58" cy="344" r="176" />
          <path d="M-58 58V630M-344 344H228M-236 166L120 522M-236 522L120 166" strokeDasharray="4 10" />
          <path d="M184 283L204 278M191 319L211 317M191 367L211 369M184 405L204 410M167 451L185 460M144 490L161 502" />
          <circle cx="120" cy="166" r="5" />
          <path d="M111 166H129M120 157V175" />
        </g>
        <g className={styles.rightCompass}>
          <circle cx="1380" cy="308" r="244" />
          <circle cx="1380" cy="308" r="205" strokeDasharray="7 14" />
          <circle cx="1380" cy="308" r="155" />
          <path d="M1090 308H1670M1380 18V598" strokeDasharray="3 10" />
          <path d="M1136 308A244 244 0 0 1 1380 64" strokeWidth="3" />
          <path d="M1138 246L1119 241M1159 196L1142 187M1190 150L1175 137M1232 114L1220 97M1282 88L1274 69M1330 69L1326 49" />
          <path d="M1368 308H1392M1380 296V320" />
        </g>
        <g className={styles.measureMarks}>
          <path d="M46 112V756M40 112H58M40 176H52M40 240H58M40 304H52M40 368H58M40 432H52M40 496H58M40 560H52M40 624H58M40 688H52M40 756H58" />
          <path d="M335 83H1095M335 77V95M430 77V89M525 77V95M620 77V89M715 77V95M810 77V89M905 77V95M1000 77V89M1095 77V95" />
          <path d="M108 708H128M118 698V718M1284 638H1304M1294 628V648M970 122H986M978 114V130" />
          <circle cx="118" cy="708" r="20" strokeDasharray="2 5" />
          <circle cx="1294" cy="638" r="20" strokeDasharray="2 5" />
        </g>
        <g className={styles.diagramMarks}>
          <path d="M1295 738L1348 707L1401 738V800L1348 831L1295 800ZM1295 738L1348 769L1401 738M1348 769V831M1348 707V769" />
          <path d="M1241 855H1424M1241 845V865M1424 845V865M1241 851L1249 855L1241 859M1424 851L1416 855L1424 859" />
          <path d="M88 858H182V923H88ZM88 878H182M110 858V923M136 858V923M162 858V923" />
          <path d="M202 889H254M238 877L254 889L238 901" strokeDasharray="3 5" />
          <circle cx="276" cy="889" r="20" />
          <path d="M267 889L273 895L285 882" />
        </g>
      </svg>
      <svg className={styles.contourPattern} viewBox="0 0 1440 1000" fill="none" focusable="false">
        <g>
          <path d="M-240 160C210-50 30 390 288 425S568 315 550 575S248 740 405 1030" />
          <path d="M-240 192C182-2 10 413 260 455S534 352 516 590S223 764 363 1030" />
          <path d="M-240 224C155 45-10 436 232 485S500 389 482 605S198 788 321 1030" />
          <path d="M-240 256C127 92-30 459 204 515S466 426 448 620S173 812 279 1030" />
          <path d="M-240 288C100 139-50 482 176 545S432 463 414 635S148 836 237 1030" />
          <path d="M-240 320C72 186-70 505 148 575S398 500 380 650S123 860 195 1030" />
        </g>
        <g>
          <path d="M1660-160C1120 110 1550 285 1264 448S1130 665 1390 753S1620 986 1320 1120" />
          <path d="M1660-118C1155 133 1580 302 1301 472S1168 679 1418 780S1660 1003 1360 1120" />
          <path d="M1660-76C1190 156 1610 319 1338 496S1206 693 1446 807S1700 1020 1400 1120" />
          <path d="M1660-34C1225 179 1640 336 1375 520S1244 707 1474 834S1740 1037 1440 1120" />
          <path d="M1660 8C1260 202 1670 353 1412 544S1282 721 1502 861S1780 1054 1480 1120" />
        </g>
      </svg>
      <div className={styles.paperHatch} />
    </>
  )
}
