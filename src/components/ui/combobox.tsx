"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  /** Optional group name — options with the same `group` are clustered under a heading. */
  group?: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  /** Optional custom renderer for the option content (the selected-value display still uses `label`). */
  renderOption?: (option: ComboboxOption) => React.ReactNode
  /** Optional custom renderer for the trigger's selected-value display. Defaults to the option `label`. */
  renderValue?: (option: ComboboxOption) => React.ReactNode
  /** Popover content alignment. Defaults to "start". */
  align?: "start" | "center" | "end"
  /** id forwarded to the underlying trigger button — useful for label association. */
  id?: string
  /** Optional aria-label for the trigger button. */
  ariaLabel?: string
}

/**
 * Searchable select built on shadcn Popover + Command primitives.
 * RTL-friendly (designed for an Arabic UI), keyboard navigable, with
 * a checkmark indicator for the active selection.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "اختر...",
  searchPlaceholder = "بحث...",
  emptyText = "لا توجد نتائج",
  disabled,
  className,
  renderOption,
  renderValue,
  align = "start",
  id,
  ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>(
    undefined
  )

  // Track the trigger width so the popover matches it (radix default is w-72).
  React.useLayoutEffect(() => {
    if (!open) return
    const el = triggerRef.current
    if (!el) return
    setTriggerWidth(el.offsetWidth)
  }, [open])

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  // Filter by label (case-insensitive, includes).
  const filtered = React.useMemo(() => {
    if (!search.trim()) return options
    const q = search.trim().toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, search])

  // Group filtered options (preserve first-seen order of groups).
  const grouped = React.useMemo(() => {
    const hasAnyGroup = filtered.some((o) => o.group)
    if (!hasAnyGroup) return null
    const groups: { name: string; items: ComboboxOption[] }[] = []
    const indexByName = new Map<string, number>()
    for (const opt of filtered) {
      const name = opt.group ?? ""
      const idx = indexByName.get(name)
      if (idx === undefined) {
        indexByName.set(name, groups.length)
        groups.push({ name, items: [opt] })
      } else {
        groups[idx].items.push(opt)
      }
    }
    return groups
  }, [filtered])

  const handleSelect = React.useCallback(
    (next: string) => {
      onValueChange?.(next)
      setOpen(false)
      setSearch("")
    },
    [onValueChange]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal data-[placeholder]:text-muted-foreground",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedOption ? (
              renderValue ? (
                renderValue(selectedOption)
              ) : (
                <span className="truncate">{selectedOption.label}</span>
              )
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-(--radix-popover-trigger-width) p-0"
        style={
          triggerWidth
            ? { minWidth: triggerWidth, width: triggerWidth }
            : undefined
        }
      >
        <Command shouldFilter={false} className="rounded-md">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            {filtered.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : grouped ? (
              grouped.map((g) => (
                <CommandGroup key={g.name || "default"} heading={g.name || undefined}>
                  {g.items.map((opt) => (
                    <ComboboxItem
                      key={opt.value}
                      option={opt}
                      selected={opt.value === value}
                      onSelect={handleSelect}
                      renderOption={renderOption}
                    />
                  ))}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {filtered.map((opt) => (
                  <ComboboxItem
                    key={opt.value}
                    option={opt}
                    selected={opt.value === value}
                    onSelect={handleSelect}
                    renderOption={renderOption}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ComboboxItem({
  option,
  selected,
  onSelect,
  renderOption,
}: {
  option: ComboboxOption
  selected: boolean
  onSelect: (value: string) => void
  renderOption?: (option: ComboboxOption) => React.ReactNode
}) {
  return (
    <CommandItem
      value={option.value}
      onSelect={() => onSelect(option.value)}
      className="gap-2"
    >
      <CheckIcon
        className={cn(
          "size-4 shrink-0",
          selected ? "opacity-100" : "opacity-0"
        )}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {renderOption ? renderOption(option) : <span className="truncate">{option.label}</span>}
      </span>
    </CommandItem>
  )
}

/** Tiny search icon export for parity with the existing primitives. */
export function ComboboxSearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return <SearchIcon {...props} />
}
