// Create a proxy route for adding manufacturers
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Get the manufacturer data from the request
    const manufacturerData = await request.json()

    // Make the request to the external API
    const response = await fetch("https://apiv2.medleb.org/manufacturer/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(manufacturerData),
      cache: "no-store",
      // Set a timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    // Check if the response is successful
    if (!response.ok) {
      console.error(`External API returned status: ${response.status}`)

      // Try to get error details from the response
      let errorDetails = "Unknown error"
      try {
        const errorData = await response.text()
        errorDetails = errorData
      } catch (e) {
        console.error("Could not parse error response:", e)
      }

      // Fall back to local implementation
      const { manufacturers } = await import("@/app/api/manufacturer/route")

      // Generate a new ID
      const newId = Math.max(...manufacturers.map((m) => m.ManufacturerId)) + 1

      const newManufacturer = {
        ManufacturerId: newId,
        ManufacturerName: manufacturerData.ManufacturerName,
        Country: manufacturerData.Country,
        ParentCompany: manufacturerData.ParentCompany,
        ParentGroup: manufacturerData.ParentGroup,
      }

      // Add to local data
      manufacturers.push(newManufacturer)

      return NextResponse.json(
        { ...newManufacturer, _note: "Added locally due to external API error" },
        { status: 201 },
      )
    }

    // Parse the response
    try {
      const data = await response.json()
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("Error parsing response from external API:", parseError)

      // Fall back to returning the manufacturer data with a generated ID
      const { manufacturers } = await import("@/app/api/manufacturer/route")
      const newId = Math.max(...manufacturers.map((m) => m.ManufacturerId)) + 1

      return NextResponse.json({
        ManufacturerId: newId,
        ...manufacturerData,
        _note: "Generated ID locally due to parsing error",
      })
    }
  } catch (error) {
    console.error("Error adding manufacturer via proxy:", error)
    return NextResponse.json({ error: "Failed to add manufacturer" }, { status: 500 })
  }
}
