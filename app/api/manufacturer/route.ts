import { NextResponse } from "next/server"

// Sample manufacturer data
const manufacturers = [
  {
    ManufacturerId: 3,
    ManufacturerName: "Laboratoires Besins International",
    Country: "France",
    ParentCompany: "Laboratoires Besins International",
    ParentGroup: null,
  },
  {
    ManufacturerId: 13,
    ManufacturerName: "GlaxoWellcome SA",
    Country: "Spain",
    ParentCompany: "Glaxowellcome",
    ParentGroup: null,
  },
  {
    ManufacturerId: 16,
    ManufacturerName: "Hameln Pharmaceuticals GmbH",
    Country: "Germany",
    ParentCompany: "Hameln Pharmaceuticals",
    ParentGroup: null,
  },
  {
    ManufacturerId: 18,
    ManufacturerName: "Hikma Pharmaceuticals",
    Country: "Jordan",
    ParentCompany: "Hikma Pharmaceuticals",
    ParentGroup: null,
  },
  {
    ManufacturerId: 24,
    ManufacturerName: "Merck Sharp & Dohme BV",
    Country: "The Netherlands",
    ParentCompany: "Merck Sharp & Dohme",
    ParentGroup: null,
  },
  {
    ManufacturerId: 25,
    ManufacturerName: "Merck Sharp & Dohme Ltd",
    Country: "UK",
    ParentCompany: "Merck Sharp & Dohme",
    ParentGroup: null,
  },
  {
    ManufacturerId: 30,
    ManufacturerName: "Pfizer Inc",
    Country: "USA",
    ParentCompany: "Pfizer",
    ParentGroup: null,
  },
  {
    ManufacturerId: 31,
    ManufacturerName: "Roche Pharmaceuticals",
    Country: "Switzerland",
    ParentCompany: "Hoffmann-La Roche",
    ParentGroup: null,
  },
  {
    ManufacturerId: 32,
    ManufacturerName: "Sanofi-Aventis",
    Country: "France",
    ParentCompany: "Sanofi",
    ParentGroup: null,
  },
  {
    ManufacturerId: 33,
    ManufacturerName: "AstraZeneca",
    Country: "UK",
    ParentCompany: "AstraZeneca",
    ParentGroup: null,
  },
]

// Make manufacturers available for import
export { manufacturers }

// GET handler to return all manufacturers
export async function GET() {
  return NextResponse.json(manufacturers)
}

// POST handler to add a new manufacturer
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
