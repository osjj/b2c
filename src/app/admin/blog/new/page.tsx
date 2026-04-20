import { BlogForm } from '@/components/admin/blog-form'

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Blog Post</h1>
      <BlogForm />
    </div>
  )
}
