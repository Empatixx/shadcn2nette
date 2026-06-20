import { useState } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  )
}

export default function App() {
  const [progress] = useState(60)
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">shadcn/ui — reference (React)</h1>
              <p className="text-sm text-muted-foreground">The real, interactive components for side-by-side comparison.</p>
            </div>
            <Button variant="outline" onClick={() => document.documentElement.classList.toggle('dark')}>Toggle theme</Button>
          </header>

          <Section title="Buttons">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </Section>

          <Section title="Badges">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </Section>

          <Section title="Alert">
            <Alert className="max-w-md">
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>This is a real shadcn alert.</AlertDescription>
            </Alert>
          </Section>

          <Section title="Card">
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
          </Section>

          <Section title="Accordion (interactive)">
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
          </Section>

          <Section title="Tabs (interactive)">
            <Tabs defaultValue="account" className="w-96">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>
              <TabsContent value="account">Account settings here.</TabsContent>
              <TabsContent value="password">Change your password here.</TabsContent>
            </Tabs>
          </Section>

          <Section title="Overlays (interactive)">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline">Menu</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild><Button variant="outline">Popover</Button></PopoverTrigger>
              <PopoverContent>Popover content.</PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
              <TooltipContent>Tooltip text</TooltipContent>
            </Tooltip>
          </Section>

          <Section title="Form controls (interactive)">
            <Select>
              <SelectTrigger className="w-44"><SelectValue placeholder="Pick a fruit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2"><Checkbox id="c" /><Label htmlFor="c">Accept</Label></div>
            <div className="flex items-center gap-2"><Switch id="s" /><Label htmlFor="s">Notifications</Label></div>
            <RadioGroup defaultValue="one" className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="one" id="r1" /><Label htmlFor="r1">One</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="two" id="r2" /><Label htmlFor="r2">Two</Label></div>
            </RadioGroup>
            <Slider defaultValue={[50]} max={100} step={1} className="w-48" />
            <Toggle>Toggle</Toggle>
            <Progress value={progress} className="w-48" />
            <Textarea placeholder="Type here…" className="w-64" />
          </Section>

          <Section title="Data & misc">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Catalog</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Avatar><AvatarFallback>SN</AvatarFallback></Avatar>
            <Separator className="h-8" orientation="vertical" />
            <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-28" /></div>
            <Table className="w-80">
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>Ada</TableCell><TableCell>Admin</TableCell></TableRow>
                <TableRow><TableCell>Linus</TableCell><TableCell>User</TableCell></TableRow>
              </TableBody>
            </Table>
          </Section>
        </div>
      </div>
    </TooltipProvider>
  )
}
