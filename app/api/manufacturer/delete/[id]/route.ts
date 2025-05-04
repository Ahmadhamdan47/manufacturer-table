import { NextResponse } from "next/server"

// Import the manufacturers data from the parent route
// In a real app, this would be a database query
import { manufacturers } from "@/app/api/manufacturer/route"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Find the manufacturer to delete
    const manufacturerIndex = manufacturers.findIndex((m) => m.ManufacturerId === id)

    if (manufacturerIndex === -1) {
      return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 })
    }

    // Delete the manufacturer
    manufacturers.splice(manufacturerIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete manufacturer" }, { status: 400 })
  }
}
