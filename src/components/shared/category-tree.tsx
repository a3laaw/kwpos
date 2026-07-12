"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronLeft, Folder, FolderOpen } from "lucide-react"

export interface CategoryTreeNode {
  id: string
  name: string
  imageUrl?: string | null
  children?: CategoryTreeNode[]
}

/**
 * Collapsible category tree — displays categories as a nested tree with
 * expand/collapse for parent categories that have children.
 *
 * - Root categories with no children → render as flat buttons (click to filter)
 * - Root categories with children → render as collapsible folders
 *   (click folder name to expand, click child to filter)
 * - Selecting a parent filters by that parent's id (shows its direct products)
 * - Selecting a child filters by that child's id
 */
export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  allLabel = "الكل",
  className,
}: {
  categories: CategoryTreeNode[]
  selectedId: string
  onSelect: (id: string) => void
  allLabel?: string
  className?: string
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNode = (node: CategoryTreeNode, depth: number = 0) => {
    const hasChildren = (node.children?.length ?? 0) > 0
    const isExpanded = expanded.has(node.id)
    const isSelected = selectedId === node.id

    return (
      <React.Fragment key={node.id}>
        <button
          onClick={() => {
            if (hasChildren && !isSelected) {
              // First click: expand + select
              toggle(node.id)
              onSelect(node.id)
            } else if (hasChildren && isSelected) {
              // Already selected: just toggle expand
              toggle(node.id)
            } else {
              onSelect(node.id)
            }
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all border whitespace-nowrap",
            isSelected
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card border-border/70 hover:border-primary/40 text-foreground"
          )}
          style={{ marginInlineStart: depth > 0 ? `${depth * 16}px` : undefined }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            )
          ) : null}
          {node.imageUrl ? (
            <img src={node.imageUrl} alt="" className="h-4 w-4 rounded object-cover shrink-0" />
          ) : hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0" />
            )
          ) : null}
          <span className="truncate">{node.name}</span>
        </button>
        {hasChildren && isExpanded ? (
          <div className="flex flex-col gap-1">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </React.Fragment>
    )
  }

  return (
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-thin pb-1", className)}>
      {/* "All" button */}
      <button
        onClick={() => onSelect("")}
        className={cn(
          "shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all border",
          !selectedId
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-card border-border/70 hover:border-primary/40 text-foreground"
        )}
      >
        {allLabel}
      </button>
      {/* Tree nodes */}
      {categories.map((node) => renderNode(node))}
    </div>
  )
}
