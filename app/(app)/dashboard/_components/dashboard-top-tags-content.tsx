import { topTagsEmptyHint, topTagVolumeHint } from "@/app/_lib/domain/dashboard"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import type {
  DashboardTopTags,
  DashboardViewMode,
} from "@/app/_lib/types/dashboard"

import TopTagItem from "./top-tag-item"

interface DashboardTopTagsContentProps {
  topTags: DashboardTopTags
  mode: DashboardViewMode
}

const DashboardTopTagsContent = ({
  topTags,
  mode,
}: DashboardTopTagsContentProps) => {
  const { ticketCount, tags } = topTags
  const [leader] = tags

  if (leader === undefined) {
    return (
      <>
        <p className="mt-1.5 font-heading text-title font-semibold">
          {EMPTY_VALUE_LABEL}
        </p>
        <p className="mt-1.5 text-xs font-bold text-text-tertiary">
          {topTagsEmptyHint(ticketCount, mode)}
        </p>
      </>
    )
  }

  return (
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
  )
}

export default DashboardTopTagsContent
