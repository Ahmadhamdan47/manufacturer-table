"use client"

import { useState } from "react"
import api from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AddManufacturerModalProps {
  opened: boolean
  onClose: () => void
  onAddSuccess: (newManufacturer: any) => void
}

export function AddManufacturerModal({ opened, onClose, onAddSuccess }: AddManufacturerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Manufacturer information
  const [manufacturerName, setManufacturerName] = useState("")
  const [country, setCountry] = useState("")
  const [parentCompany, setParentCompany] = useState("")
  const [parentGroup, setParentGroup] = useState("")

  const handleSubmit = async () => {
    if (!manufacturerName) {
      alert("Manufacturer name is required")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare manufacturer data
      const manufacturerData = {
        ManufacturerName: manufacturerName,
        Country: country || null,
        ParentCompany: parentCompany || null,
        ParentGroup: parentGroup || null,
      }

      // Make API call to add manufacturer using the proxy route
      const response = await api.post("/api/manufacturer", manufacturerData)

      // Add more detailed logging
      console.log("Manufacturer added successfully:", response.data)

      // Call success callback with the new manufacturer
      onAddSuccess(response.data)

      // Close modal and reset form
      onClose()
    } catch (error) {
      console.error("Error adding manufacturer:", error)
      alert("Failed to add manufacturer. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Manufacturer</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-2">
            <div className="space-y-2">
              <Label htmlFor="manufacturerName">Manufacturer Name *</Label>
              <Input
                id="manufacturerName"
                value={manufacturerName}
                onChange={(e) => setManufacturerName(e.target.value)}
                placeholder="Enter manufacturer name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Enter country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentCompany">Parent Company</Label>
              <Input
                id="parentCompany"
                value={parentCompany}
                onChange={(e) => setParentCompany(e.target.value)}
                placeholder="Enter parent company"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentGroup">Parent Group</Label>
              <Input
                id="parentGroup"
                value={parentGroup}
                onChange={(e) => setParentGroup(e.target.value)}
                placeholder="Enter parent group"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !manufacturerName}>
            {isSubmitting ? "Adding..." : "Add Manufacturer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
