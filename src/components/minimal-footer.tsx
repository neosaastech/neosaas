export function MinimalFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex justify-center py-4">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} NeoSaaS. All rights reserved.</p>
      </div>
    </footer>
  )
}
