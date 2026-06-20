import type { ReactNode } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export const demos: Record<string, ReactNode> = {
  button: (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
  badge: (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
  alert: (
    <Alert className="max-w-md">
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>This is a real shadcn alert.</AlertDescription>
    </Alert>
  ),
  card: (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Enter your email to get started.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </CardContent>
      <CardFooter className="gap-3">
        <Button variant="outline">Cancel</Button>
        <Button>Sign up</Button>
      </CardFooter>
    </Card>
  ),
  input: (
    <div className="w-72 space-y-2">
      <Label htmlFor="i">Email</Label>
      <Input id="i" type="email" placeholder="you@example.com" />
    </div>
  ),
  textarea: <Textarea placeholder="Type here…" className="w-72" />,
  accordion: (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="a">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It adheres to the WAI-ARIA pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>Yes, it expands and collapses.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  tabs: (
    <Tabs defaultValue="account" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings here.</TabsContent>
      <TabsContent value="password">Change your password here.</TabsContent>
    </Tabs>
  ),
  dialog: (
    <Dialog>
      <DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This action can be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter><Button>Confirm</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  'dropdown-menu': (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline">Open menu</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  popover: (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline">Open popover</Button></PopoverTrigger>
      <PopoverContent>Popover content here.</PopoverContent>
    </Popover>
  ),
  tooltip: (
    <Tooltip>
      <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
      <TooltipContent>Tooltip text</TooltipContent>
    </Tooltip>
  ),
  switch: <div className="flex items-center gap-2"><Switch id="s" /><Label htmlFor="s">Notifications</Label></div>,
  checkbox: <div className="flex items-center gap-2"><Checkbox id="c" /><Label htmlFor="c">Accept terms</Label></div>,
  toggle: <Toggle>Bold</Toggle>,
  progress: <Progress value={60} className="w-72" />,
  avatar: <Avatar><AvatarFallback>SN</AvatarFallback></Avatar>,
  separator: (
    <div className="w-72">
      <p className="text-sm">Above</p>
      <Separator className="my-3" />
      <p className="text-sm">Below</p>
    </div>
  ),
  skeleton: <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></div>,
  breadcrumb: (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>Catalog</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
  table: (
    <Table className="w-80">
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell>Ada</TableCell><TableCell>Admin</TableCell></TableRow>
        <TableRow><TableCell>Linus</TableCell><TableCell>User</TableCell></TableRow>
      </TableBody>
    </Table>
  ),
}

export const demoNames = Object.keys(demos)

export default function App() {
  const name = new URLSearchParams(window.location.search).get('c')

  if (name && demos[name]) {
    return (
      <TooltipProvider>
        <div className="bg-background text-foreground flex min-h-screen items-center justify-center p-10">
          {demos[name]}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground min-h-screen p-10">
        <h1 className="mb-6 text-xl font-semibold">shadcn/ui reference — append ?c=&lt;name&gt;</h1>
        <ul className="grid grid-cols-3 gap-2 text-sm">
          {demoNames.map((n) => (
            <li key={n}><a className="text-primary underline" href={`?c=${n}`}>{n}</a></li>
          ))}
        </ul>
      </div>
    </TooltipProvider>
  )
}
