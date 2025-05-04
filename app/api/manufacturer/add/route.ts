import { NextResponse } from "next/server"

// Import the manufacturers data from the parent route
// In a real app, this would be a database query
import { manufacturers } from "@/app/api/manufacturer/route"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Generate a new ID (in a real app, this would be handled by the database)
    const newId = Math.max(...manufacturers.map((m) => m.ManufacturerId)) + 1

    const newManufacturer = {
      ManufacturerId: newId,
      ManufacturerName: data.ManufacturerName,
      Country: data.Country,
      ParentCompany: data.ParentCompany,
      ParentGroup: data.ParentGroup,
    }

    // In a real app, this would be saved to a database
    manufacturers.push(newManufacturer)

    return NextResponse.json(newManufacturer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to add manufacturer" }, { status: 400 })
  }
}
