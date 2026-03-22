import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface MobileDetailHeaderProps {
  backHref: string;
  title: string;
}

export const MobileDetailHeader = ({ backHref, title }: MobileDetailHeaderProps) => {
  return (
    <div className="relative flex items-center justify-center py-3 mb-4 md:hidden">
      <Link
        href={backHref}
        className="absolute left-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} />
      </Link>
      <span className="font-semibold text-base">{title}</span>
    </div>
  )
}
