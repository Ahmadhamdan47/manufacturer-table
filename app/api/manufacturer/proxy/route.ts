// Update the proxy route to handle all manufacturer operations

import { NextResponse } from "next/server"
import { manufacturers } from "@/app/api/manufacturer/route"

// GET handler for fetching all manufacturers
export async function GET() {
  try {
    console.log("Proxy route: Attempting to fetch manufacturers from external API")

    // Make the request from the server side to avoid CORS issues
    const response = await fetch("https://apiv2.medleb.org/manufacturer/", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Add a cache: 'no-store' option to prevent caching
      cache: "no-store",
      // Set a timeout to prevent hanging
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    // Check content type to avoid HTML responses
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("text/html")) {
      console.error("External API returned HTML instead of JSON")
      return NextResponse.json(manufacturers)
    }

    if (!response.ok) {
      console.log(`External API returned status: ${response.status}`)
      // Return local data as fallback
      return NextResponse.json(manufacturers)
    }

    try {
      const text = await response.text()

      // Try to parse as JSON
      try {
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          console.log(`Successfully fetched ${data.length} manufacturers from external API`)
          return NextResponse.json(data)
        } else {
          console.error("Invalid data format from external API (not an array)")
          return NextResponse.json(manufacturers)
        }
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError)
        console.error("Response text:", text.substring(0, 200) + "...") // Log first 200 chars
        return NextResponse.json(manufacturers)
      }
    } catch (parseError) {
      console.error("Error reading response from external API:", parseError)
      return NextResponse.json(manufacturers)
    }
  } catch (error) {
    console.error("Error fetching from external API:", error)
    // Use local data as fallback
    return NextResponse.json(manufacturers)
  }
}

// POST handler for adding a manufacturer
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

      // Fall back to local implementation
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
