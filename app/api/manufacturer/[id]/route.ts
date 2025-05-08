// Create a unified route handler for manufacturer operations by ID

import { NextResponse } from "next/server"
import { manufacturers } from "@/app/api/manufacturer/route"

// PUT handler for updating a manufacturer
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get the manufacturer ID from the params
    const manufacturerId = params.id

    // Get the manufacturer data from the request
    const manufacturerData = await request.json()

    console.log(`Backend: Updating manufacturer ${manufacturerId}:`, manufacturerData)

    // Make the request to the external API
    try {
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
        throw new Error(`External API failed with status ${response.status}`)
      }

      // Parse the response
      try {
        const data = await response.json()
        console.log("External API update success:", data)
        return NextResponse.json(data)
      } catch (parseError) {
        console.error("Error parsing response from external API:", parseError)
        throw new Error("Failed to parse external API response")
      }
    } catch (apiError) {
      console.log("Falling back to local implementation due to:", apiError)

      // Fall back to local implementation
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
      console.log("Local update success:", updatedManufacturer)

      return NextResponse.json({ ...updatedManufacturer, _note: "Updated locally due to external API error" })
    }
  } catch (error) {
    console.error("Error updating manufacturer via proxy:", error)
    return NextResponse.json({ error: "Failed to update manufacturer", details: String(error) }, { status: 500 })
  }
}

// DELETE handler for deleting a manufacturer
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get the manufacturer ID from the params
    const manufacturerId = params.id

    // Make the request to the external API
    const response = await fetch(`https://apiv2.medleb.org/manufacturer/${manufacturerId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      // Set a timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    // Check if the response is successful
    if (!response.ok) {
      console.error(`External API returned status: ${response.status}`)

      // Fall back to local implementation
      // Find the manufacturer to delete
      const manufacturerIndex = manufacturers.findIndex((m) => m.ManufacturerId.toString() === manufacturerId)

      if (manufacturerIndex === -1) {
        return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 })
      }

      // Delete the manufacturer
      manufacturers.splice(manufacturerIndex, 1)

      return NextResponse.json({ success: true, _note: "Deleted locally due to external API error" })
    }

    // Parse the response
    try {
      const data = await response.json()
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("Error parsing response from external API:", parseError)

      // Fall back to returning success
      return NextResponse.json({
        success: true,
        _note: "Delete succeeded but response parsing failed",
      })
    }
  } catch (error) {
    console.error("Error deleting manufacturer via proxy:", error)
    return NextResponse.json({ error: "Failed to delete manufacturer" }, { status: 500 })
  }
}
