import { MenuItem } from '@cherrystudio/ui'
import { CommandContextMenu } from '@renderer/components/command'
import type { ReactNode } from 'react'

import { ActiveIndicator } from './primitives'
import type { SidebarClickGuard } from './SidebarSortableList'
import { SidebarSortableList } from './SidebarSortableList'
import { SidebarTooltip } from './Tooltip'
import type { ResolvedSidebarEntry, SidebarActiveState, SidebarVisibleLayout } from './types'

export interface SidebarListProps {
  layout: SidebarVisibleLayout
  entries: ResolvedSidebarEntry[]
  fixedEntries?: ResolvedSidebarEntry[]
  active: SidebarActiveState
  onReorder?: (event: { oldIndex: number; newIndex: number }) => void
  onContextMenuOpenChange?: (open: boolean) => void
}

/**
 * Renders built-in apps and mini apps as one continuous, drag-reorderable list.
 * A single `SidebarSortableList` (one dnd-kit context) backs the whole list, so a
 * drag can move an item to any position regardless of type — apps and mini apps
 * freely interleave with no divider between them.
 *
 * Entries are already resolved to a type-agnostic shape (see
 * `components/app/sidebarVariants`), so this presentation layer never switches on
 * whether a row is an app or a mini app.
 */
export function SidebarList({ layout, ...props }: SidebarListProps) {
  if (layout === 'icon') return <IconList {...props} />
  return <FullList {...props} />
}

type ListProps = Omit<SidebarListProps, 'layout'>

function StaticEntries({ entries, active, onContextMenuOpenChange }: ListProps) {
  if (!entries?.length) return null

  return (
    <div className="border-border-subtle border-b pb-1">
      {entries.map((entry) => {
        const isActive = entry.isActive(active)
        return (
          <div key={entry.key} className="relative">
            <EntryContextMenu items={entry.contextMenuItems} onOpenChange={onContextMenuOpenChange}>
              <MenuItem
                variant="ghost"
                icon={entry.renderIcon(16, 'md')}
                label={entry.label}
                active={isActive}
                onClick={entry.onOpen}
                onMouseDown={preventMiddleClickAutoscroll}
                onAuxClick={(event) => {
                  if (event.button === 1) {
                    event.preventDefault()
                    entry.onOpenNewTab?.()
                  }
                }}
                className="rounded-xl data-[active=true]:bg-[var(--sidebar-active-bg)]"
              />
            </EntryContextMenu>
            {isActive && <ActiveIndicator className="rounded-xl" />}
          </div>
        )
      })}
    </div>
  )
}

function EntryContextMenu({
  children,
  items,
  onOpenChange
}: {
  children: ReactNode
  items?: ResolvedSidebarEntry['contextMenuItems']
  onOpenChange?: (open: boolean) => void
}) {
  if (!items?.length) return <>{children}</>

  return (
    <CommandContextMenu location="webcontents.context" extraItems={items} onOpenChange={onOpenChange}>
      {children}
    </CommandContextMenu>
  )
}

function createAuxClickHandler(entry: ResolvedSidebarEntry, guardClick: SidebarClickGuard) {
  if (!entry.onOpenNewTab) return undefined
  return guardClick(entry.key, (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      entry.onOpenNewTab?.()
    }
  })
}

function preventMiddleClickAutoscroll(e: React.MouseEvent) {
  if (e.button === 1) e.preventDefault()
}

function IconList({ entries, fixedEntries, active, onReorder, onContextMenuOpenChange }: ListProps) {
  return (
    <>
      {fixedEntries?.length ? (
        <div className="mb-1 flex flex-col items-center border-border-subtle border-b pb-1 [-webkit-app-region:no-drag]">
          {fixedEntries.map((entry) => {
            const isActive = entry.isActive(active)
            return (
              <SidebarTooltip key={entry.key} content={entry.label}>
                <button
                  type="button"
                  aria-label={entry.label}
                  onClick={entry.onOpen}
                  onMouseDown={preventMiddleClickAutoscroll}
                  onAuxClick={(event) => {
                    if (event.button === 1) {
                      event.preventDefault()
                      entry.onOpenNewTab?.()
                    }
                  }}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--sidebar-active-bg)] text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}>
                  {isActive && <ActiveIndicator className="rounded-full" />}
                  {entry.renderIcon(18, 'lg')}
                </button>
              </SidebarTooltip>
            )
          })}
        </div>
      ) : null}
      <SidebarSortableList
        items={entries}
        itemKey="key"
        onReorder={onReorder}
        className="flex flex-col items-center gap-0.5 px-1.5 [-webkit-app-region:no-drag]">
        {(entry, guardClick) => {
          const isActive = entry.isActive(active)

          return (
            <SidebarTooltip key={entry.key} content={entry.label}>
              <EntryContextMenu items={entry.contextMenuItems} onOpenChange={onContextMenuOpenChange}>
                <button
                  type="button"
                  aria-label={entry.label}
                  onClick={guardClick(entry.key, entry.onOpen)}
                  onMouseDown={preventMiddleClickAutoscroll}
                  onAuxClick={createAuxClickHandler(entry, guardClick)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--sidebar-active-bg)] text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}>
                  {isActive && <ActiveIndicator className="rounded-full" />}
                  {entry.renderIcon(18, 'lg')}
                </button>
              </EntryContextMenu>
            </SidebarTooltip>
          )
        }}
      </SidebarSortableList>
    </>
  )
}

function FullList({ entries, fixedEntries, active, onReorder, onContextMenuOpenChange }: ListProps) {
  return (
    <>
      <StaticEntries entries={fixedEntries ?? []} active={active} onContextMenuOpenChange={onContextMenuOpenChange} />
      <SidebarSortableList
        items={entries}
        itemKey="key"
        onReorder={onReorder}
        className="space-y-0.5 px-2 [-webkit-app-region:no-drag]">
        {(entry, guardClick: SidebarClickGuard) => {
          const isActive = entry.isActive(active)

          return (
            <div key={entry.key} className="relative">
              <EntryContextMenu items={entry.contextMenuItems} onOpenChange={onContextMenuOpenChange}>
                <MenuItem
                  variant="ghost"
                  icon={entry.renderIcon(16, 'md')}
                  label={entry.label}
                  active={isActive}
                  onClick={guardClick(entry.key, entry.onOpen)}
                  onMouseDown={preventMiddleClickAutoscroll}
                  onAuxClick={createAuxClickHandler(entry, guardClick)}
                  className="rounded-xl data-[active=true]:bg-[var(--sidebar-active-bg)]"
                />
              </EntryContextMenu>
              {isActive && <ActiveIndicator className="rounded-xl" />}
            </div>
          )
        }}
      </SidebarSortableList>
    </>
  )
}
