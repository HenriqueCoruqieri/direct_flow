import { listDashboardTopTags } from "@/app/_lib/data/dashboard"
import {
  TOP_TAGS_CARD_LABEL,
  TOP_TAGS_LIMIT,
  topTagsEmptyHint,
  topTagVolumeHint,
} from "@/app/_lib/domain/dashboard"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import type { DateRange } from "@/app/_lib/types/period"

import DashboardPanel from "./dashboard-panel"
import TopTagItem from "./top-tag-item"

const TITLE_ID = "dashboard-top-tags-title"

interface DashboardTopTagsProps {
  departmentId: number
  range: DateRange
}

const DashboardTopTags = async ({
  departmentId,
  range,
}: DashboardTopTagsProps) => {
  const { ticketCount, tags } = await listDashboardTopTags(
    departmentId,
    range,
    TOP_TAGS_LIMIT,
  )
  const [leader] = tags

  return (
    <DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-3">
      <h2
        id={TITLE_ID}
        className="text-caption font-semibold text-muted-foreground"
      >
        {TOP_TAGS_CARD_LABEL}
      </h2>
      {leader === undefined ? (
        <>
          <p className="mt-1.5 font-heading text-title font-semibold">
            {EMPTY_VALUE_LABEL}
          </p>
          <p className="mt-1.5 text-xs font-bold text-text-tertiary">
            {topTagsEmptyHint(ticketCount)}
          </p>
        </>
      ) : (
        <>
          <p
            title={leader.name}
            className="mt-1.5 line-clamp-2 font-heading text-title font-semibold wrap-break-word"
          >
            {leader.name}
          </p>
          <p className="mt-1.5 text-xs font-bold text-text-tertiary">
            {topTagVolumeHint(leader.ticketCount, ticketCount)}
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {tags.map((tag) => (
              <TopTagItem
                key={tag.id}
                name={tag.name}
                count={tag.ticketCount}
                maxCount={leader.ticketCount}
              />
            ))}
          </ul>
        </>
      )}
    </DashboardPanel>
  )
}

export default DashboardTopTags
