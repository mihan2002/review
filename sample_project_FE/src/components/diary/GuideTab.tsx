import { tabPosition } from '../../utils/catalog'
import { dayOfMonth, drawerLabel, relativeDayLabel, weekdayLabel } from '../../utils/date'

interface GuideTabProps {
  /** ISO local date; the break this tab marks. */
  date: string
  count: number
}

/**
 * The guide tab standing proud of the cards behind it. Its horizontal slot is
 * derived from the date, so the same day always stands in the same place.
 */
export function GuideTab({ date, count }: GuideTabProps) {
  const slot = tabPosition(date)
  const today = relativeDayLabel(date)

  return (
    <div className="flex" style={{ paddingLeft: `${slot * 22}%` }}>
      <h2 className="tab">
        <span className="record-sm text-ink-soft">{weekdayLabel(date)}</span>
        <span className="record text-[0.9375rem] leading-none font-bold tracking-[0.06em] text-ink">
          {dayOfMonth(date)}
        </span>
        <span className="record-sm text-ink-soft">{drawerLabel(date)}</span>
        {today && <span className="record-sm font-bold text-stamp">{today}</span>}
        <span className="record-sm text-ink-soft" aria-label={`${count} ${count === 1 ? 'card' : 'cards'}`}>
          &times;{count}
        </span>
      </h2>
    </div>
  )
}
