import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

export default function ActivitiesButton() {
  const searchParams = useSearchParams()
  const track = searchParams?.get('track') || null
  
  const href = track 
    ? `/activities?track=${encodeURIComponent(track)}`
    : '/activities'

  return (
    <Link href={href} passHref>
      <Button className="w-full mt-8 py-8 text-2xl">
        <BookOpen className="w-8 h-8 mr-2" />
        Activities
      </Button>
    </Link>
  )
}