import type { JSX } from 'react'

/** The popover's only vector: 12px chevron-down per the design spec. */
export function ChevronDown(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/** Open-in-browser affordance on a row (left of the chevron). */
export function OpenExternal(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
    </svg>
  )
}

/* Strip action icons — inlined from design/icons/*.svg (the user's picked
   set). Monochrome ones use currentColor so they follow the theme; the
   colored ones keep their source fills. */

/** Open in browser (design/icons/open.svg). */
export function OpenAction(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24">
      <g transform="matrix(1.2,0,0,1.2,-2.4004,-2.4)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.004 10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H15a1 1 0 1 0 0 2h3.59l-8.607 8.607a1 1 0 0 0 1.414 1.414l8.607-8.607V9a1 1 0 0 0 1 1M5 5a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-6a1 1 0 1 0-2 0v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h6a1 1 0 1 0 0-2z"
        />
      </g>
    </svg>
  )
}

/** Open in editor — </> brackets (design/icons/editor.svg). */
export function Editor(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24">
      <g transform="matrix(1.09,0,0,1.09,-1.08,-1.0784)">
        <path
          fill="currentColor"
          d="m1.293 12.707 4 4a1 1 0 1 0 1.414-1.414L3.414 12l3.293-3.293a1 1 0 1 0-1.414-1.414l-4 4a1 1 0 0 0 0 1.414M18.707 7.293a1 1 0 1 0-1.414 1.414L20.586 12l-3.293 3.293a1 1 0 1 0 1.414 1.414l4-4a1 1 0 0 0 0-1.414zM13.039 4.726l-4 14a1 1 0 0 0 .686 1.236A1 1 0 0 0 10 20a1 1 0 0 0 .961-.726l4-14a1 1 0 1 0-1.922-.548"
        />
      </g>
    </svg>
  )
}

/** Start — green play (design/icons/start.svg). */
export function Start(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 163.861 163.861">
      <path
        fill="#5aba1e"
        d="M34.857 3.613C20.084-4.861 8.107 2.081 8.107 19.106v125.637c0 17.042 11.977 23.975 26.75 15.509L144.67 97.275c14.778-8.477 14.778-22.211 0-30.686z"
      />
    </svg>
  )
}

/** Stop — amber rounded square (design/icons/down.svg). One concept in this
 *  UI: bring the stack down without destroying anything (red = destroy). */
export function StopSquare(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24">
      <g transform="matrix(1.37,0,0,1.37,-4.44,-4.44)">
        <path
          fill="#e09e32"
          d="M6 3.25A2.75 2.75 0 0 0 3.25 6v12A2.75 2.75 0 0 0 6 20.75h12A2.75 2.75 0 0 0 20.75 18V6A2.75 2.75 0 0 0 18 3.25z"
        />
      </g>
    </svg>
  )
}

/** GitHub PR — fork glyph (design/icons/github.svg). */
export function GitHub(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24">
      <g transform="matrix(1.19,0,0,1.19,-2.2285,-2.2796)">
        <path
          fill="currentColor"
          d="M19.458 5a3 3 0 1 0-4.478 2.6A2.6 2.6 0 0 1 12.4 10h-1.8a4.57 4.57 0 0 0-2.6.814v-3a3 3 0 1 0-2 0v8.368a3 3 0 1 0 2 0V14.6a2.607 2.607 0 0 1 2.6-2.6h1.8a4.6 4.6 0 0 0 4.548-4.049A3 3 0 0 0 19.458 5"
        />
      </g>
    </svg>
  )
}

/** Jira brand mark (design/icons/jira.svg). */
export function Jira(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 512 512">
      <defs>
        <linearGradient
          id="wtmb-jira-a"
          gradientUnits="userSpaceOnUse"
          x1="384.7825"
          y1="2310.8059"
          x2="279.9034"
          y2="2202.6494"
          gradientTransform="matrix(1 0 0 -1 0 2434)"
        >
          <stop offset="0.176" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient
          id="wtmb-jira-b"
          gradientUnits="userSpaceOnUse"
          x1="269.6977"
          y1="2187.2896"
          x2="148.4327"
          y2="2069.3037"
          gradientTransform="matrix(1 0 0 -1 0 2434)"
        >
          <stop offset="0.176" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        fill="#2684FF"
        d="M490.787,0H244.296c0,61.44,49.737,111.177,111.176,111.177h45.348v43.886 c0,61.44,49.736,111.176,111.176,111.176V21.212C511.997,9.509,502.488,0,490.787,0z"
      />
      <path
        fill="url(#wtmb-jira-a)"
        d="M368.641,122.88H122.149c0,61.44,49.737,111.176,111.177,111.176h45.348v43.887 c0,61.44,49.739,111.176,111.179,111.176V144.092C389.853,132.388,380.342,122.88,368.641,122.88z"
      />
      <path
        fill="url(#wtmb-jira-b)"
        d="M246.495,245.76H0.003 c0,61.44,49.737,111.176,111.177,111.176h45.348v43.887c0,61.44,49.739,111.177,111.179,111.177V266.972 C267.707,255.268,258.198,245.76,246.495,245.76z"
      />
    </svg>
  )
}

/** Destroy — red trash (design/icons/destroy.svg). */
export function Destroy(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 512 512">
      <path
        fill="#dc2525"
        d="M436 60h-89.185l-9.75-29.238A44.945 44.945 0 0 0 294.379 0h-76.758a44.975 44.975 0 0 0-42.7 30.762L165.182 60H76c-24.814 0-45 20.186-45 45v30c0 16.708 15.041 15 31.183 15H466c8.291 0 15-6.709 15-15v-30c0-24.814-20.186-45-45-45m-239.187 0 6.57-19.746A15 15 0 0 1 217.621 30h76.758c6.46 0 12.188 4.116 14.224 10.254L315.18 60zM64.666 182l23.917 289.072C90.707 494.407 109.97 512 133.393 512h245.215c23.423 0 42.686-17.593 44.824-41.06L447.336 182zM181 437c0 19.773-30 19.854-30 0V227c0-19.773 30-19.854 30 0zm90 0c0 19.773-30 19.854-30 0V227c0-19.773 30-19.854 30 0zm90 0c0 19.773-30 19.854-30 0V227c0-8.291 6.709-15 15-15s15 6.709 15 15z"
      />
    </svg>
  )
}

/** Settings gear (footer icon button). */
export function Gear(): JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
