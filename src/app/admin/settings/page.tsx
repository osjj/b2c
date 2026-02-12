import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your store settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Store Information</CardTitle>
              <CardDescription>Basic information about your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input id="storeName" defaultValue="Maison" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeUrl">Store URL</Label>
                  <Input id="storeUrl" defaultValue="maison.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeDescription">Store Description</Label>
                <Input
                  id="storeDescription"
                  defaultValue="Curated goods for modern living"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    defaultValue="info@laifappe.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input id="supportPhone" defaultValue="+1 (555) 123-4567" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Currency & Language */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Regional Settings</CardTitle>
              <CardDescription>Configure currency and language preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" defaultValue="USD ($)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" defaultValue="America/New_York" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          {/* Global SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Global SEO Settings</CardTitle>
              <CardDescription>
                Default settings for all pages. Individual pages can override these.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultTitle">Default Page Title</Label>
                <Input
                  id="defaultTitle"
                  defaultValue="PPE Pro | Professional Safety Equipment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleTemplate">Title Template</Label>
                <Input id="titleTemplate" defaultValue="%s | PPE Pro" />
                <p className="text-sm text-muted-foreground">
                  %s will be replaced with the page title
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultDescription">Default Meta Description</Label>
                <Textarea
                  id="defaultDescription"
                  rows={3}
                  defaultValue="Leading manufacturer of personal protective equipment. Safety gloves, shoes, workwear, and more."
                />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Search Engine Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Search Engine Verification</CardTitle>
              <CardDescription>
                Add verification codes for search engine webmaster tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleVerification">Google Search Console</Label>
                <Input
                  id="googleVerification"
                  placeholder="google-site-verification=xxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bingVerification">Bing Webmaster Tools</Label>
                <Input id="bingVerification" placeholder="msvalidate.01=xxxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yandexVerification">Yandex Webmaster</Label>
                <Input id="yandexVerification" placeholder="yandex-verification=xxxxx" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Social Media Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Social Media Defaults</CardTitle>
              <CardDescription>
                Default settings for social media sharing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultOgImage">Default OG Image URL</Label>
                <Input
                  id="defaultOgImage"
                  placeholder="https://example.com/og-image.jpg"
                />
                <p className="text-sm text-muted-foreground">
                  Recommended: 1200x630px
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterHandle">Twitter Handle</Label>
                <Input id="twitterHandle" placeholder="@yourhandle" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookAppId">Facebook App ID</Label>
                <Input id="facebookAppId" placeholder="Optional" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Robots.txt Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Robots.txt Preview</CardTitle>
              <CardDescription>
                Current robots.txt configuration (managed via code)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="robotsRules"
                rows={10}
                className="font-mono text-sm"
                readOnly
                defaultValue={`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /account/
Disallow: /cart/
Disallow: /orders/

Sitemap: https://your-domain.com/sitemap.xml`}
              />
              <p className="text-sm text-muted-foreground">
                To modify robots.txt, edit <code className="bg-muted px-1 py-0.5 rounded">src/app/robots.ts</code>
              </p>
            </CardContent>
          </Card>

          {/* Sitemap Info */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Sitemap</CardTitle>
              <CardDescription>
                Your sitemap is automatically generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  Sitemap URL: <code className="bg-background px-1 py-0.5 rounded">/sitemap.xml</code>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  The sitemap is automatically generated and includes all active products, categories, and collections.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
                    View Sitemap
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                    Google Search Console
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Payment Methods</CardTitle>
              <CardDescription>Configure how you accept payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 bg-muted rounded flex items-center justify-center text-xs font-medium">
                    Bank
                  </div>
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-muted-foreground">
                      Manual bank transfer payments
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 bg-muted rounded flex items-center justify-center text-xs font-medium">
                    Stripe
                  </div>
                  <div>
                    <p className="font-medium">Stripe</p>
                    <p className="text-sm text-muted-foreground">
                      Credit card payments via Stripe
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Shipping Zones</CardTitle>
              <CardDescription>Configure shipping rates by region</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Domestic (US)</p>
                  <p className="text-sm text-muted-foreground">
                    Free shipping over $150, otherwise $15
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">International</p>
                  <p className="text-sm text-muted-foreground">
                    Flat rate $35
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
              <Button variant="outline" className="w-full">
                Add Shipping Zone
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Email Notifications</CardTitle>
              <CardDescription>Choose when to receive email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Orders</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive a new order
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when product stock is low
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Customer Reviews</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when customers leave reviews
                  </p>
                </div>
                <input type="checkbox" className="rounded" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
