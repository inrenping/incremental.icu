
import { notFound } from "next/navigation"

export default async function dashPage(props: {
  params: Promise<{ slug: string[] }>
}) {
  const params = await props.params
  const page = (params.slug)

  if (!page) {
    notFound()
  }
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

    </div>
  )
}

