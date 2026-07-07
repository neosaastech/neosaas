"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  AlertCircle
} from "lucide-react"
import { BrandServiceSelector } from "./brand-service-selector"
import { 
  ServiceBrandDefinition, 
  ServiceApiDefinition,
} from "@/lib/data/service-brands"

export interface ServiceConfigSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  configId?: string
  initialBrandId?: string
  initialApiId?: string
  initialEnvironment?: string
  onSave?: (config: any) => Promise<void>
  onTest?: (config: any) => Promise<{ success: boolean; message: string }>
}

/**
 * Service Config Sheet - Dynamic form for configuring APIs
 * 
 * Features:
 * - Brand/Service selection via BrandServiceSelector
 * - Dynamic form fields based on selected API definition
 * - Field validation
 * - Test functionality
 * - Environment selection
 * - Secure password fields
 */
export function ServiceConfigSheet({
  open,
  onOpenChange,
  mode,
  configId,
  initialBrandId,
  initialApiId,
  initialEnvironment = 'production',
  onSave,
  onTest,
}: ServiceConfigSheetProps) {
  const { toast } = useToast()

  // Selection state
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(initialBrandId)
  const [selectedApiId, setSelectedApiId] = useState<string | undefined>(initialApiId)
  const [selectedBrand, setSelectedBrand] = useState<ServiceBrandDefinition | undefined>()
  const [selectedApi, setSelectedApi] = useState<ServiceApiDefinition | undefined>()

  // Config state
  const [environment, setEnvironment] = useState(initialEnvironment)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  // Action state
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setSelectedBrandId(initialBrandId)
      setSelectedApiId(initialApiId)
      setEnvironment(initialEnvironment)
      setFormValues({})
      setTestResult(null)
      setShowPasswords({})
    }
  }, [open, initialBrandId, initialApiId, initialEnvironment])

  // Handle brand/API selection
  const handleApiChange = (apiId: string, brand: ServiceBrandDefinition, api: ServiceApiDefinition) => {
    setSelectedBrandId(brand.id)
    setSelectedApiId(apiId)
    setSelectedBrand(brand)
    setSelectedApi(api)
    
    // Initialize form values with empty strings
    const initialValues: Record<string, string> = {}
    api.requiredFields.forEach(field => {
      initialValues[field.name] = ''
    })
    setFormValues(initialValues)
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  const validateForm = (): boolean => {
    if (!selectedApi) {
      toast({
        title: "❌ Validation Error",
        description: "Please select a service and API",
        variant: "destructive",
      })
      return false
    }

    // Check required fields
    for (const field of selectedApi.requiredFields) {
      if (field.required && !formValues[field.name]) {
        toast({
          title: "❌ Validation Error",
          description: `${field.label} is required`,
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const handleTest = async () => {
    if (!validateForm() || !onTest) return

    setTesting(true)
    setTestResult(null)

    try {
      const result = await onTest({
        brandId: selectedBrandId,
        apiId: selectedApiId,
        environment,
        config: formValues,
      })

      setTestResult(result)

      if (result.success) {
        toast({
          title: "✅ Test Successful",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Test Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test failed"
      setTestResult({ success: false, message })
      toast({
        title: "❌ Test Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!validateForm() || !onSave) return

    setSaving(true)

    try {
      await onSave({
        id: configId,
        brandId: selectedBrandId,
        apiId: selectedApiId,
        environment,
        config: formValues,
        isActive: true,
        isDefault: false,
      })

      toast({
        title: "✅ Configuration Saved",
        description: `${selectedBrand?.name} ${selectedApi?.name} has been ${mode === 'create' ? 'created' : 'updated'} successfully`,
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "❌ Save Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const renderFormField = (field: ServiceApiDefinition['requiredFields'][0]) => {
    const value = formValues[field.name] || ''
    const isPassword = field.type === 'password'
    const showPassword = showPasswords[field.name]

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select value={value} onValueChange={(v) => handleFieldChange(field.name, v)}>
            <SelectTrigger id={field.name}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      )
    }

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={field.name}
            type={isPassword && !showPassword ? 'password' : 'text'}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={isPassword ? 'pr-10' : ''}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => togglePasswordVisibility(field.name)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {field.helpText && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'Add New API Configuration' : 'Edit API Configuration'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create' 
              ? 'Configure a new external service integration' 
              : 'Update the API configuration below'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Brand & API Selection */}
          <BrandServiceSelector
            selectedBrandId={selectedBrandId}
            selectedApiId={selectedApiId}
            onBrandChange={setSelectedBrandId}
            onApiChange={handleApiChange}
            disabled={mode === 'edit'} // Can't change brand/API in edit mode
            showCategoryFilter={mode === 'create'}
          />

          {/* Environment Selection */}
          {selectedApi && (
            <div className="space-y-2">
              <Label htmlFor="environment">
                Environment *
              </Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dynamic Form Fields */}
          {selectedApi && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 pb-2 border-b">
                <h3 className="font-semibold text-sm">API Credentials</h3>
                {selectedApi.documentationUrl && (
                  <a
                    href={selectedApi.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Documentation <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {selectedApi.requiredFields.map(renderFormField)}
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? 'Test Successful' : 'Test Failed'}
                  </p>
                  <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          {selectedApi && selectedApi.testable && (
            <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> Test your credentials before saving to ensure they work correctly.
                </p>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || testing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          {selectedApi?.testable && onTest && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={saving || testing || !selectedApi}
              className="w-full sm:w-auto"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || testing || !selectedApi}
            className="bg-brand hover:bg-brand-hover w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Save Configuration' : 'Update Configuration'}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
