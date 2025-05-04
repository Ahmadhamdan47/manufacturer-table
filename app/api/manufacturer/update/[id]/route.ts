import { NextResponse } from "next/server"

// Import the manufacturers data from the parent route
// In a real app, this would be a database query
import { manufacturers } from "@/app/api/manufacturer/route"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const data = await request.json()

    // Find the manufacturer to update
    const manufacturerIndex = manufacturers.findIndex((m) => m.ManufacturerId === id)

    if (manufacturerIndex === -1) {
      return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 })
    }

    // Update the manufacturer
    const updatedManufacturer = {
      ...manufacturers[manufacturerIndex],
      ...data,
    }

    manufacturers[manufacturerIndex] = updatedManufacturer

    return NextResponse.json(updatedManufacturer)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update manufacturer" }, { status: 400 })
  }
}
