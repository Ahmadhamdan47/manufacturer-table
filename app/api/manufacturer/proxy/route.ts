// Modify the proxy route to better handle errors

import { NextResponse } from "next/server"
import { manufacturers } from "@/app/api/manufacturer/route"

export async function GET() {
  try {
    // Make the request from the server side to avoid CORS issues
    const response = await fetch("https://apiv2.medleb.org/manufacturer/", {
      headers: {
        "Content-Type": "application/json",
      },
      // Add a cache: 'no-store' option to prevent caching
      cache: "no-store",
      // Set a timeout to prevent hanging
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      console.log(`External API returned status: ${response.status}`)
      // Return local data as fallback
      return NextResponse.json(manufacturers)
    }

    try {
      const data = await response.json()
      if (Array.isArray(data)) {
        return NextResponse.json(data)
      } else {
        console.error("Invalid data format from external API")
        return NextResponse.json(manufacturers)
      }
    } catch (parseError) {
      console.error("Error parsing response from external API:", parseError)
      return NextResponse.json(manufacturers)
    }
  } catch (error) {
    console.error("Error fetching from external API:", error)
    // Use local data as fallback
    return NextResponse.json(manufacturers)
  }
}
