"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X } from "lucide-react"

interface ColumnFilterProps {
  columnId: string
  columnTitle: string
  options: string[]
  selectedValues: string[]
  onChange: (values: string[]) => void
}

export function ColumnFilter({ columnId, columnTitle, options, selectedValues, onChange }: ColumnFilterProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [localSelectedValues, setLocalSelectedValues] = useState<string[]>(selectedValues)

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedValues(selectedValues)
  }, [selectedValues])

  // Filter options based on search term
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(searchTerm.toLowerCase()))

  // Handle checkbox change
  const handleCheckboxChange = (option: string, checked: boolean) => {
    let newValues: string[]

    if (checked) {
      newValues = [...localSelectedValues, option]
    } else {
      newValues = localSelectedValues.filter((value) => value !== option)
    }

    setLocalSelectedValues(newValues)
  }

  // Apply filters
  const applyFilters = () => {
    onChange(localSelectedValues)
  }

  // Clear filters
  const clearFilters = () => {
    setLocalSelectedValues([])
    onChange([])
  }

  // Select all visible options
  const selectAllVisible = () => {
    setLocalSelectedValues((prev) => {
      const newValues = new Set([...prev])
      filteredOptions.forEach((option) => newValues.add(option))
      return Array.from(newValues)
    })
  }

  // Deselect all visible options
  const deselectAllVisible = () => {
    setLocalSelectedValues((prev) => {
      const newValues = [...prev]
      return newValues.filter((value) => !filteredOptions.includes(value))
    })
  }

  return (
    <div className="space-y-3">
      <div className="font-medium">{columnTitle}</div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search options..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 pr-8"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={() => setSearchTerm("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={selectAllVisible}
          className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={deselectAllVisible}
          className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
        >
          Deselect All
        </Button>
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-2">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${columnId}-${option}`}
                  checked={localSelectedValues.includes(option)}
                  onCheckedChange={(checked) => handleCheckboxChange(option, checked === true)}
                />
                <label htmlFor={`${columnId}-${option}`} className="text-sm cursor-pointer">
                  {option}
                </label>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 text-center py-2">No options found</div>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
        >
          Clear
        </Button>
        <Button size="sm" onClick={applyFilters} className="bg-[#00A651] hover:bg-[#008f45] text-white">
          Apply
        </Button>
      </div>
    </div>
  )
}
