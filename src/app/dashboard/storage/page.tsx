import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  Download,
  File,
  FileImage,
  FileText,
  FileVideo,
  FilePlus,
  Filter,
  FolderPlus,
  HardDrive,
  MoreHorizontal,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Upload,
} from "lucide-react"

const files = [
  {
    id: "1",
    name: "annual-report-2023.pdf",
    type: "application/pdf",
    size: "4.2 MB",
    modified: "2023-04-15 14:32",
    path: "/documents/reports/",
  },
  {
    id: "2",
    name: "team-photo.jpg",
    type: "image/jpeg",
    size: "2.1 MB",
    modified: "2023-04-20 09:15",
    path: "/images/",
  },
  {
    id: "3",
    name: "product-demo.mp4",
    type: "video/mp4",
    size: "28.6 MB",
    modified: "2023-04-10 16:48",
    path: "/videos/",
  },
  {
    id: "4",
    name: "user-data.csv",
    type: "text/csv",
    size: "1.8 MB",
    modified: "2023-04-22 11:37",
    path: "/data/exports/",
  },
  {
    id: "5",
    name: "presentation.pptx",
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size: "6.4 MB",
    modified: "2023-04-08 10:21",
    path: "/documents/presentations/",
  },
]

const buckets = [
  {
    name: "opensaas-assets",
    region: "us-east-1",
    fileCount: 235,
    size: "12.5 GB",
    access: "Public",
  },
  {
    name: "opensaas-uploads",
    region: "eu-west-1",
    fileCount: 1240,
    size: "58.2 GB",
    access: "Private",
  },
  {
    name: "opensaas-backups",
    region: "us-west-2",
    fileCount: 52,
    size: "215.8 GB",
    access: "Private",
  },
]

export default function StoragePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage</h1>
          <p className="text-muted-foreground">Manage your files and storage buckets.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">286.5 GB</div>
            <p className="text-xs text-muted-foreground">Out of 500 GB</p>
            <Progress value={57} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,527</div>
            <p className="text-xs text-muted-foreground">Across all buckets</p>
            <Progress value={65} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buckets</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Active storage buckets</p>
            <Progress value={30} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85</div>
            <p className="text-xs text-muted-foreground">File operations in last 24h</p>
            <Progress value={42} className="mt-3 h-1" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="buckets">Buckets</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card>
            <CardHeader className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Search files..." className="pl-8" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select bucket" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buckets</SelectItem>
                      <SelectItem value="opensaas-assets">opensaas-assets</SelectItem>
                      <SelectItem value="opensaas-uploads">opensaas-uploads</SelectItem>
                      <SelectItem value="opensaas-backups">opensaas-backups</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filter</span>
                  </Button>
                  <Button variant="outline">
                    <FolderPlus className="mr-2 h-4 w-4" />
                    New Folder
                  </Button>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {file.type.startsWith("image/") && <FileImage className="h-4 w-4 text-blue-500" />}
                          {file.type.startsWith("video/") && <FileVideo className="h-4 w-4 text-purple-500" />}
                          {file.type.startsWith("text/") ||
                            (file.type.startsWith("application/") && <FileText className="h-4 w-4 text-green-500" />)}
                          {!file.type.startsWith("image/") &&
                            !file.type.startsWith("video/") &&
                            !file.type.startsWith("text/") &&
                            !file.type.startsWith("application/") && <File className="h-4 w-4 text-gray-500" />}
                          <span className="font-medium">{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{file.path}</TableCell>
                      <TableCell>{file.size}</TableCell>
                      <TableCell>{file.modified}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="mr-2 h-4 w-4" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buckets">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Storage Buckets</CardTitle>
                  <CardDescription>Manage your AWS S3 storage buckets</CardDescription>
                </div>
                <Button>
                  <FilePlus className="mr-2 h-4 w-4" />
                  New Bucket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {buckets.map((bucket) => (
                  <Card key={bucket.name}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{bucket.name}</CardTitle>
                      <CardDescription>Region: {bucket.region}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Files</p>
                          <p className="font-medium">{bucket.fileCount}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Size</p>
                          <p className="font-medium">{bucket.size}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Access</p>
                          <p className="font-medium">{bucket.access}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          Manage
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Storage Settings</CardTitle>
              <CardDescription>Configure your storage preferences and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">AWS S3 Configuration</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm">AWS Access Key ID</label>
                    <Input type="password" value="••••••••••••••••••" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">AWS Secret Access Key</label>
                    <Input type="password" value="••••••••••••••••••••••••••••••" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Default Region</label>
                    <Select defaultValue="us-east-1">
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                        <SelectItem value="eu-central-1">EU (Frankfurt)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Default Bucket</label>
                    <Select defaultValue="opensaas-assets">
                      <SelectTrigger>
                        <SelectValue placeholder="Select bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opensaas-assets">opensaas-assets</SelectItem>
                        <SelectItem value="opensaas-uploads">opensaas-uploads</SelectItem>
                        <SelectItem value="opensaas-backups">opensaas-backups</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Storage Limits</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm">Max File Size</label>
                    <Select defaultValue="100">
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 MB</SelectItem>
                        <SelectItem value="50">50 MB</SelectItem>
                        <SelectItem value="100">100 MB</SelectItem>
                        <SelectItem value="250">250 MB</SelectItem>
                        <SelectItem value="500">500 MB</SelectItem>
                        <SelectItem value="1000">1 GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Allowed File Types</label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="Select types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Files</SelectItem>
                        <SelectItem value="images">Images Only</SelectItem>
                        <SelectItem value="documents">Documents Only</SelectItem>
                        <SelectItem value="media">Media Files</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
