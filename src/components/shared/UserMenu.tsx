"use client"

import { useSession, signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, LogOut, ChevronDown } from 'lucide-react'

export const UserMenu = () => {
  const { data: session } = useSession()
  const router = useRouter()

  const getUserInitial = () => {
    if (session?.user?.name) {
      return session.user.name.charAt(0).toUpperCase()
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const handleLogout = () => {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in")
        }
      }
    })
  }

  if (!session) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 cursor-pointer outline-none" aria-label="User menu">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
            {session.user.image ? (
              <Image src={session.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              getUserInitial()
            )}
          </div>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium truncate max-w-[120px]">
              {session.user.name || session.user.email}
            </span>
            {session.user.name && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                {session.user.email}
              </span>
            )}
          </div>
          <ChevronDown size={16} className="hidden md:block text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">
          {session.user.name || session.user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
