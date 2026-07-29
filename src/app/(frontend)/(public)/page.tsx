import { HomePageLoader } from '@/application/pages/home/page-loader'
import { HomePage } from '@/components/features/home/HomePage'
import { getLocaleContext } from '@/lib/get-locale-context'

export default async function Page() {
  const ctx = await getLocaleContext()
  console.log(`[Home Page Route] resolved context with currency = "${ctx.currency}", requestContextId = "${ctx.requestContextId || ''}"`)

  const homeData = await HomePageLoader.load(ctx)

  return <HomePage data={homeData} />
}

