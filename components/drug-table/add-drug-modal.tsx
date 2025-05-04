"use client"

import { useState } from "react"
import api from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AddDrugModalProps {
  opened: boolean
  onClose: () => void
  onAddSuccess: (newDrug: any) => void
  atcOptions: { value: string; label: string }[]
  dosageNumerator1UnitOptions: string[]
  dosageDenominator1UnitOptions: string[]
  formOptions: string[]
  routeOptions: string[]
}

export function AddDrugModal({
  opened,
  onClose,
  onAddSuccess,
  atcOptions,
  dosageNumerator1UnitOptions,
  dosageDenominator1UnitOptions,
  formOptions,
  routeOptions,
}: AddDrugModalProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Basic drug information
  const [drugName, setDrugName] = useState("")
  const [drugNameAR, setDrugNameAR] = useState("")
  const [atcCode, setAtcCode] = useState("")
  const [atcRelatedIngredient, setAtcRelatedIngredient] = useState("")
  const [otherIngredients, setOtherIngredients] = useState("")
  const [isOTC, setIsOTC] = useState(false)
  const [mophCode, setMophCode] = useState("")

  // Dosage information
  const [dosageNumerator1, setDosageNumerator1] = useState("")
  const [dosageNumerator1Unit, setDosageNumerator1Unit] = useState("")
  const [dosageDenominator1, setDosageDenominator1] = useState("")
  const [dosageDenominator1Unit, setDosageDenominator1Unit] = useState("")

  // Form and route information
  const [form, setForm] = useState("")
  const [route, setRoute] = useState("")

  // Presentation information
  const [presentationUnitQuantity1, setPresentationUnitQuantity1] = useState("")
  const [presentationUnitType1, setPresentationUnitType1] = useState("")
  const [presentationPackageQuantity1, setPresentationPackageQuantity1] = useState("")
  const [presentationPackageType1, setPresentationPackageType1] = useState("")

  // Additional information
  const [manufacturer, setManufacturer] = useState("")
  const [country, setCountry] = useState("")
  const [price, setPrice] = useState("")
  const [amount, setAmount] = useState("")

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Prepare drug data
      const drugData = {
        DrugName: drugName,
        DrugNameAR: drugNameAR,
        ATC_Code: atcCode,
        ATCRelatedIngredient: atcRelatedIngredient,
        OtherIngredients: otherIngredients,
        isOTC,
        MoPHCode: mophCode,
        Form: form,
        Route: route,
        Manufacturer: manufacturer,
        Country: country,
        Price: price ? Number.parseFloat(price) : 0,
        Amount: amount ? Number.parseInt(amount) : 0,
      }

      // Prepare dosage data
      const dosageData = {
        Numerator1: dosageNumerator1 ? Number.parseInt(dosageNumerator1) : 0,
        Numerator1Unit: dosageNumerator1Unit,
        Denominator1: dosageDenominator1 ? Number.parseInt(dosageDenominator1) : 0,
        Denominator1Unit: dosageDenominator1Unit,
      }

      // Prepare presentation data
      const presentationData = {
        UnitQuantity1: presentationUnitQuantity1 ? Number.parseFloat(presentationUnitQuantity1) : 0,
        UnitType1: presentationUnitType1,
        PackageQuantity1: presentationPackageQuantity1 ? Number.parseFloat(presentationPackageQuantity1) : 0,
        PackageType1: presentationPackageType1,
      }

      // Make API call to add drug
      const response = await api.post("/drugs/add", {
        drug: drugData,
        dosage: dosageData,
        presentation: presentationData,
      })

      // Call success callback with the new drug
      onAddSuccess(response.data)

      // Close modal and reset form
      onClose()
    } catch (error) {
      console.error("Error adding drug:", error)
      alert("Failed to add drug. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Drug</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="dosage">Dosage</TabsTrigger>
            <TabsTrigger value="form">Form & Route</TabsTrigger>
            <TabsTrigger value="presentation">Presentation</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh]">
            <TabsContent value="basic" className="space-y-4 p-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drugName">Drug Name</Label>
                  <Input
                    id="drugName"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="Enter drug name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drugNameAR">Drug Name (Arabic)</Label>
                  <Input
                    id="drugNameAR"
                    value={drugNameAR}
                    onChange={(e) => setDrugNameAR(e.target.value)}
                    placeholder="Enter drug name in Arabic"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="atcCode">ATC Code</Label>
                  <Select value={atcCode} onValueChange={setAtcCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ATC code" />
                    </SelectTrigger>
                    <SelectContent>
                      {atcOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mophCode">MoPH Code</Label>
                  <Input
                    id="mophCode"
                    value={mophCode}
                    onChange={(e) => setMophCode(e.target.value)}
                    placeholder="Enter MoPH code"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="atcRelatedIngredient">ATC Related Ingredient</Label>
                  <Input
                    id="atcRelatedIngredient"
                    value={atcRelatedIngredient}
                    onChange={(e) => setAtcRelatedIngredient(e.target.value)}
                    placeholder="Enter ATC related ingredient"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="otherIngredients">Other Ingredients</Label>
                  <Textarea
                    id="otherIngredients"
                    value={otherIngredients}
                    onChange={(e) => setOtherIngredients(e.target.value)}
                    placeholder="Enter other ingredients"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="isOTC" checked={isOTC} onCheckedChange={(checked) => setIsOTC(checked === true)} />
                  <Label htmlFor="isOTC">Is OTC (Over The Counter)</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dosage" className="space-y-4 p-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosageNumerator1">Numerator 1</Label>
                  <Input
                    id="dosageNumerator1"
                    type="number"
                    value={dosageNumerator1}
                    onChange={(e) => setDosageNumerator1(e.target.value)}
                    placeholder="Enter numerator 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosageNumerator1Unit">Numerator 1 Unit</Label>
                  <Select value={dosageNumerator1Unit} onValueChange={setDosageNumerator1Unit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {dosageNumerator1UnitOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosageDenominator1">Denominator 1</Label>
                  <Input
                    id="dosageDenominator1"
                    type="number"
                    value={dosageDenominator1}
                    onChange={(e) => setDosageDenominator1(e.target.value)}
                    placeholder="Enter denominator 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosageDenominator1Unit">Denominator 1 Unit</Label>
                  <Select value={dosageDenominator1Unit} onValueChange={setDosageDenominator1Unit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {dosageDenominator1UnitOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="form" className="space-y-4 p-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form">Form</Label>
                  <Select value={form} onValueChange={setForm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="route">Route</Label>
                  <Select value={route} onValueChange={setRoute}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="presentation" className="space-y-4 p-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="presentationUnitQuantity1">Unit Quantity 1</Label>
                  <Input
                    id="presentationUnitQuantity1"
                    type="number"
                    value={presentationUnitQuantity1}
                    onChange={(e) => setPresentationUnitQuantity1(e.target.value)}
                    placeholder="Enter unit quantity 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presentationUnitType1">Unit Type 1</Label>
                  <Input
                    id="presentationUnitType1"
                    value={presentationUnitType1}
                    onChange={(e) => setPresentationUnitType1(e.target.value)}
                    placeholder="Enter unit type 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presentationPackageQuantity1">Package Quantity 1</Label>
                  <Input
                    id="presentationPackageQuantity1"
                    type="number"
                    value={presentationPackageQuantity1}
                    onChange={(e) => setPresentationPackageQuantity1(e.target.value)}
                    placeholder="Enter package quantity 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presentationPackageType1">Package Type 1</Label>
                  <Input
                    id="presentationPackageType1"
                    value={presentationPackageType1}
                    onChange={(e) => setPresentationPackageType1(e.target.value)}
                    placeholder="Enter package type 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="Enter manufacturer"
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
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter price"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !drugName}>
            {isSubmitting ? "Adding..." : "Add Drug"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
