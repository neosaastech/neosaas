'use client'

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { checkTosAcceptance, acceptTos } from "@/app/actions/legal"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function TosModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [tosContent, setTosContent] = useState<{ id: string, version: string, content: string } | null>(null)
  const [position, setPosition] = useState<"center" | "bottom-left" | "bottom-right">("center")
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function check() {
      try {
        const result = await checkTosAcceptance()
        if (result.success && !result.accepted && result.tos) {
          setTosContent(result.tos as any)
          setPosition(result.position as any || "center")
          setIsOpen(true)
        }
      } catch (error) {
        console.error("Failed to check ToS", error)
      } finally {
        setIsChecking(false)
      }
    }

    check()
  }, [])

  async function handleAccept() {
    if (!tosContent) return

    setIsLoading(true)
    try {
      const result = await acceptTos(tosContent.id)
      if (result.success) {
        setIsOpen(false)
        toast({
          title: "Terms Accepted",
          description: "Thank you for accepting the Terms of Service.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isChecking || !tosContent || !isOpen) return null

  if (position === "center") {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && isOpen) return 
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Terms of Service Update</DialogTitle>
            <DialogDescription>
              Please review and accept the latest Terms of Service (v{tosContent.version}) to continue using the platform.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-4 border rounded-md mt-4 bg-muted/50">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: tosContent.content }} />
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6">
            <Button onClick={handleAccept} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              I Accept the Terms of Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className={cn(
      "fixed z-50 w-full sm:w-[400px] p-4",
      position === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4"
    )}>
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Terms Update</CardTitle>
          <CardDescription>
            Please accept the new Terms of Service (v{tosContent.version}).
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[300px] overflow-y-auto text-sm text-muted-foreground">
           <div className="prose prose-sm dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: tosContent.content }} />
            </div>
        </CardContent>
        <CardFooter className="pt-4">
          <Button onClick={handleAccept} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            I Accept
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
