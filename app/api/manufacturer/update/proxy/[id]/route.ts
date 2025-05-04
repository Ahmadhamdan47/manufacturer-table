// Create a proxy route for updating manufacturers
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get the manufacturer ID from the params
    const manufacturerId = params.id

    // Get the manufacturer data from the request
    const manufacturerData = await request.json()

    // Make the request to the external API
    const response = await fetch(`https://apiv2.medleb.org/manufacturer/${manufacturerId}`, {
      method: "PUT",
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

      // Find the manufacturer to update
      const manufacturerIndex = manufacturers.findIndex((m) => m.ManufacturerId.toString() === manufacturerId)

      if (manufacturerIndex === -1) {
        return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 })
      }

      // Update the manufacturer
      const updatedManufacturer = {
        ...manufacturers[manufacturerIndex],
        ...manufacturerData,
      }

      manufacturers[manufacturerIndex] = updatedManufacturer

      return NextResponse.json({ ...updatedManufacturer, _note: "Updated locally due to external API error" })
    }

    // Parse the response
    try {
      const data = await response.json()
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("Error parsing response from external API:", parseError)

      // Fall back to returning the manufacturer data
      return NextResponse.json({
        ...manufacturerData,
        _note: "Update succeeded but response parsing failed",
      })
    }
  } catch (error) {
    console.error("Error updating manufacturer via proxy:", error)
    return NextResponse.json({ error: "Failed to update manufacturer" }, { status: 500 })
  }
}
