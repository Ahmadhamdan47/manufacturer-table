import * as XLSX from "xlsx"

export function exportToExcel(data: any[]) {
  // Filter out data that shouldn't be exported
  const exportData = data.map((item) => {
    const { ...rest } = item
    return rest
  })

  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData)

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Drugs")

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `drug-data-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
