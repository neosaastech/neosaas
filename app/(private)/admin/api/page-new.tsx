"use client"

/**
 * Admin API Management Page - NEW HIERARCHICAL VERSION
 * 
 * This is the refactored version using the new Brand → Services → APIs hierarchy.
 * 
 * To use this version:
 * 1. Rename current page.tsx to page-old.tsx (backup)
 * 2. Rename this file (page-new.tsx) to page.tsx
 * 3. Test the new interface
 * 4. Implement the API routes if not already done
 * 
 * Features:
 * - ✅ Hierarchical Brand/Service selector (full width)
 * - ✅ Logos properly displayed
 * - ✅ Services organized by brand and category
 * - ✅ Advanced filtering and sorting
 * - ✅ Dynamic form fields based on API definition
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Plus, Key } from "lucide-react"

// Import new hierarchical components
import { BrandServiceSelector } from "@/components/admin/brand-service-selector"
import { ServiceApiTable, ServiceApiConfigRow } from "@/components/admin/service-api-table"
import { ServiceConfigSheet } from "@/components/admin/service-config-sheet"

export default function AdminApiPage() {
  const { toast } = useToast()

  // State
  const [configs, setConfigs] = useState<ServiceApiConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create')
  const [editingConfig, setEditingConfig] = useState<ServiceApiConfigRow | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  // Load all configurations on mount
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/admin/services/configs')
      // const data = await response.json()
      
      // For now, use mock data
      const mockData: ServiceApiConfigRow[] = [
        {
          id: '1',
          brandId: 'github',
          brandName: 'GitHub',
          brandSlug: 'github',
          apiId: 'github-oauth',
          apiName: 'OAuth Authentication',
          apiType: 'oauth',
          environment: 'production',
          isActive: true,
          isDefault: true,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'success',
          lastTestMessage: 'Connection successful',
        },
        {
          id: '2',
          brandId: 'google',
          brandName: 'Google',
          brandSlug: 'google',
          apiId: 'google-oauth',
          apiName: 'OAuth 2.0 Authentication',
          apiType: 'oauth',
          environment: 'production',
          isActive: true,
          isDefault: true,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'success',
        },
        {
          id: '3',
          brandId: 'stripe',
          brandName: 'Stripe',
          brandSlug: 'stripe',
          apiId: 'stripe-payments',
          apiName: 'Payment Processing',
          apiType: 'rest',
          environment: 'production',
          isActive: true,
          isDefault: true,
        },
      ]

      setConfigs(mockData)
    } catch (error) {
      console.error("Error loading configurations:", error)
      toast({
        title: "❌ Error",
        description: "Failed to load API configurations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setEditingConfig(null)
    setSheetMode('create')
    setSheetOpen(true)
  }

  const handleEdit = (config: ServiceApiConfigRow) => {
    setEditingConfig(config)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  const handleTest = async (config: ServiceApiConfigRow) => {
    setTestingId(config.id)

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/admin/services/${config.brandSlug}/${config.apiId}/test`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ configId: config.id })
      // })
      // const data = await response.json()

      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast({
        title: "✅ Test Successful",
        description: `${config.brandName} ${config.apiName} is working correctly`,
      })

      // Update the config's last test info
      setConfigs(prev => prev.map(c => 
        c.id === config.id 
          ? { ...c, lastTestedAt: new Date().toISOString(), lastTestStatus: 'success' as const }
          : c
      ))
    } catch (error) {
      toast({
        title: "❌ Test Failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (config: ServiceApiConfigRow) => {
    if (!confirm(`Are you sure you want to delete ${config.brandName} ${config.apiName} configuration?`)) {
      return
    }

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/admin/services/configs/${config.id}`, { method: 'DELETE' })

      toast({
        title: "✅ Deleted",
        description: `${config.brandName} ${config.apiName} configuration has been deleted`,
      })

      // Remove from local state
      setConfigs(prev => prev.filter(c => c.id !== config.id))
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      })
    }
  }

  const handleSave = async (configData: any) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/admin/services/configs', {
      //   method: configData.id ? 'PUT' : 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(configData)
      // })
      // const data = await response.json()

      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (sheetMode === 'create') {
        // Add new config to list
        const newConfig: ServiceApiConfigRow = {
          id: Math.random().toString(36).substr(2, 9),
          brandId: configData.brandId,
          brandName: 'New Brand', // TODO: Get from SERVICE_BRANDS
          brandSlug: configData.brandSlug || 'new-brand',
          apiId: configData.apiId,
          apiName: 'New API', // TODO: Get from SERVICE_BRANDS
          apiType: 'rest',
          environment: configData.environment,
          isActive: true,
          isDefault: false,
        }
        setConfigs(prev => [...prev, newConfig])
      } else {
        // Update existing config
        setConfigs(prev => prev.map(c => 
          c.id === configData.id 
            ? { ...c, environment: configData.environment }
            : c
        ))
      }

      toast({
        title: "✅ Saved",
        description: `Configuration has been ${sheetMode === 'create' ? 'created' : 'updated'} successfully`,
      })

      setSheetOpen(false)
    } catch (error) {
      throw error // Let ServiceConfigSheet handle the error
    }
  }

  const handleTestInSheet = async (configData: any) => {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/admin/services/${configData.brandSlug}/${configData.apiId}/test`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ config: configData.config })
    // })
    // return await response.json()

    // Mock test for now
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Randomly succeed or fail for demo
    const success = Math.random() > 0.3
    
    return {
      success,
      message: success 
        ? 'Connection successful! Credentials are valid.'
        : 'Connection failed. Please check your credentials.'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">API Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure and manage your external service integrations
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-brand hover:bg-[#B8691C]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add API
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Key className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">New Hierarchical API System</h3>
              <p className="text-sm text-blue-800 mt-1">
                Services are now organized by <strong>Brand → API Type</strong>. 
                For example, GitHub has both "OAuth Authentication" and "REST API" as separate services.
                This makes it easier to manage multiple APIs from the same provider.
              </p>
              <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
                <li>All logos are properly displayed</li>
                <li>Services grouped by category (Authentication, Payment, Email, etc.)</li>
                <li>Full-width selector for better UX</li>
                <li>Advanced filtering and search</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Configurations Table */}
      <ServiceApiTable
        configs={configs}
        loading={loading}
        onTest={handleTest}
        onEdit={handleEdit}
        onDelete={handleDelete}
        testingId={testingId}
      />

      {/* Configuration Sheet */}
      <ServiceConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        configId={editingConfig?.id}
        initialBrandId={editingConfig?.brandId}
        initialApiId={editingConfig?.apiId}
        initialEnvironment={editingConfig?.environment}
        onSave={handleSave}
        onTest={handleTestInSheet}
      />
    </div>
  )
}
