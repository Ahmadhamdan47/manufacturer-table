"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useHotkeys } from "@mantine/hooks"
import api from "@/lib/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2,
  Search,
  Filter,
  ChevronDown,
  X,
  Check,
  Settings,
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FilterX,
  Maximize,
  Minimize,
  Undo,
  Redo,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ColumnFilter } from "./column-filter"
import { exportToExcel } from "./export-utils"
import { AddDrugModal } from "./add-drug-modal"
import { useLocalStorage } from "./use-local-storage"

const tableStyles = `
  .drug-table-container ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
    display: block !important;
  }
  
  .drug-table-container ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .drug-table-container ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .drug-table-container ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  
  .drug-table-container {
    overflow: auto;
  }

  /* Force horizontal scrollbar to always be visible */
  .table-scroll-container {
    overflow-x: scroll !important;
    overflow-y: auto;
    width: 100%;
    height: 100%;
    scrollbar-width: auto;
    scrollbar-color: #888 #f1f1f1;
  }

  .table-scroll-container::-webkit-scrollbar {
    display: block !important;
    height: 10px !important;
    width: 10px;
  }

  .table-scroll-container::-webkit-scrollbar-thumb {
    background-color: #888;
    border-radius: 4px;
  }
`

// Types
interface TableSettings {
  rowColorScheme: "white-green" | "light-green" | "light-blue"
  cellSize: number
  enableVirtualization: boolean
  confirmBeforeRefresh: boolean
  autoSaveState: boolean
  visibleColumns: Record<string, boolean>
  lazyLoading: boolean
  batchSize: number
}

interface CellProps {
  value: any
  rowId: string
  column: string
  isDragging: boolean
  dragValue: any
  dragColumnId: string | null
  cellStatus: "pending" | "confirmed" | "rejected" | "modified" | null
  isSelected: boolean
  onMouseDown: (value: any, columnId: string, rowId: string) => void
  onMouseEnter: (rowId: string) => void
  onClick: (rowId: string, columnId: string, ctrlKey: boolean) => void
}

// Debounce utility function
function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: NodeJS.Timeout | null
  return function (this: any, ...args: any[]) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

// Get unique values from data
const getUniqueValues = (data: any[], column: string) => {
  return Array.from(new Set(data.map((row) => row[column])))
    .filter((value) => value !== null && value !== undefined && value !== "" && value !== "N/A")
    .sort()
}

// Export data to CSV
const exportToCSV = (data: any[], columns: any[], filename: string) => {
  // Create header row
  const header = columns.map((col) => `"${col.title}"`).join(",")

  // Create data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.accessor]
        // Wrap in quotes and escape any quotes inside the value
        return `"${value?.toString().replace(/"/g, '""') || ""}"`
      })
      .join(",")
  })

  // Combine header and rows
  const csv = [header, ...rows].join("\n")

  // Create a blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Update the Cell component to immediately show the dragged value
// Replace the Cell component with this simplified version that immediately shows the new value

const Cell = ({
  value,
  rowId,
  column,
  isDragging,
  dragValue,
  dragColumnId,
  cellStatus,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onClick,
}: CellProps) => {
  // Determine if this cell is being dragged over
  const isBeingDraggedOver = isDragging && dragColumnId === column

  // Determine the display value - show dragValue if this cell is being dragged over
  const displayValue = isBeingDraggedOver ? dragValue : value

  return (
    <div
      className={cn(
        "relative p-2 whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200",
        isBeingDraggedOver && "bg-[#e6f7ef] border-2 border-[#00A651]",
        cellStatus === "modified" && "bg-[#d1f0e0]",
        isSelected && "bg-[#e6f7ef]",
      )}
      onMouseDown={() => onMouseDown(value, column, rowId)}
      onMouseEnter={() => onMouseEnter(rowId)}
      onClick={(e) => onClick(rowId, column, e.ctrlKey)}
    >
      {displayValue === "N/A" ? <span className="text-gray-400">N/A</span> : <span>{displayValue}</span>}
    </div>
  )
}

// Enhanced Header component with integrated filtering
interface EnhancedHeaderProps {
  column: any
  onResize: (columnId: string, width: number) => void
  onSort: (columnId: string) => void
  sortDirection: "asc" | "desc" | null
  sortColumn: string | null
  onFilter: (columnId: string, values: string[]) => void
  activeFilters: Record<string, string[]>
  filterOptions: string[]
}

const EnhancedHeader = ({
  column,
  onResize,
  onSort,
  sortDirection,
  sortColumn,
  onFilter,
  activeFilters,
  filterOptions,
}: EnhancedHeaderProps) => {
  const isFiltered = activeFilters[column.accessor]?.length > 0
  const isSorted = sortColumn === column.accessor

  return (
    <th
      style={{
        width: column.width,
        position: "relative",
        padding: "8px",
      }}
      className="text-black"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center font-bold cursor-pointer text-black" onClick={() => onSort(column.accessor)}>
          {column.title}
          {isSorted && (
            <span className="ml-1">
              {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </span>
          )}
        </div>

        <div className="flex items-center">
          {isFiltered && (
            <Badge variant="outline" className="mr-1">
              {activeFilters[column.accessor].length}
            </Badge>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={isFiltered ? "text-[#00A651]" : ""}>
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <ColumnFilter
                columnId={column.accessor}
                columnTitle={column.title}
                options={filterOptions}
                selectedValues={activeFilters[column.accessor] || []}
                onChange={(values) => onFilter(column.accessor, values)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 hover:opacity-100 bg-[#00A651]"
        onMouseDown={(e) => {
          e.preventDefault()
          const startX = e.clientX
          const startWidth = column.width

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX
            const newWidth = Math.max(50, startWidth + deltaX)
            onResize(column.accessor, newWidth)
          }

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          }

          document.addEventListener("mousemove", handleMouseMove)
          document.addEventListener("mouseup", handleMouseUp)
        }}
      />
    </th>
  )
}

export function DrugTable() {
  // Main data state
  const [allData, setAllData] = useState<any[]>([])
  const [tableData, setTableData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [columnPreset, setColumnPreset] = useState<string>("default")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")
  // Change the default page size from 50 to 1000
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(300)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Column state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // Settings state
  // Update the settings default batch size to 1000
  const [settings, setSettings] = useLocalStorage<TableSettings>({
    key: "drug-table-settings",
    defaultValue: {
      rowColorScheme: "white-green",
      cellSize: 25,
      enableVirtualization: false,
      confirmBeforeRefresh: true,
      autoSaveState: false,
      visibleColumns: {},
      lazyLoading: true,
      batchSize: 300,
    },
  })

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [lastSelectedRow, setLastSelectedRow] = useState<string | null>(null)

  // History for undo/redo functionality
  const [history, setHistory] = useState<any[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Drag and drop functionality
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState<any>(null)
  const [dragColumnId, setDragColumnId] = useState<string | null>(null)

  // Confirmation indicators
  const [changedCells, setChangedCells] = useState<Record<string, "pending" | "confirmed" | "rejected" | "modified">>(
    {},
  )

  // Refs for scrolling
  const [pendingChanges, setPendingChanges] = useState<
    Array<{
      rowId: string
      columnId: string
      oldValue: any
      newValue: any
    }>
  >([])

  // Add state for save results
  const [saveResults, setSaveResults] = useState<
    Array<{
      rowId: string
      columnId: string
      success: boolean
      message: string
    }>
  >([])

  // Add state for showing save results modal
  const [showSaveResultsModal, setShowSaveResultsModal] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // --- Options States (for select dropdowns) ---
  const [atcOptions, setAtcOptions] = useState<{ value: string; label: string }[]>([])
  const [dosageNumerator1UnitOptions, setDosageNumerator1UnitOptions] = useState<string[]>([])
  const [dosageNumerator2UnitOptions, setDosageNumerator2UnitOptions] = useState<string[]>([])
  const [dosageNumerator3UnitOptions, setDosageNumerator3UnitOptions] = useState<string[]>([])
  const [dosageDenominator1UnitOptions, setDosageDenominator1UnitOptions] = useState<string[]>([])
  const [dosageDenominator2UnitOptions, setDosageDenominator2UnitOptions] = useState<string[]>([])
  const [dosageDenominator3UnitOptions, setDosageDenominator3UnitOptions] = useState<string[]>([])
  const [formOptions, setFormOptions] = useState<string[]>([])
  const [routeOptions, setRouteOptions] = useState<string[]>([])
  const [stratumOptions, setStratumOptions] = useState<string[]>([])
  const [agentOptions, setAgentOptions] = useState<string[]>([])
  const [manufacturerOptions, setManufacturerOptions] = useState<string[]>([])

  // Add state for sorting and column dragging
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  // Add state for column filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  // Add state for lazy loading
  const [loadedData, setLoadedData] = useState<any[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [loadedCount, setLoadedCount] = useState(0)

  // Add state for paginated lazy loading
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const loadedPages = useRef(new Set<number>())

  // Add a state to track which row is being edited
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})

  // Add these event handlers to the useEffect section
  useEffect(() => {
    // Handle document-wide mouse up event to stop dragging
    const handleMouseUp = () => {
      handleCellMouseUp()
    }

    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  // Function to update column filters
  const updateColumnFilters = (columnId: string, values: string[]) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnId]: values,
    }))

    // Update active filters
    setActiveFilters(Object.keys(columnFilters).filter((key) => columnFilters[key] && columnFilters[key].length > 0))
  }

  // Add a function to handle sorting
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      // Toggle direction if already sorting by this column
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        // Clear sort if already descending
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      // Start with ascending sort for new column
      setSortColumn(columnId)
      setSortDirection("asc")
    }
  }

  // Add a function to handle column drag start
  const handleColumnDragStart = (columnId: string) => {
    setDraggedColumn(columnId)
  }

  // Add a function to handle column drag over
  const handleColumnDragOver = (columnId: string) => {
    if (draggedColumn && draggedColumn !== columnId) {
      // Get current order or initialize from columns
      const currentOrder = columnOrder.length > 0 ? columnOrder : columns.map((col) => col.accessor)

      const draggedIdx = currentOrder.indexOf(draggedColumn)
      const targetIdx = currentOrder.indexOf(columnId)

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const newOrder = [...currentOrder]
        newOrder.splice(draggedIdx, 1)
        newOrder.splice(targetIdx, 0, draggedColumn)
        setColumnOrder(newOrder)
      }
    }
  }

  // Add a function to handle column drag end
  const handleColumnDragEnd = () => {
    setDraggedColumn(null)
  }

  // Debounced save function
  const debouncedSaveChange = useCallback(
    debounce((updatedDrug) => {
      // Make the API call
      api
        .put(`drugs/update/${updatedDrug.DrugID}`, updatedDrug)
        .then(() => {
          console.log(`Successfully saved change for drug ${updatedDrug.DrugID}`)
        })
        .catch((error) => {
          console.error("API error during drag save:", error)
        })
    }, 500), // 500ms debounce time
    [],
  )

  // Hotkeys for undo (Ctrl+Z) and redo (Ctrl+Y)
  useHotkeys([
    ["mod+Z", handleUndo],
    ["mod+Y", handleRedo],
    ["mod+S", () => saveTableState()],
  ])

  // Prevent refresh without confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (settings.confirmBeforeRefresh && hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
        return e.returnValue
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [settings.confirmBeforeRefresh, hasUnsavedChanges])

  // Auto-save table state
  useEffect(() => {
    if (settings.autoSaveState && tableData.length > 0) {
      const saveStateTimer = setTimeout(() => {
        saveTableState()
      }, 30000) // Auto-save every 30 seconds

      return () => clearTimeout(saveStateTimer)
    }
  }, [tableData, settings.autoSaveState])

  // Load data on mount
  useEffect(() => {
    if (settings.lazyLoading) {
      fetchDrugsLazy(1, settings.batchSize)
    } else {
      fetchDrugs()
    }

    fetchAtcOptions()

    // Try to load saved state
    const savedState = localStorage.getItem("drug-table-state")
    if (savedState) {
      try {
        const {
          tableData: savedTableData,
          history: savedHistory,
          historyIndex: savedHistoryIndex,
        } = JSON.parse(savedState)
        if (savedTableData && savedTableData.length > 0) {
          setTableData(savedTableData)
          if (savedHistory) setHistory(savedHistory)
          if (savedHistoryIndex !== undefined) setHistoryIndex(savedHistoryIndex)

          showNotification("Table state restored from last session", "info")
        }
      } catch (error) {
        console.error("Error loading saved table state:", error)
      }
    }
  }, [])

  // Add to history when tableData changes
  useEffect(() => {
    if (
      tableData.length > 0 &&
      (history.length === 0 || JSON.stringify(tableData) !== JSON.stringify(history[historyIndex]))
    ) {
      // Create a deep copy of the current state
      const newHistoryEntry = JSON.parse(JSON.stringify(tableData))

      // If we're not at the end of the history, remove future states
      const newHistory =
        historyIndex < history.length - 1
          ? [...history.slice(0, historyIndex + 1), newHistoryEntry]
          : [...history, newHistoryEntry]

      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      setHasUnsavedChanges(true)
    }
  }, [tableData])

  // Implement lazy loading
  // Modify the loadMoreData function to prevent duplicate calls
  const loadMoreData = useCallback(() => {
    if (isLoadingMore || !hasMoreData) return

    setIsLoadingMore(true)
    const nextPage = currentPage + 1

    fetchDrugsLazy(nextPage, settings.batchSize).finally(() => {
      setIsLoadingMore(false)
    })
  }, [currentPage, isLoadingMore, hasMoreData, settings.batchSize])

  // Add scroll event listener for lazy loading
  // Replace the scroll event listener with this improved version
  useEffect(() => {
    // Intentionally disabled automatic loading on scroll
    // The user will need to click "Next" to load more data
    return () => {} // Empty cleanup function
  }, [])

  // Save table state to localStorage
  const saveTableState = () => {
    saveAllChanges()
  }

  // Show notification
  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Fetch ATC options
  const fetchAtcOptions = async () => {
    try {
      const response = await api.get("/atc/all")

      // Check if response.data exists and is an array
      if (response.data && Array.isArray(response.data)) {
        const formattedOptions = response.data
          .filter((atc: any) => atc.Code && atc.Code.trim() !== "" && atc.Name && atc.Name.trim() !== "")
          .map((atc: any) => ({
            value: atc.Code,
            label: atc.Name,
          }))
        setAtcOptions(formattedOptions)
      } else {
        // Handle case where response.data is not an array
        console.error("Invalid ATC data format:", response.data)
        setAtcOptions([])
      }
    } catch (error) {
      console.error("Error fetching ATC options:", error)
      setAtcOptions([])
    }
  }

  // Format drug data helper function
  const formatDrugData = (drug: any) => {
    return {
      DrugID: drug.DrugID || "N/A",
      DrugName: drug.DrugName || "N/A",
      DrugNameAR: drug.DrugNameAR || "N/A",
      Seq: drug.Seq || "N/A",
      ProductType: drug.ProductType || "N/A",
      ATC: drug.ATC_Code || "N/A",
      ATCRelatedIngredient: drug.ATCRelatedIngredient || "N/A",
      OtherIngredients: drug.OtherIngredients || "N/A",
      Dosage: drug.Dosage || "N/A",
      // Dosages Fields
      DosageNumerator1: drug.Dosages?.[0]?.Numerator1 || "N/A",
      DosageNumerator1Unit: drug.Dosages?.[0]?.Numerator1Unit || "N/A",
      DosageDenominator1: drug.Dosages?.[0]?.Denominator1 || "N/A",
      DosageDenominator1Unit: drug.Dosages?.[0]?.Denominator1Unit || "N/A",
      DosageNumerator2: drug.Dosages?.[0]?.Numerator2 || "N/A",
      DosageNumerator2Unit: drug.Dosages?.[0]?.Numerator2Unit || "N/A",
      DosageDenominator2: drug.Dosages?.[0]?.Denominator2 || "N/A",
      DosageDenominator2Unit: drug.Dosages?.[0]?.Denominator2Unit || "N/A",
      DosageNumerator3: drug.Dosages?.[0]?.Numerator3 || "N/A",
      DosageNumerator3Unit: drug.Dosages?.[0]?.Numerator3Unit || "N/A",
      DosageDenominator3: drug.Dosages?.[0]?.Denominator3 || "N/A",
      DosageDenominator3Unit: drug.Dosages?.[0]?.Denominator3Unit || "N/A",

      // Drug Presentations Fields
      PresentationLNDI: drug.PresentationLNDI || "N/A",
      PresentationDescription: drug.DrugPresentations?.[0]?.Description || "N/A",
      PresentationUnitQuantity1: drug.DrugPresentations?.[0]?.UnitQuantity1 || "N/A",
      PresentationUnitType1: drug.DrugPresentations?.[0]?.UnitType1 || "N/A",
      PresentationUnitQuantity2: drug.DrugPresentations?.[0]?.UnitQuantity2 || "N/A",
      PresentationUnitType2: drug.DrugPresentations?.[0]?.UnitType2 || "N/A",
      PresentationPackageQuantity1: drug.DrugPresentations?.[0]?.PackageQuantity1 || "N/A",
      PresentationPackageType1: drug.DrugPresentations?.[0]?.PackageType1 || "N/A",
      PresentationPackageQuantity2: drug.DrugPresentations?.[0]?.PackageType2 || "N/A",
      PresentationPackageType2: drug.DrugPresentations?.[0]?.UnitType2 || "N/A",
      PresentationPackageQuantity3: drug.DrugPresentations?.[0]?.PackageQuantity3 || "N/A",
      PresentationPackageType3: drug.DrugPresentations?.[0]?.PackageType3 || "N/A",

      // Additional fields
      isOTC: drug.isOTC || false,
      DFSequence: drug.DFSequence || "N/A",
      Form: drug.Form || "N/A",
      FormRaw: drug.FormRaw || "N/A",
      FormLNDI: drug.FormLNDI || "N/A",
      Parent: drug.RouteParent || "N/A",
      Route: drug.Route || "N/A",
      RouteRaw: drug.RouteRaw || "N/A",
      RouteLNDI: drug.RouteLNDI || "N/A",
      Parentaral: drug.Parentaral || "N/A",
      Stratum: drug.Stratum || "N/A",
      Amount: drug.Amount || 0,
      Agent: drug.Agent || "N/A",
      Manufacturer: drug.Manufacturer || "N/A",
      Country: drug.Country || "N/A",
      RegistrationNumber: drug.RegistrationNumber || "N/A",
      Notes: drug.Notes || "N/A",
      Description: drug.Description || "N/A",
      Indication: drug.Indication || "N/A",
      Posology: drug.Posology || "N/A",
      MethodOfAdministration: drug.MethodOfAdministration || "N/A",
      Contraindications: drug.Contraindications || "N/A",
      PrecautionForUse: drug.PrecautionForUse || "N/A",
      EffectOnFGN: drug.EffectOnFGN || "N/A",
      SideEffect: drug.SideEffect || "N/A",
      Toxicity: drug.Toxicity || "N/A",
      StorageCondition: drug.StorageCondition || "N/A",
      ShelfLife: drug.ShelfLife || "N/A",
      IngredientLabel: drug.IngredientLabel || "N/A",
      ImagesPath: drug.ImagesPath || "N/A",
      ImageDefault: drug.ImageDefault === "N/A" ? null : drug.ImageDefault,
      InteractionIngredientName: drug.InteractionIngredientName || "N/A",
      IsDouanes: drug.IsDouanes || "N/A",
      RegistrationDate: drug.RegistrationDate || "N/A",
      PublicPrice: drug.PublicPrice || "N/A",
      SubsidyLabel: drug.SubsidyLabel || "N/A",
      SubsidyPercentage: drug.SubsidyPercentage || "N/A",
      HospPricing: drug.HospPricing || "N/A",
      Substitutable: drug.Substitutable || "N/A",
      CreatedBy: drug.CreatedBy || "N/A",
      CreatedDate: drug.CreatedDate || "N/A",
      UpdatedBy: drug.UpdatedBy || "N/A",
      UpdatedDate: drug.UpdatedDate || "N/A",
      ReviewDate: drug.ReviewDate || "N/A",
      MoPHCode: drug.MoPHCode || "N/A",
      CargoShippingTerms: drug.CargoShippingTerms || "N/A",
      NotMarketed: drug.NotMarketed || "N/A",
      PriceForeign: drug.PriceForeign || "N/A",
      CurrencyForeign: drug.CurrencyForeign || "N/A",
    }
  }

  // Initialize options helper function
  const initializeOptions = (formattedData: any[]) => {
    setDosageNumerator1UnitOptions(getUniqueValues(formattedData, "DosageNumerator1Unit"))
    setDosageNumerator2UnitOptions(getUniqueValues(formattedData, "DosageNumerator2Unit"))
    setDosageNumerator3UnitOptions(getUniqueValues(formattedData, "DosageNumerator3Unit"))
    setDosageDenominator1UnitOptions(getUniqueValues(formattedData, "DosageDenominator1Unit"))
    setDosageDenominator2UnitOptions(getUniqueValues(formattedData, "DosageDenominator2Unit"))
    setDosageDenominator3UnitOptions(getUniqueValues(formattedData, "DosageDenominator3Unit"))
    setFormOptions(getUniqueValues(formattedData, "Form"))
    setRouteOptions(getUniqueValues(formattedData, "Route"))
    setStratumOptions(getUniqueValues(formattedData, "Stratum"))
    setAgentOptions(getUniqueValues(formattedData, "Agent"))
    setManufacturerOptions(getUniqueValues(formattedData, "Manufacturer"))
  }

  // Fetch drugs with lazy loading
  // Modify the fetchDrugsLazy function to load more data at once
  const fetchDrugsLazy = async (page: number, pageSize: number) => {
    setIsLoading(true)
    try {
      // Since the API only returns 100 drugs at a time, we need to make multiple requests
      // to get the desired pageSize (e.g., 300 drugs)
      const requestsNeeded = Math.ceil(pageSize / 100)

      // For proper pagination, we should load at least the first two pages of data
      // This ensures the "Next" button is enabled right away
      const pagesToPreload = Math.min(2, totalPages || 10) // Preload at least 2 pages or all pages if less

      // We'll collect all drugs here
      const allDrugs: any[] = []
      let totalPagesFromAPI = 1

      // Load the current page and potentially the next page(s)
      for (let pageOffset = 0; pageOffset < pagesToPreload; pageOffset++) {
        const targetPage = page + pageOffset

        // For each page, we need multiple API requests (since API only returns 100 at a time)
        for (let i = 0; i < requestsNeeded; i++) {
          const currentPage = (targetPage - 1) * requestsNeeded + i + 1

          // Check if we already loaded this page
          if (loadedPages.current.has(currentPage)) {
            console.log(`Skipping fetch for sub-page ${currentPage}, data already loaded`)
            continue
          }

          // If we've reached the end of available pages, stop making requests
          if (currentPage > totalPagesFromAPI && totalPagesFromAPI > 1) {
            break
          }

          const response = await api.get(`/drugs/paginated?page=${currentPage}&pageSize=100`)

          if (response.data && response.data.drugs && Array.isArray(response.data.drugs)) {
            const { drugs, totalPages } = response.data
            totalPagesFromAPI = totalPages

            // If no drugs returned, we've reached the end
            if (drugs.length === 0) {
              break
            }

            allDrugs.push(...drugs)
            loadedPages.current.add(currentPage)
          }
        }
      }

      if (allDrugs.length === 0) {
        setHasMoreData(false)
        setIsLoading(false)
        return true
      }

      // Format the data
      const formattedData = allDrugs.map(formatDrugData)

      // Check for duplicate data by comparing drug IDs
      const existingIds = new Set(allData.map((drug) => drug.DrugID))
      const newDrugs = formattedData.filter((drug) => !existingIds.has(drug.DrugID))

      // If we filtered out all drugs as duplicates, we might have a pagination issue
      if (newDrugs.length === 0 && formattedData.length > 0) {
        console.warn("All drugs in this batch were duplicates, adjusting page")
        setHasMoreData(page < Math.ceil(totalPagesFromAPI / requestsNeeded))
        setIsLoading(false)
        return true
      }

      // If this is the first page, initialize options
      if (page === 1) {
        initializeOptions(formattedData)
      }

      // Update loaded data
      setLoadedData((prev) => [...prev, ...newDrugs])

      // Update table data
      setTableData((prev) => [...prev, ...newDrugs])
      setAllData((prev) => [...prev, ...newDrugs])

      // Check if we've reached the end
      setHasMoreData(page < Math.ceil(totalPagesFromAPI / requestsNeeded))
      setCurrentPage(page)
      setTotalPages(Math.ceil(totalPagesFromAPI / requestsNeeded))

      // Initialize history if this is the first page
      if (page === 1) {
        setHistory([JSON.parse(JSON.stringify([...newDrugs]))])
        setHistoryIndex(0)

        // Initialize column visibility if not already set
        if (Object.keys(settings.visibleColumns).length === 0) {
          const initialVisibility: Record<string, boolean> = {}
          Object.keys(formattedData[0] || {}).forEach((key) => {
            initialVisibility[key] = true
          })
          setSettings({ ...settings, visibleColumns: initialVisibility })
        }
      }

      showNotification(`Loaded ${newDrugs.length} drugs successfully`, "success")
    } catch (error) {
      console.error("Error fetching drugs:", error)
      setHasMoreData(false)
      showNotification("Failed to load drugs: Server error", "error")
    } finally {
      setIsLoading(false)
    }

    return true
  }

  // Fetch drugs data
  const fetchDrugs = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/drugs/all")

      // Check if response.data and response.data.drugs exist
      if (response.data && response.data.drugs && Array.isArray(response.data.drugs)) {
        const { drugs } = response.data

        const formattedData = drugs.map(formatDrugData)

        // Populate dropdowns with unique, non-empty values
        initializeOptions(formattedData)

        // Set the full dataset directly to tableData
        setTableData(formattedData)
        setAllData(formattedData)

        // Initialize history with the first state
        setHistory([JSON.parse(JSON.stringify(formattedData))])
        setHistoryIndex(0)

        // Initialize column visibility if not already set
        if (Object.keys(settings.visibleColumns).length === 0) {
          const initialVisibility: Record<string, boolean> = {}
          Object.keys(formattedData[0] || {}).forEach((key) => {
            initialVisibility[key] = true
          })
          setSettings({ ...settings, visibleColumns: initialVisibility })
        }

        showNotification(`Loaded ${formattedData.length} drugs successfully`, "success")
      } else {
        // Handle case where response.data.drugs is not an array
        console.error("Invalid drug data format:", response.data)
        setTableData([])
        setAllData([])
        setHistory([[]])
        setHistoryIndex(0)
        showNotification("Failed to load drugs: Invalid data format", "error")
      }
    } catch (error) {
      console.error("Error fetching drugs:", error)
      setTableData([])
      setAllData([])
      setHistory([[]])
      setHistoryIndex(0)
      showNotification("Failed to load drugs: Server error", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Modify the handleUndo function to properly restore previous state
  function handleUndo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)

      // Deep copy the previous state to ensure all cell values are restored
      const previousState = JSON.parse(JSON.stringify(history[newIndex]))
      setTableData(previousState)

      // Clear changed cells when undoing
      setChangedCells({})
      setPendingChanges([]) // Clear pending changes when undoing
      setHasUnsavedChanges(true)
      showNotification("Undo successful", "info")
    } else {
      showNotification("Nothing to undo", "info")
    }
  }

  // Redo functionality
  function handleRedo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setTableData(JSON.parse(JSON.stringify(history[newIndex])))
      // Clear changed cells when redoing
      setChangedCells({})
      setHasUnsavedChanges(true)
      showNotification("Redo successful", "info")
    } else {
      showNotification("Nothing to redo", "info")
    }
  }

  // Cell drag and drop handlers
  const handleCellMouseDown = (value: any, columnId: string, rowId: string) => {
    if (value && value !== "N/A") {
      setDragValue(value)
      setDragColumnId(columnId)
      setIsDragging(true)
      // Prevent text selection during drag
      document.body.style.userSelect = "none"
    }
  }

  const handleCellMouseUp = () => {
    setIsDragging(false)
    setDragValue(null)
    setDragColumnId(null)
    // Restore text selection
    document.body.style.userSelect = ""
  }

  // Add a new function to save all pending changes
  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) {
      showNotification("No changes to save", "info")
      return
    }

    setIsLoading(true)
    const results = []

    // Process changes sequentially
    for (const change of pendingChanges) {
      const { rowId, columnId, newValue } = change

      try {
        const payload = {
          DrugID: rowId,
          [columnId]: newValue,
        }

        // Handle 'N/A' values for integer fields
        const integerFields = ["ImageDefault", "Amount", "IsDouanes", "NotMarketed"]
        if (integerFields.includes(columnId) && payload[columnId] === "N/A") {
          payload[columnId] = null
        }

        await api.put(`/drugs/update/${rowId}`, payload)

        // Mark as successful
        results.push({
          rowId,
          columnId,
          success: true,
          message: `Successfully updated ${columnId} for drug ${rowId}`,
        })
      } catch (error) {
        console.error(`Error saving change for ${columnId} on row ${rowId}:`, error)

        // Mark as failed
        results.push({
          rowId,
          columnId,
          success: false,
          message: `Failed to update ${columnId}: ${(error as any).message || "Unknown error"}`,
        })
      }
    }

    setIsLoading(false)
    setSaveResults(results)
    setShowSaveResultsModal(true)

    // Clear pending changes that were successful
    const successfulRowColumns = results.filter((r) => r.success).map((r) => `${r.rowId}-${r.columnId}`)

    setPendingChanges((prev) =>
      prev.filter((change) => !successfulRowColumns.includes(`${change.rowId}-${change.columnId}`)),
    )

    // Clear changed cells indicators for successful changes
    setChangedCells((prev) => {
      const newState = { ...prev }
      successfulRowColumns.forEach((key) => {
        delete newState[key]
      })
      return newState
    })

    // Show summary notification
    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    if (failCount === 0) {
      showNotification(`Successfully saved all ${successCount} changes`, "success")
      setHasUnsavedChanges(false)
    } else {
      showNotification(`Saved ${successCount} changes, but ${failCount} failed. See details.`, "info")
    }
  }

  // Update the handleCellMouseEnter function to immediately update the cell value
  // Replace the handleCellMouseEnter function with this version

  const handleCellMouseEnter = (rowId: string) => {
    if (isDragging && dragValue && dragColumnId) {
      const row = tableData.find((row) => row.DrugID === rowId)

      if (!row) return

      // Only proceed if the value is actually different
      if (row[dragColumnId] !== dragValue) {
        // Track the change
        const existingChangeIndex = pendingChanges.findIndex(
          (change) => change.rowId === rowId && change.columnId === dragColumnId,
        )

        if (existingChangeIndex === -1) {
          // Add new change
          setPendingChanges((prev) => [
            ...prev,
            {
              rowId,
              columnId: dragColumnId,
              oldValue: row[dragColumnId],
              newValue: dragValue,
            },
          ])
        } else {
          // Update existing change
          setPendingChanges((prev) => {
            const newChanges = [...prev]
            newChanges[existingChangeIndex].newValue = dragValue
            return newChanges
          })
        }

        // Mark cell as modified immediately
        setChangedCells((prev) => ({
          ...prev,
          [`${rowId}-${dragColumnId}`]: "modified",
        }))

        // Update local state with the dragged value
        setTableData((prevData) =>
          prevData.map((drug) => {
            if (drug.DrugID === rowId) {
              // If Form is being dragged, also update DFSequence
              if (dragColumnId === "Form") {
                const matchingDrug = allData.find(
                  (d) => d.DrugID !== row.DrugID && d.Form === dragValue && d.DFSequence && d.DFSequence !== "N/A",
                )

                if (matchingDrug) {
                  return { ...drug, [dragColumnId]: dragValue, DFSequence: matchingDrug.DFSequence }
                }
              }
              return { ...drug, [dragColumnId]: dragValue }
            }
            return drug
          }),
        )

        setHasUnsavedChanges(true)
      }
    }
  }

  // Handle saving row changes
  const handleSaveRow = async (rowId: string, values: any) => {
    try {
      const rowIndex = tableData.findIndex((row) => row.DrugID === rowId)
      if (rowIndex === -1) return

      const updatedDrug = { ...tableData[rowIndex], ...values }

      // If Form (DosageForm Clean) was changed, find a matching DFSequence
      if (values.Form && values.Form !== tableData[rowIndex].Form) {
        // Find another drug with the same Form value to get its DFSequence
        const matchingDrug = allData.find(
          (drug) =>
            drug.DrugID !== updatedDrug.DrugID &&
            drug.Form === values.Form &&
            drug.DFSequence &&
            drug.DFSequence !== "N/A",
        )

        if (matchingDrug) {
          updatedDrug.DFSequence = matchingDrug.DFSequence
          console.log(`Auto-selected DFSequence ${matchingDrug.DFSequence} based on Form ${values.Form}`)
        }
      }

      // If ATC was changed in editing:
      if (updatedDrug.ATC) {
        updatedDrug.ATC_Code = updatedDrug.ATC
      }

      // Dosage sub-payload
      const dosageData = {
        Numerator1: updatedDrug.DosageNumerator1,
        Numerator1Unit: updatedDrug.DosageNumerator1Unit,
        Denominator1: updatedDrug.DosageDenominator1,
        Denominator1Unit: updatedDrug.DosageDenominator1Unit,
        Numerator2: updatedDrug.DosageNumerator2,
        Numerator2Unit: updatedDrug.DosageNumerator2Unit,
        Denominator2: updatedDrug.DosageDenominator2,
        Denominator2Unit: updatedDrug.DosageDenominator2Unit,
        Numerator3: updatedDrug.DosageNumerator3,
        Numerator3Unit: updatedDrug.DosageNumerator3Unit,
        Denominator3: updatedDrug.DosageDenominator3,
        Denominator3Unit: updatedDrug.DosageDenominator3Unit,
      }

      // Presentation sub-payload
      const presentationData = {
        UnitQuantity1: updatedDrug.PresentationUnitQuantity1,
        UnitType1: updatedDrug.PresentationUnitType1,
        UnitQuantity2: updatedDrug.PresentationUnitQuantity2,
        UnitType2: updatedDrug.PresentationUnitType2,
        PackageQuantity1: updatedDrug.PresentationPackageQuantity1,
        PackageType1: updatedDrug.PresentationPackageType1,
        PackageQuantity2: updatedDrug.PresentationPackageQuantity2,
        PackageType2: updatedDrug.PackageType2,
        PackageQuantity3: updatedDrug.PresentationPackageQuantity3,
        PackageType3: updatedDrug.PackageType3,
        Description: updatedDrug.PresentationDescription,
      }

      try {
        // Make the API calls
        await api.put(`/drugs/update/${updatedDrug.DrugID}`, updatedDrug)
        await api.put(`/dosages/updateByDrug/${updatedDrug.DrugID}`, dosageData)
        await api.put(`/presentations/updateByDrug/${updatedDrug.DrugID}`, presentationData)
        showNotification("Drug updated successfully", "success")
      } catch (apiError) {
        console.error("API error during save, continuing with local update:", apiError)
        showNotification("API error during save, continuing with local update", "error")
        // Continue with local update even if API fails
      }

      // Update tableData locally
      setTableData((prevData) => prevData.map((drug) => (drug.DrugID === updatedDrug.DrugID ? updatedDrug : drug)))
      setAllData((prevData) => prevData.map((drug) => (drug.DrugID === updatedDrug.DrugID ? updatedDrug : drug)))
      setHasUnsavedChanges(true)
    } catch (error) {
      console.error("Error updating drug:", error)
      showNotification("Error updating drug", "error")
    }
  }

  // Handle deleting a row
  const handleDeleteRow = async (rowId: string) => {
    try {
      if (window.confirm("Are you sure you want to delete this drug?")) {
        try {
          await api.delete(`/drugs/delete/${rowId}`)
          showNotification("Drug deleted successfully", "success")
        } catch (apiError) {
          console.error("API error during delete, continuing with local update:", apiError)
          showNotification("API error during delete, continuing with local update", "error")
          // Continue with local update even if API fails
        }

        // Update local data regardless of API success
        setTableData((prevData) => prevData.filter((drug) => drug.DrugID !== rowId))
        setAllData((prevData) => prevData.filter((drug) => drug.DrugID !== rowId))
        setHasUnsavedChanges(true)
      }
    } catch (error) {
      console.error("Error deleting drug:", error)
      showNotification("Error deleting drug", "error")
    }
  }

  // Handle column resize
  const handleColumnResize = (columnId: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: width,
    }))
  }

  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    setSettings({
      ...settings,
      visibleColumns: {
        ...settings.visibleColumns,
        [columnId]: !settings.visibleColumns[columnId],
      },
    })
  }

  // Export current view to CSV
  const handleExportCSV = () => {
    const visibleColumns = columns.filter(
      (col: { accessor: string; title: string; width: number }) => settings.visibleColumns[col.accessor] !== false,
    )

    const dataToExport = filteredData.map((row: any) => {
      const exportRow: Record<string, any> = {}
      visibleColumns.forEach((col: { accessor: string; title: string; width: number }) => {
        exportRow[col.accessor] = row[col.accessor]
      })
      return exportRow
    })

    exportToCSV(dataToExport, visibleColumns, `drug-data-export-${new Date().toISOString().slice(0, 10)}.csv`)

    showNotification("Data exported to CSV successfully", "success")
  }

  // Define columns based on the selected preset
  const columns = useMemo<Array<{ accessor: string; title: string; width: number }>>(() => {
    let columnsList: Array<{ accessor: string; title: string; width: number }> = []

    switch (columnPreset) {
      /* --------------------------------------------------
         Substitution Check Preset
         -------------------------------------------------- */
      case "substitutionCheck":
        columnsList = [
          { accessor: "ATC", title: "ATC", width: columnWidths["ATC"] || 120 },
          {
            accessor: "ATCRelatedIngredient",
            title: "ATC Related Ingredient",
            width: columnWidths["ATCRelatedIngredient"] || 180,
          },
          { accessor: "DrugName", title: "Brand Name", width: columnWidths["DrugName"] || 150 },
          { accessor: "Seq", title: "Seq", width: columnWidths["Seq"] || 60 },
          { accessor: "OtherIngredients", title: "All Ingredients", width: columnWidths["OtherIngredients"] || 180 },
          { accessor: "FormLNDI", title: "Form LNDI", width: columnWidths["FormLNDI"] || 120 },
          { accessor: "Form", title: "Dosage-form (clean)", width: columnWidths["Form"] || 150 },
          { accessor: "FormRaw", title: "Form Raw", width: columnWidths["FormRaw"] || 120 },
          { accessor: "RouteLNDI", title: "Route LNDI", width: columnWidths["RouteLNDI"] || 120 },
          { accessor: "Route", title: "Route (clean)", width: columnWidths["Route"] || 130 },
          { accessor: "RouteRaw", title: "Route Raw", width: columnWidths["RouteRaw"] || 120 },
          { accessor: "Parent", title: "Route Parent", width: columnWidths["Parent"] || 120 },
          { accessor: "DosageNumerator1", title: "DosageNumerator1", width: columnWidths["DosageNumerator1"] || 60 },
          { accessor: "DosageNumerator1Unit", title: "Num 1 Unit", width: columnWidths["DosageNumerator1Unit"] || 60 },
          { accessor: "DosageDenominator1", title: "Deno1", width: columnWidths["DosageDenominator1"] || 100 },
          {
            accessor: "DosageDenominator1Unit",
            title: "Deno 1 Unit",
            width: columnWidths["DosageDenominator1Unit"] || 60,
          },
          { accessor: "DosageNumerator2", title: "Num 2", width: columnWidths["DosageNumerator2"] || 100 },
          { accessor: "DosageNumerator2Unit", title: "Num 2 Unit", width: columnWidths["DosageNumerator2Unit"] || 60 },
          { accessor: "DosageDenominator2", title: "Deno 2", width: columnWidths["DosageDenominator2"] || 100 },
          {
            accessor: "DosageDenominator2Unit",
            title: "Deno 2 Unit",
            width: columnWidths["DosageDenominator2Unit"] || 60,
          },
          { accessor: "DosageDenominator3", title: "Deno 3", width: columnWidths["DosageDenominator3"] || 100 },
          {
            accessor: "DosageDenominator3Unit",
            title: "Deno 3 Unit",
            width: columnWidths["DosageDenominator3Unit"] || 60,
          },
          { accessor: "DFSequence", title: "D-F Sequence", width: columnWidths["DFSequence"] || 120 },
        ]
        break

      /* --------------------------------------------------
         ATC Check Preset
         -------------------------------------------------- */
      case "atcCheck":
        columnsList = [
          { accessor: "DrugName", title: "Brand Name", width: columnWidths["DrugName"] || 60 },
          { accessor: "ATC", title: "ATC", width: columnWidths["ATC"] || 100 },
          {
            accessor: "ATCRelatedIngredient",
            title: "ATC Related Ingredient",
            width: columnWidths["ATCRelatedIngredient"] || 180,
          },
          { accessor: "OtherIngredients", title: "All Ingredients", width: columnWidths["OtherIngredients"] || 180 },
          { accessor: "Seq", title: "Seq", width: columnWidths["Seq"] || 80 },
          { accessor: "Dosage", title: "Dosage (merged)", width: columnWidths["Dosage"] || 200 },
          { accessor: "Route", title: "Route (clean)", width: columnWidths["Route"] || 130 },
          { accessor: "RouteRaw", title: "Route Raw", width: columnWidths["RouteRaw"] || 120 },
        ]
        break

      /* --------------------------------------------------
         Presentation Check Preset
         -------------------------------------------------- */
      case "presentationCheck":
        columnsList = [
          { accessor: "DrugName", title: "Brand Name", width: columnWidths["DrugName"] || 60 },
          { accessor: "Seq", title: "Seq", width: columnWidths["Seq"] || 80 },
          { accessor: "FormLNDI", title: "Form LNDI", width: columnWidths["FormLNDI"] || 120 },
          { accessor: "Form", title: "Dosage-form (clean)", width: columnWidths["Form"] || 60 },
          { accessor: "FormRaw", title: "Form Raw", width: columnWidths["FormRaw"] || 120 },
          { accessor: "PresentationLNDI", title: "PresentationLNDI", width: columnWidths["PresentationLNDI"] || 60 },
          {
            accessor: "PresentationDescription",
            title: "Presentation Description",
            width: columnWidths["PresentationDescription"] || 180,
          },
          {
            accessor: "PresentationUnitQuantity1",
            title: "Unit Qtty 1",
            width: columnWidths["PresentationUnitQuantity1"] || 60,
          },
          {
            accessor: "PresentationUnitType1",
            title: "Unit Type 1",
            width: columnWidths["PresentationUnitType1"] || 60,
          },
          {
            accessor: "PresentationPackageQuantity1",
            title: "Package Qtty 1",
            width: columnWidths["PresentationPackageQuantity1"] || 60,
          },
          {
            accessor: "PresentationPackageType1",
            title: "Package Type 1",
            width: columnWidths["PresentationPackageType1"] || 100,
          },
          {
            accessor: "PresentationPackageQuantity2",
            title: "Package Qtty 2 (clean)",
            width: columnWidths["PresentationPackageQuantity2"] || 60,
          },
          {
            accessor: "PresentationPackageType2",
            title: "Package Type 2",
            width: columnWidths["PresentationPackageType2"] || 100,
          },
          {
            accessor: "PresentationUnitQuantity2",
            title: "Unit Qtty 2 (clean)",
            width: columnWidths["PresentationUnitQuantity2"] || 100,
          },
          {
            accessor: "PresentationUnitType2",
            title: "Unit Type 2 (clean)",
            width: columnWidths["PresentationUnitType2"] || 100,
          },
          {
            accessor: "PresentationPackageQuantity3",
            title: "Package Qtty 3",
            width: columnWidths["PresentationPackageQuantity3"] || 60,
          },
          {
            accessor: "PresentationPackageType3",
            title: "Package Type 3",
            width: columnWidths["PresentationPackageType3"] || 60,
          },
        ]
        break

      /* --------------------------------------------------
         Default Preset
         -------------------------------------------------- */
      default:
        columnsList = [
          { accessor: "DrugName", title: "DrugName", width: columnWidths["DrugName"] || 60 },
          { accessor: "MoPHCode", title: "MoPHCode", width: columnWidths["MoPHCode"] || 120 },
          { accessor: "DrugNameAR", title: "DrugNameAR", width: columnWidths["DrugNameAR"] || 60 },
          { accessor: "Seq", title: "Seq", width: columnWidths["Seq"] || 80 },
          { accessor: "ProductType", title: "ProductType", width: columnWidths["ProductType"] || 120 },
          { accessor: "ATC", title: "ATC", width: columnWidths["ATC"] || 100 },
          {
            accessor: "ATCRelatedIngredient",
            title: "ATC Related Ingredient",
            width: columnWidths["ATCRelatedIngredient"] || 180,
          },
          { accessor: "OtherIngredients", title: "All Ingredients", width: columnWidths["OtherIngredients"] || 180 },
          { accessor: "Dosage", title: "Dosage (merged)", width: columnWidths["Dosage"] || 200 },
          { accessor: "Form", title: "Dosage-form (clean)", width: columnWidths["Form"] || 60 },
          { accessor: "FormRaw", title: "Form Raw", width: columnWidths["FormRaw"] || 120 },
          { accessor: "FormLNDI", title: "Form LNDI", width: columnWidths["FormLNDI"] || 120 },
          { accessor: "Parent", title: "Route Parent", width: columnWidths["Parent"] || 120 },
          { accessor: "Route", title: "Route (clean)", width: columnWidths["Route"] || 130 },
          { accessor: "RouteRaw", title: "Route Raw", width: columnWidths["RouteRaw"] || 120 },
          { accessor: "RouteLNDI", title: "Route LNDI", width: columnWidths["RouteLNDI"] || 120 },
          { accessor: "Parentaral", title: "Parentaral", width: columnWidths["Parentaral"] || 120 },
          { accessor: "Stratum", title: "Stratum", width: columnWidths["Stratum"] || 120 },
          { accessor: "Amount", title: "Amount", width: columnWidths["Amount"] || 60 },
          { accessor: "Agent", title: "Agent", width: columnWidths["Agent"] || 120 },
          { accessor: "Manufacturer", title: "Manufacturer", width: columnWidths["Manufacturer"] || 120 },
          { accessor: "Country", title: "Country", width: columnWidths["Country"] || 120 },
        ]
    }

    // Filter columns based on visibility settings
    return columnsList.filter((col) => settings.visibleColumns[col.accessor] !== false)
  }, [columnPreset, columnWidths, settings.visibleColumns])

  // Modify the filteredData useMemo to filter from all loaded data
  const filteredData = useMemo<any[]>(() => {
    // Use allData instead of tableData for filtering to include all loaded drugs
    let filtered = allData

    // Apply global filter
    if (globalFilter) {
      filtered = filtered.filter((row) => {
        return Object.values(row).some(
          (value) => value && value.toString().toLowerCase().includes(globalFilter.toLowerCase()),
        )
      })
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnId, filterValues]) => {
      if (filterValues && filterValues.length > 0) {
        filtered = filtered.filter((row) => {
          const cellValue = row[columnId]
          return filterValues.includes(cellValue?.toString() || "")
        })
      }
    })

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        // Handle null, undefined, and "N/A" values
        if (aValue === null || aValue === undefined || aValue === "N/A") return sortDirection === "asc" ? 1 : -1
        if (bValue === null || bValue === undefined || bValue === "N/A") return sortDirection === "asc" ? -1 : 1

        // Compare numbers
        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          return sortDirection === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
        }

        // Compare strings
        const aString = String(aValue).toLowerCase()
        const bString = String(bValue).toLowerCase()

        return sortDirection === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
      })
    }

    return filtered
  }, [allData, globalFilter, columnFilters, sortColumn, sortDirection])

  // Modify the columns useMemo to respect column order
  const orderedColumns = useMemo(() => {
    if (columnOrder.length === 0) {
      return columns
    }

    // Create a map for quick lookup
    const columnMap = new Map(columns.map((col) => [col.accessor, col]))

    // Return columns in the specified order, falling back to original order for any not in columnOrder
    return [
      ...columnOrder.map((id) => columnMap.get(id)).filter((col): col is (typeof columns)[0] => col !== undefined), // Type guard to ensure no undefined values
      ...columns.filter((col) => !columnOrder.includes(col.accessor)),
    ]
  }, [columns, columnOrder])

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return filteredData.slice(start, end)
  }, [filteredData, page, pageSize])

  // Increase overscan for smoother virtualization
  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => settings.cellSize,
    overscan: 50, // Increased from 20 to 50 for smoother scrolling
  })

  // Get virtualized rows
  const virtualRows = settings.enableVirtualization
    ? rowVirtualizer.getVirtualItems()
    : paginatedData.map((_, index) => ({
        index,
        start: index * settings.cellSize,
        end: (index + 1) * settings.cellSize,
      }))

  const totalSize = settings.enableVirtualization
    ? rowVirtualizer.getTotalSize()
    : paginatedData.length * settings.cellSize

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start || 0 : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1].end || 0) : 0

  // Remove the event listeners for confirm/reject cell changes
  // Remove this useEffect block or replace it with this simplified version

  useEffect(() => {
    // Handle document-wide mouse up event to stop dragging
    const handleMouseUp = () => {
      handleCellMouseUp()
    }

    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  // Cell selection handler
  const handleCellClick = (rowId: string, columnId: string, ctrlKey: boolean) => {
    const cellKey = `${rowId}-${columnId}`

    if (ctrlKey) {
      // Multi-select mode
      setSelectedCells((prev) => {
        const newSelection = new Set(prev)
        if (newSelection.has(cellKey)) {
          newSelection.delete(cellKey)
        } else {
          newSelection.add(cellKey)
        }
        return newSelection
      })
    } else {
      // Single select mode
      setSelectedCells(new Set([cellKey]))
    }
  }

  // Row selection handler
  const handleRowSelect = (rowId: string, ctrlKey: boolean, shiftKey: boolean) => {
    if (ctrlKey) {
      // Toggle selection of this row
      setSelectedRows((prev) => {
        const newSelection = new Set(prev)
        if (newSelection.has(rowId)) {
          newSelection.delete(rowId)
        } else {
          newSelection.add(rowId)
        }
        return newSelection
      })
      setLastSelectedRow(rowId)
    } else if (shiftKey && lastSelectedRow) {
      // Range selection
      const allRowIds = paginatedData.map((row) => row.DrugID)
      const startIdx = allRowIds.indexOf(lastSelectedRow)
      const endIdx = allRowIds.indexOf(rowId)

      if (startIdx !== -1 && endIdx !== -1) {
        const start = Math.min(startIdx, endIdx)
        const end = Math.max(startIdx, endIdx)
        const rangeIds = allRowIds.slice(start, end + 1)

        setSelectedRows(new Set(rangeIds))
      }
    } else {
      // Single selection
      setSelectedRows(new Set([rowId]))
      setLastSelectedRow(rowId)
    }
  }

  // Clear all selections
  const clearSelections = () => {
    setSelectedRows(new Set())
    setSelectedCells(new Set())
    setLastSelectedRow(null)
  }

  // Delete selected rows
  const deleteSelectedRows = async () => {
    if (selectedRows.size === 0) return

    if (window.confirm(`Are you sure you want to delete ${selectedRows.size} selected drug(s)?`)) {
      setIsLoading(true)

      try {
        // Delete each selected row
        const promises = Array.from(selectedRows).map((rowId) =>
          api.delete(`/drugs/delete/${rowId}`).catch((error) => {
            console.error(`Error deleting drug ${rowId}:`, error)
            return { error, rowId }
          }),
        )

        const results = await Promise.all(promises)
        const failedDeletes = results.filter((result) => "error" in result)

        // Update local data
        setTableData((prevData) => prevData.filter((drug) => !selectedRows.has(drug.DrugID)))
        setAllData((prevData) => prevData.filter((drug) => !selectedRows.has(drug.DrugID)))

        // Clear selection
        clearSelections()

        if (failedDeletes.length > 0) {
          showNotification(
            `Deleted ${selectedRows.size - failedDeletes.length} drugs, but ${failedDeletes.length} failed`,
            "info",
          )
        } else {
          showNotification(`Successfully deleted ${selectedRows.size} drugs`, "success")
        }
      } catch (error) {
        console.error("Error during batch delete:", error)
        showNotification("Error during batch delete operation", "error")
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Get filter options for a column
  const getFilterOptions = (columnId: string) => {
    const uniqueValues = new Set<string>()

    // Use a limited subset of data for better performance
    const sampleData = allData.slice(0, 1000)

    sampleData.forEach((row) => {
      const value = row[columnId]
      if (value !== null && value !== undefined && value !== "" && value !== "N/A") {
        uniqueValues.add(value.toString())
      }
    })

    return Array.from(uniqueValues).sort()
  }

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({})
    setActiveFilters([])
  }

  // Add a function to start editing a row
  const startEditingRow = (rowId: string) => {
    const row = tableData.find((row) => row.DrugID === rowId)
    if (row) {
      setEditingRowId(rowId)
      setEditFormData({ ...row })
    }
  }

  // Add a function to handle input changes in the edit form
  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Add a function to save the edited row
  const saveEditedRow = async () => {
    if (!editingRowId) return

    try {
      await handleSaveRow(editingRowId, editFormData)
      setEditingRowId(null)
      setEditFormData({})
      showNotification("Row updated successfully", "success")
    } catch (error) {
      console.error("Error saving edited row:", error)
      showNotification("Failed to update row", "error")
    }
  }

  // Add a function to cancel editing
  const cancelEditing = () => {
    setEditingRowId(null)
    setEditFormData({})
  }

  return (
    <div
      className={cn(
        "flex flex-col w-full h-[90vh] relative bg-white drug-table-container",
        isFullscreen && "fixed inset-0 z-50 bg-white p-4",
      )}
      style={{
        scrollbarGutter: "stable",
        overflow: "hidden",
      }}
    >
      <style>{tableStyles}</style>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <span className="font-medium">Column Preset:</span>
          <Select value={columnPreset} onValueChange={(value) => setColumnPreset(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="substitutionCheck">Substitution Check</SelectItem>
              <SelectItem value="atcCheck">ATC Check</SelectItem>
              <SelectItem value="presentationCheck">Presentation Check</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Columns
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Undo className="h-4 w-4 mr-2" />
            Undo
          </Button>

          <Button
            variant="outline"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Redo className="h-4 w-4 mr-2" />
            Redo
          </Button>

          <Button
            variant="outline"
            onClick={saveTableState}
            disabled={!hasUnsavedChanges}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            Save
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#00A651] hover:bg-[#008f45] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Drug
          </Button>

          <Button onClick={() => exportToExcel(tableData)} className="bg-[#00A651] hover:bg-[#008f45] text-white">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="relative w-[300px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search all columns..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>

          {Object.keys(columnFilters).length > 0 && (
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
              onClick={clearAllFilters}
            >
              <FilterX className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          )}
        </div>

        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-2 py-1">
              {selectedRows.size} row(s) selected
            </Badge>
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-50 text-red-500 border-red-500"
              onClick={deleteSelectedRows}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
              onClick={clearSelections}
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 italic mb-2">
        Tip: Click and drag a cell value to fill other cells with the same value. Use Ctrl+Click for multiple selection.
      </p>

      <div className="flex-1 border rounded-lg relative bg-white overflow-hidden" ref={tableContainerRef}>
        <div className="table-scroll-container">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading data...</span>
            </div>
          ) : (
            <div style={{ minWidth: "100%", width: "max-content" }}>
              <Table>
                <TableHeader
                  className="bg-white z-10 text-black"
                  style={{
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    zIndex: 20,
                  }}
                >
                  <TableRow>
                    <TableHead className="w-[60px] text-black font-bold">#</TableHead>
                    <TableHead className="w-[80px] text-black font-bold">Actions</TableHead>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={paginatedData.length > 0 && selectedRows.size === paginatedData.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRows(new Set(paginatedData.map((row) => row.DrugID)))
                          } else {
                            setSelectedRows(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    {orderedColumns.map((column) => (
                      <EnhancedHeader
                        key={column.accessor}
                        column={column}
                        onResize={handleColumnResize}
                        onSort={handleSort}
                        sortDirection={sortColumn === column.accessor ? sortDirection : null}
                        sortColumn={sortColumn}
                        onFilter={(columnId, values) => updateColumnFilters(columnId, values)}
                        activeFilters={columnFilters}
                        filterOptions={getFilterOptions(column.accessor)}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length + 3} className="text-center py-8">
                        No results found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td style={{ height: `${paddingTop}px` }} colSpan={columns.length + 3} />
                        </tr>
                      )}
                      {virtualRows.map((virtualRow) => {
                        const row = paginatedData[virtualRow.index]
                        const isSelected = selectedRows.has(row.DrugID)
                        const rowNumber = (page - 1) * pageSize + virtualRow.index + 1
                        const isEditing = editingRowId === row.DrugID

                        return (
                          <TableRow
                            key={row.DrugID}
                            className={cn(
                              isSelected && "bg-[#e6f7ef]",
                              virtualRow.index % 2 === 0 ? "bg-white" : "bg-[#f0faf5]",
                              isEditing && "bg-blue-50", // Highlight row being edited
                              "text-gray-900", // Ensure consistent text color
                            )}
                          >
                            <TableCell className="text-center">{rowNumber}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex space-x-1">
                                  <Button variant="ghost" size="icon" onClick={saveEditedRow}>
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={cancelEditing}>
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40">
                                    <div className="flex flex-col space-y-1">
                                      <Button
                                        variant="ghost"
                                        className="justify-start"
                                        onClick={() => startEditingRow(row.DrugID)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        className="justify-start text-red-500"
                                        onClick={() => handleDeleteRow(row.DrugID)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleRowSelect(row.DrugID, false, false)}
                              />
                            </TableCell>
                            {orderedColumns.map((column) => (
                              <TableCell key={`${row.DrugID}-${column.accessor}`}>
                                {isEditing ? (
                                  // Render input field for editing
                                  <Input
                                    value={editFormData[column.accessor] || ""}
                                    onChange={(e) => handleEditFormChange(column.accessor, e.target.value)}
                                    className="h-8 w-full"
                                  />
                                ) : (
                                  // Render normal cell
                                  <Cell
                                    value={row[column.accessor]}
                                    rowId={row.DrugID}
                                    column={column.accessor}
                                    isDragging={isDragging}
                                    dragValue={dragValue}
                                    dragColumnId={dragColumnId}
                                    cellStatus={changedCells[`${row.DrugID}-${column.accessor}`] || null}
                                    isSelected={selectedCells.has(`${row.DrugID}-${column.accessor}`)}
                                    onMouseDown={handleCellMouseDown}
                                    onMouseEnter={() => handleCellMouseEnter(row.DrugID)}
                                    onClick={handleCellClick}
                                  />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length + 3} />
                        </tr>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {isLoadingMore && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading more data...</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center p-2 border-t mt-2">
        <span className="text-sm text-gray-500">{filteredData.length} row(s) total</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(1) // Reset to first page when changing page size
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="300">300</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="text-[#00A651]"
            >
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="text-[#00A651]"
            >
              Prev
            </Button>
            <span className="text-sm">
              Page {page} of {Math.max(1, Math.ceil(filteredData.length / pageSize))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= Math.ceil(filteredData.length / pageSize) && !hasMoreData}
              onClick={() => {
                // If we're at the end of loaded data but there's more to load, fetch more
                if (page >= Math.ceil(filteredData.length / pageSize) && hasMoreData) {
                  loadMoreData()
                }
                setPage(page + 1)
              }}
              className="text-[#00A651]"
            >
              Next
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= Math.ceil(filteredData.length / pageSize)}
              onClick={() => setPage(Math.ceil(filteredData.length / pageSize))}
              className="text-[#00A651]"
            >
              Last
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Table Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="appearance">
            <TabsList>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
            </TabsList>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Visual Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Row Color Scheme</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {["white-green", "light-green", "light-blue"].map((color) => (
                        <div
                          key={color}
                          onClick={() => setSettings((prev) => ({ ...prev, rowColorScheme: color as any }))}
                          className={cn(
                            "cursor-pointer p-2 rounded-md border-2 flex flex-col items-center",
                            settings.rowColorScheme === color ? "border-[#00A651]" : "border-transparent",
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full",
                              color === "white-green"
                                ? "bg-[#f0faf5]"
                                : color === "light-green"
                                  ? "bg-[#e6f7ef]"
                                  : "bg-blue-50",
                            )}
                          />
                          <span className="text-xs mt-1 capitalize">
                            {color === "white-green"
                              ? "White & Green"
                              : color === "light-green"
                                ? "Light Green"
                                : "Light Blue"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Cell Size</h3>
                    <Slider
                      min={25}
                      max={60}
                      step={5}
                      value={[settings.cellSize]}
                      onValueChange={(value) => setSettings((prev) => ({ ...prev, cellSize: value[0] }))}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Small (25px)</span>
                      <span>Medium (35px)</span>
                      <span>Large (45px)</span>
                      <span>XL (60px)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="columns">
              <Card>
                <CardHeader>
                  <CardTitle>Column Visibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      <div className="flex justify-between mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allColumns = {}
                            columns.forEach((col) => {
                              allColumns[col.accessor] = true
                            })
                            setSettings((prev) => ({ ...prev, visibleColumns: allColumns }))
                          }}
                          className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
                        >
                          Show All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allColumns = {}
                            columns.forEach((col) => {
                              allColumns[col.accessor] = false
                            })
                            // Keep at least one column visible
                            if (columns.length > 0) {
                              allColumns[columns[0].accessor] = true
                            }
                            setSettings((prev) => ({ ...prev, visibleColumns: allColumns }))
                          }}
                          className="bg-white hover:bg-gray-50 text-[#00A651] border-[#00A651]"
                        >
                          Hide All
                        </Button>
                      </div>

                      {columns.map((column) => (
                        <div key={column.accessor} className="flex items-center justify-between py-2 border-b">
                          <div className="font-medium">{column.title}</div>
                          <Switch
                            checked={settings.visibleColumns[column.accessor] !== false}
                            onCheckedChange={(checked) => toggleColumnVisibility(column.accessor)}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Enable Virtualization</h3>
                      <p className="text-sm text-gray-500">
                        Virtualization improves performance with large datasets but may cause some visual glitches.
                      </p>
                    </div>
                    <Switch
                      checked={settings.enableVirtualization}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enableVirtualization: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Enable Lazy Loading</h3>
                      <p className="text-sm text-gray-500">
                        Load data in batches as you scroll for better initial performance.
                      </p>
                    </div>
                    <Switch
                      checked={settings.lazyLoading}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, lazyLoading: checked }))}
                    />
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Batch Size</h3>
                    <Slider
                      min={100}
                      max={1000}
                      step={100}
                      value={[settings.batchSize]}
                      onValueChange={(value) => setSettings((prev) => ({ ...prev, batchSize: value[0] }))}
                      disabled={!settings.lazyLoading}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>100 rows</span>
                      <span>500 rows</span>
                      <span>1000 rows</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior">
              <Card>
                <CardHeader>
                  <CardTitle>Behavior Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Confirm Before Refresh</h3>
                      <p className="text-sm text-gray-500">
                        Show a confirmation dialog when refreshing the page with unsaved changes.
                      </p>
                    </div>
                    <Switch
                      checked={settings.confirmBeforeRefresh}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, confirmBeforeRefresh: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Auto-Save Table State</h3>
                      <p className="text-sm text-gray-500">Automatically save table state every 30 seconds.</p>
                    </div>
                    <Switch
                      checked={settings.autoSaveState}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoSaveState: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Drug Modal */}
      {isAddModalOpen && (
        <AddDrugModal
          opened={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddSuccess={(newDrug) => {
            setTableData((prev) => [...prev, newDrug])
            setAllData((prev) => [...prev, newDrug])
            showNotification("Drug added successfully", "success")
          }}
          atcOptions={atcOptions}
          dosageNumerator1UnitOptions={dosageNumerator1UnitOptions}
          dosageDenominator1UnitOptions={dosageDenominator1UnitOptions}
          formOptions={formOptions}
          routeOptions={routeOptions}
        />
      )}

      {/* Notification */}
      {notification && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-lg flex items-center gap-2",
            notification.type === "success" && "bg-[#e6f7ef] text-[#00A651] border border-[#00A651]/20",
            notification.type === "error" && "bg-red-100 text-red-800 border border-red-200",
            notification.type === "info" && "bg-blue-100 text-blue-800 border border-blue-200",
          )}
        >
          {notification.type === "success" && <Check className="h-5 w-5" />}
          {notification.type === "error" && <X className="h-5 w-5" />}
          {notification.type === "info" && <AlertCircle className="h-5 w-5" />}
          <span>{notification.message}</span>
          <Button variant="ghost" size="icon" className="ml-2" onClick={() => setNotification(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Save Results Modal */}
      <Dialog open={showSaveResultsModal} onOpenChange={setShowSaveResultsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Save Results</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row ID</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saveResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.rowId}</TableCell>
                    <TableCell>{result.columnId}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <Badge className="bg-[#e6f7ef] text-[#00A651]">Success</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{result.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button
              onClick={() => setShowSaveResultsModal(false)}
              className="bg-[#00A651] hover:bg-[#008f45] text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
