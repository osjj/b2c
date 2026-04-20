import { notFound } from 'next/navigation'
import { getAdminBlogPost } from '@/actions/admin/blog'
import { BlogForm } from '@/components/admin/blog-form'

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getAdminBlogPost(id)

  if (!post) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Blog Post</h1>
      <BlogForm
        post={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          content: post.content,
          isPublished: post.isPublished,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          seoKeywords: post.seoKeywords,
        }}
      />
    </div>
  )
}
